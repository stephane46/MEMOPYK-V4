import { Router } from "express";
import { PartnerIntakeSchema } from "../../shared/partnerSchema";
import { verifyCaptcha, verifyCsrf, rateLimit } from "../utils/security";
import { randomId } from "../zoho/zohoClient";
import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";
import { Resend } from "resend";
import { partnerStore } from "../stores/ExcelPartnerStore";

const router = Router();
const EXCEL_FILE = path.join(process.cwd(), "partner-submissions.xlsx");

// Initialize Resend client
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

router.post("/api/partners/intake", rateLimit(30), async (req, res) => {
  const reqId = randomId();
  
  try {
    if (!verifyCsrf(req)) {
      return res.status(400).json({ ok: false, error: "bad_csrf", reqId });
    }
    
    const parsed = PartnerIntakeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        ok: false, 
        error: "invalid_payload", 
        details: parsed.error.format(), 
        reqId 
      });
    }
    
    const data = parsed.data;
    
    if (!(await verifyCaptcha("stub"))) {
      return res.status(400).json({ ok: false, error: "captcha_failed", reqId });
    }

    // Save to Excel file
    await saveToExcel(data);
    
    // Send email notification
    try {
      await sendPartnerNotification(data);
      console.log(`✅ Email notification sent to ngoc@memopyk.com for partner: ${data.partner_name}`);
    } catch (emailError: any) {
      console.error(`⚠️ Email notification failed:`, emailError.message);
      // Don't fail the request if email fails
    }

    return res.json({ ok: true, saved: "excel", reqId });
  } catch (e: any) {
    console.error("INTAKE_ERR", reqId, e?.message || e);
    return res.status(500).json({ ok: false, error: "server_error", reqId });
  }
});

// Download Excel file
router.get("/api/partners/download", async (req, res) => {
  try {
    if (!fs.existsSync(EXCEL_FILE)) {
      return res.status(404).json({ error: "No partner submissions found" });
    }

    res.download(EXCEL_FILE, "partner-submissions.xlsx", (err) => {
      if (err) {
        console.error("Download error:", err);
        res.status(500).json({ error: "Failed to download file" });
      }
    });
  } catch (e: any) {
    console.error("Download error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// Export map data JSON (approved partners only)
router.post("/api/partners/export-map", async (req, res) => {
  try {
    const mapPartners = partnerStore.getMapData();

    // Save to public JSON file
    const publicDir = path.join(process.cwd(), "public");
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    const jsonPath = path.join(publicDir, "partners.json");
    fs.writeFileSync(jsonPath, JSON.stringify(mapPartners, null, 2));

    console.log(`✅ Map data exported via store: ${mapPartners.length} partners`);
    res.json({ 
      ok: true, 
      count: mapPartners.length, 
      file: "/partners.json",
      partners: mapPartners.slice(0, 5) // Preview first 5
    });
  } catch (e: any) {
    console.error("Export error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// Create new partner (manual entry)
router.post("/api/partners/create", async (req, res) => {
  try {
    const partnerData = req.body;
    
    // Create new partner row with current timestamp
    const newPartner = {
      timestamp: new Date().toISOString(),
      partner_type: partnerData.partner_type || 'digitization',
      partner_name: partnerData.partner_name || '',
      email: partnerData.email || '',
      email_public: partnerData.email_public || 'FALSE',
      phone: partnerData.phone || '',
      phone_public: partnerData.phone_public || 'FALSE',
      website: partnerData.website || '',
      address: partnerData.address || '',
      address_line2: partnerData.address_line2 || '',
      city: partnerData.city || '',
      postal_code: partnerData.postal_code || '',
      country: partnerData.country || '',
      photo_formats: partnerData.photo_formats || '',
      other_photo: partnerData.other_photo || '',
      film_formats: partnerData.film_formats || '',
      other_film: partnerData.other_film || '',
      video_cassettes: partnerData.video_cassettes || '',
      other_video: partnerData.other_video || '',
      delivery: partnerData.delivery || '',
      other_delivery: partnerData.other_delivery || '',
      public_description: partnerData.public_description || '',
      consent: 'TRUE',
      status: partnerData.status || 'Pending',
      is_active: partnerData.is_active ? 'TRUE' : 'FALSE',
      show_on_map: partnerData.show_on_map ? 'TRUE' : 'FALSE',
      lat: partnerData.lat || '',
      lng: partnerData.lng || '',
      slug: partnerData.slug || ''
    };

    const success = partnerStore.create(newPartner);
    
    if (!success) {
      return res.status(500).json({ error: "Failed to create partner" });
    }

    console.log(`✅ Partner created via store: ${newPartner.partner_name}`);
    return res.json({ ok: true, message: "Partner created successfully" });
  } catch (e: any) {
    console.error("Create error:", e);
    return res.status(500).json({ error: "Server error" });
  }
});

// Enhanced: Get all partners with pagination and filters
router.get("/api/partners", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const status = req.query.status as string;
    const partner_type = req.query.partner_type as string;
    const services = req.query.services ? (req.query.services as string).split(',') : undefined;

    const result = partnerStore.getAll(
      { search, status, partner_type, services },
      page,
      limit
    );

    res.json(result);
  } catch (e: any) {
    console.error("Get partners error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// Get partner summary (for admin display) - backwards compatibility
router.get("/api/partners/summary", async (req, res) => {
  try {
    if (!fs.existsSync(EXCEL_FILE)) {
      return res.json({ partners: [], count: 0 });
    }

    const workbook = XLSX.readFile(EXCEL_FILE);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);

    // Import i18n-iso-countries for country name conversion
    const countries = require("i18n-iso-countries");
    const frLocale = require("i18n-iso-countries/langs/fr.json");
    countries.registerLocale(frLocale);

    // Format for display (last 10 submissions) with FULL data for editing
    const allPartners = data.map((row: any, index: number) => {
      const countryCode = row["Country"] || "";
      const countryName = countryCode ? countries.getName(countryCode, "fr") || countryCode : "";
      
      return {
        id: index,
        name: row["Partner Name"] || "",
        email: row["Email"] || "",
        phone: row["Phone"] || "",
        city: row["City"] || "",
        country: countryName,
        submitted: row["Timestamp"] || "",
        // Additional fields for editing
        status: row["Status"] || "Pending",
        is_active: row["Is_Active"] || "FALSE",
        show_on_map: row["Show_On_Map"] || "FALSE",
        lat: row["lat"] || "",
        lng: row["lng"] || "",
        address: row["Address"] || "",
        address_line2: row["Complément d'adresse"] || "",
        postal_code: row["Postal Code"] || "",
        website: row["Website"] || ""
      };
    });

    const partners = allPartners.slice(-10).reverse();

    res.json({ partners, count: data.length });
  } catch (e: any) {
    console.error("Summary error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// Update partner details (Status, Is_Active, Show_On_Map, lat, lng)
router.patch("/api/partners/:id/update", async (req, res) => {
  try {
    const rowId = parseInt(req.params.id);
    const updates = req.body;

    // Convert boolean values to "TRUE"/"FALSE" strings for Excel compatibility
    const normalizedUpdates = { ...updates };
    if ('is_active' in normalizedUpdates) {
      normalizedUpdates.is_active = normalizedUpdates.is_active ? 'TRUE' : 'FALSE';
    }
    if ('show_on_map' in normalizedUpdates) {
      normalizedUpdates.show_on_map = normalizedUpdates.show_on_map ? 'TRUE' : 'FALSE';
    }
    if ('email_public' in normalizedUpdates) {
      normalizedUpdates.email_public = normalizedUpdates.email_public ? 'TRUE' : 'FALSE';
    }
    if ('phone_public' in normalizedUpdates) {
      normalizedUpdates.phone_public = normalizedUpdates.phone_public ? 'TRUE' : 'FALSE';
    }

    const success = partnerStore.update(rowId, normalizedUpdates);
    
    if (!success) {
      return res.status(404).json({ error: "Partner not found" });
    }

    console.log(`✅ Partner updated via store: row ${rowId}`);
    return res.json({ ok: true, message: "Partner updated successfully" });
  } catch (e: any) {
    console.error("Update error:", e);
    return res.status(500).json({ error: "Server error" });
  }
});

// Legacy update using Excel directly (backup)
router.patch("/api/partners/:id/update-legacy", async (req, res) => {
  try {
    const rowId = parseInt(req.params.id);
    const { status, is_active, show_on_map, lat, lng } = req.body;
    
    if (!fs.existsSync(EXCEL_FILE)) {
      return res.status(404).json({ error: "No partner submissions found" });
    }

    const workbook = XLSX.readFile(EXCEL_FILE);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (rowId < 0 || rowId >= data.length) {
      return res.status(404).json({ error: "Partner not found" });
    }

    // Update the row
    const row = data[rowId] as any;
    if (status !== undefined) row["Status"] = status;
    if (is_active !== undefined) row["Is_Active"] = is_active;
    if (show_on_map !== undefined) row["Show_On_Map"] = show_on_map;
    if (lat !== undefined) row["lat"] = lat;
    if (lng !== undefined) row["lng"] = lng;

    // Recreate the Excel file with updated data
    const newWorkbook = XLSX.utils.book_new();
    const headers = [
      ["Timestamp", "Partner Name", "Email", "Email_Public", "Phone", "Website", 
       "Address", "Complément d'adresse", "City", "Postal Code", "Country", "Photo Formats", "Other Photo", 
       "Film Formats", "Other Film", "Video Cassettes", "Other Video", "Delivery", "Other Delivery", "Public Description", "Consent",
       "Status", "Is_Active", "Show_On_Map", "lat", "lng", "slug"]
    ];
    
    const rows = data.map((r: any) => [
      r["Timestamp"],
      r["Partner Name"],
      r["Email"],
      r["Email_Public"],
      r["Phone"],
      r["Website"],
      r["Address"],
      r["Complément d'adresse"],
      r["City"],
      r["Postal Code"],
      r["Country"],
      r["Photo Formats"],
      r["Other Photo"],
      r["Film Formats"],
      r["Other Film"],
      r["Video Cassettes"],
      r["Other Video"],
      r["Delivery"],
      r["Other Delivery"],
      r["Public Description"],
      r["Consent"],
      r["Status"] || "Pending",
      r["Is_Active"] || "FALSE",
      r["Show_On_Map"] || "FALSE",
      r["lat"] || "",
      r["lng"] || "",
      r["slug"] || ""
    ]);

    const newWorksheet = XLSX.utils.aoa_to_sheet([...headers, ...rows]);
    XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, "Partners");
    XLSX.writeFile(newWorkbook, EXCEL_FILE);

    console.log(`✅ Partner updated: ${row["Partner Name"]}`);
    res.json({ ok: true, message: "Partner updated successfully" });
  } catch (e: any) {
    console.error("Update error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete a partner submission
router.delete("/api/partners/:id", async (req, res) => {
  try {
    const rowId = parseInt(req.params.id);

    const success = partnerStore.delete(rowId);
    
    if (!success) {
      return res.status(404).json({ error: "Partner not found" });
    }

    console.log(`✅ Partner deleted via store: row ${rowId}`);
    return res.json({ ok: true, message: "Partner deleted successfully" });
  } catch (e: any) {
    console.error("Delete error:", e);
    return res.status(500).json({ error: "Server error" });
  }
});

// Legacy delete using Excel directly (backup)
router.delete("/api/partners/:id/legacy", async (req, res) => {
  try {
    const rowId = parseInt(req.params.id);
    
    if (!fs.existsSync(EXCEL_FILE)) {
      return res.status(404).json({ error: "No partner submissions found" });
    }

    const workbook = XLSX.readFile(EXCEL_FILE);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (rowId < 0 || rowId >= data.length) {
      return res.status(404).json({ error: "Partner not found" });
    }

    // Remove the row at the specified index
    data.splice(rowId, 1);

    // Recreate the Excel file with remaining data
    const newWorkbook = XLSX.utils.book_new();
    const headers = [
      ["Timestamp", "Partner Name", "Email", "Email_Public", "Phone", "Website", 
       "Address", "Complément d'adresse", "City", "Postal Code", "Country", "Photo Formats", "Other Photo", 
       "Film Formats", "Other Film", "Video Cassettes", "Other Video", "Delivery", "Other Delivery", "Public Description", "Consent",
       "Status", "Is_Active", "Show_On_Map", "lat", "lng", "slug"]
    ];
    
    const rows = data.map((row: any) => [
      row["Timestamp"],
      row["Partner Name"],
      row["Email"],
      row["Email_Public"],
      row["Phone"],
      row["Website"],
      row["Address"],
      row["Complément d'adresse"],
      row["City"],
      row["Postal Code"],
      row["Country"],
      row["Photo Formats"],
      row["Other Photo"],
      row["Film Formats"],
      row["Other Film"],
      row["Video Cassettes"],
      row["Other Video"],
      row["Delivery"],
      row["Other Delivery"],
      row["Public Description"],
      row["Consent"],
      row["Status"] || "Pending",
      row["Is_Active"] || "FALSE",
      row["Show_On_Map"] || "FALSE",
      row["lat"] || "",
      row["lng"] || "",
      row["slug"] || ""
    ]);

    const newWorksheet = XLSX.utils.aoa_to_sheet([...headers, ...rows]);
    XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, "Partners");
    XLSX.writeFile(newWorkbook, EXCEL_FILE);

    console.log(`✅ Partner submission deleted: row ${rowId}`);
    res.json({ ok: true, message: "Partner deleted successfully" });
  } catch (e: any) {
    console.error("Delete error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

async function saveToExcel(data: any) {
  let workbook: XLSX.WorkBook;
  let worksheet: XLSX.WorkSheet;
  
  // Load existing file or create new one
  if (fs.existsSync(EXCEL_FILE)) {
    workbook = XLSX.readFile(EXCEL_FILE);
    worksheet = workbook.Sheets[workbook.SheetNames[0]];
  } else {
    workbook = XLSX.utils.book_new();
    worksheet = XLSX.utils.aoa_to_sheet([
      ["Timestamp", "Partner Name", "Email", "Email_Public", "Phone", "Website", 
       "Address", "Complément d'adresse", "City", "Postal Code", "Country", "Photo Formats", "Other Photo", 
       "Film Formats", "Other Film", "Video Cassettes", "Other Video", "Delivery", "Other Delivery", "Public Description", "Consent",
       "Status", "Is_Active", "Show_On_Map", "lat", "lng", "slug"]
    ]);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Partners");
  }
  
  // Map country code to full name
  const countryMap: Record<string, string> = {
    'FR': 'France',
    'BE': 'Belgium',
    'CA': 'Canada',
    'MC': 'Monaco',
    'CH': 'Switzerland'
  };
  
  const countryName = countryMap[data.address?.country] || data.address?.country || "";
  
  // Generate slug from partner name
  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
      .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
  };
  
  // Prepare row data
  const row = [
    new Date().toISOString(),
    data.partner_name,
    data.email,
    data.email_public ? "TRUE" : "FALSE",
    data.phone || "",
    data.website || "",
    data.address?.street || "",
    data.address?.line2 || "",
    data.address?.city || "",
    data.address?.postal_code || "",
    countryName,
    data.photo_formats?.join(", ") || "",
    data.other_photo_formats || "",
    data.film_formats?.join(", ") || "",
    data.other_film_formats || "",
    data.video_cassettes?.join(", ") || "",
    data.other_video_formats || "",
    data.delivery?.join(", ") || "",
    data.other_delivery || "",
    data.public_description || "",
    data.consent_listed ? "Yes" : "No",
    "Pending",
    "FALSE",
    "FALSE",
    "",
    "",
    generateSlug(data.partner_name)
  ];
  
  // Append row
  XLSX.utils.sheet_add_aoa(worksheet, [row], { origin: -1 });
  
  // Save file
  XLSX.writeFile(workbook, EXCEL_FILE);
  console.log(`✅ Partner submission saved to Excel: ${data.partner_name}`);
}

async function sendPartnerNotification(data: any) {
  if (!resend) {
    console.log("⚠️ Resend not configured - skipping email notification");
    return;
  }

  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('fr-FR', { 
        timeZone: 'Europe/Paris',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  // Get base URL - use production domain in deployed environment
  const baseUrl = 'https://memopyk.com';

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #2A4759 0%, #011526 100%); padding: 30px; text-align: center;">
        <h1 style="color: #F2EBDC; margin: 0; font-size: 28px;">🤝 Nouvelle Demande Partenaire</h1>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px;">
        <h2 style="color: #2A4759; margin-top: 0;">Informations du Partenaire</h2>
        
        <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden;">
          <tr style="background: #F2EBDC;">
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #ddd;">Nom du Partenaire</td>
            <td style="padding: 12px; border-bottom: 1px solid #ddd;">${data.partner_name}</td>
          </tr>
          <tr>
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #ddd;">Email</td>
            <td style="padding: 12px; border-bottom: 1px solid #ddd;">${data.email}</td>
          </tr>
          <tr style="background: #F2EBDC;">
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #ddd;">Téléphone</td>
            <td style="padding: 12px; border-bottom: 1px solid #ddd;">${data.phone || 'Non fourni'}</td>
          </tr>
          <tr>
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #ddd;">Site Web</td>
            <td style="padding: 12px; border-bottom: 1px solid #ddd;">${data.website || 'Non fourni'}</td>
          </tr>
          <tr style="background: #F2EBDC;">
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #ddd;">Pays</td>
            <td style="padding: 12px; border-bottom: 1px solid #ddd;">${data.address?.country || 'Non fourni'}</td>
          </tr>
          <tr>
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #ddd;">Ville</td>
            <td style="padding: 12px; border-bottom: 1px solid #ddd;">${data.address?.city || 'Non fourni'}</td>
          </tr>
          <tr style="background: #F2EBDC;">
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #ddd;">Formats Photos</td>
            <td style="padding: 12px; border-bottom: 1px solid #ddd;">${data.photo_formats?.join(', ') || 'Non spécifié'}</td>
          </tr>
          ${data.other_photo_formats ? `<tr>
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #ddd;">Autres Formats Photos</td>
            <td style="padding: 12px; border-bottom: 1px solid #ddd;">${data.other_photo_formats}</td>
          </tr>` : ''}
          <tr${data.other_photo_formats ? ' style="background: #F2EBDC;"' : ''}>
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #ddd;">Formats Film</td>
            <td style="padding: 12px; border-bottom: 1px solid #ddd;">${data.film_formats?.join(', ') || 'Non spécifié'}</td>
          </tr>
          ${data.other_film_formats ? `<tr${!data.other_photo_formats ? ' style="background: #F2EBDC;"' : ''}>
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #ddd;">Autres Formats Film</td>
            <td style="padding: 12px; border-bottom: 1px solid #ddd;">${data.other_film_formats}</td>
          </tr>` : ''}
          <tr${((data.other_photo_formats && !data.other_film_formats) || (!data.other_photo_formats && data.other_film_formats)) ? ' style="background: #F2EBDC;"' : ''}>
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #ddd;">Cassettes Vidéo</td>
            <td style="padding: 12px; border-bottom: 1px solid #ddd;">${data.video_cassettes?.join(', ') || 'Non spécifié'}</td>
          </tr>
          ${data.other_video_formats ? `<tr>
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #ddd;">Autres Formats Vidéo</td>
            <td style="padding: 12px; border-bottom: 1px solid #ddd;">${data.other_video_formats}</td>
          </tr>` : ''}
          <tr style="background: #F2EBDC;">
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #ddd;">Livraison</td>
            <td style="padding: 12px; border-bottom: 1px solid #ddd;">${data.delivery?.join(', ') || 'Non spécifié'}</td>
          </tr>
          <tr>
            <td style="padding: 12px; font-weight: bold;">Date de Soumission</td>
            <td style="padding: 12px;">${formatDate(new Date().toISOString())}</td>
          </tr>
        </table>

        ${data.public_description ? `
          <div style="margin-top: 20px; background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #D67C4A;">
            <h3 style="color: #2A4759; margin-top: 0;">Description Publique</h3>
            <p style="color: #333; margin: 0;">${data.public_description}</p>
          </div>
        ` : ''}

        <div style="margin-top: 30px; text-align: center;">
          <p style="color: #2A4759; font-weight: bold; margin-bottom: 20px;">Actions Rapides</p>
          
          <table style="width: 100%; border-spacing: 10px;">
            <tr>
              <td style="text-align: center;">
                <a href="${baseUrl}/admin" 
                   style="display: inline-block; padding: 14px 28px; background: #2A4759; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">
                  📋 Voir Admin Partenaires
                </a>
              </td>
              <td style="text-align: center;">
                <a href="${baseUrl}/api/partners/download" 
                   style="display: inline-block; padding: 14px 28px; background: #D67C4A; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">
                  📥 Télécharger Excel
                </a>
              </td>
            </tr>
          </table>
        </div>
      </div>
      
      <div style="background: #2A4759; padding: 20px; text-align: center;">
        <p style="color: #F2EBDC; margin: 0; font-size: 12px;">
          © ${new Date().getFullYear()} MEMOPYK - Transformez vos souvenirs en films cinématographiques
        </p>
      </div>
    </div>
  `;

  await resend.emails.send({
    from: 'MEMOPYK Partners <noreply@memopyk.com>',
    to: 'ngoc@memopyk.com',
    subject: `🤝 Nouveau Partenaire: ${data.partner_name}`,
    html: emailHtml,
  });
}

export default router;

// Zoho integration helpers (disabled - using Excel fallback)
// TODO: Re-enable when Zoho credentials are configured
