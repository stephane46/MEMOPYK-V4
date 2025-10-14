import { Router } from "express";
import { PartnerIntakeSchema } from "../../shared/partnerSchema";
import { verifyCaptcha, verifyCsrf, rateLimit } from "../utils/security";
import { randomId } from "../zoho/zohoClient";
import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";
import { Resend } from "resend";

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

// Get partner summary (for admin display)
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

    // Format for display (last 10 submissions)
    const allPartners = data.map((row: any, index: number) => {
      const countryCode = row["Country"] || "";
      const countryName = countryCode ? countries.getName(countryCode, "fr") || countryCode : "";
      
      return {
        id: index, // Use index as ID for deletion
        name: row["Partner Name"] || "",
        email: row["Email"] || "",
        phone: row["Phone"] || "",
        city: row["City"] || "",
        country: countryName,
        submitted: row["Timestamp"] || ""
      };
    });

    const partners = allPartners.slice(-10).reverse();

    res.json({ partners, count: data.length });
  } catch (e: any) {
    console.error("Summary error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete a partner submission
router.delete("/api/partners/:id", async (req, res) => {
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
      ["Timestamp", "Partner Name", "Contact Name", "Email", "Phone", "Website", 
       "Address", "City", "Postal Code", "Country", "Services", "Photo Formats", 
       "Video Formats", "Film Formats", "Audio Formats", "Output Formats", 
       "Turnaround", "Rush", "Languages", "Consent"]
    ];
    
    const rows = data.map((row: any) => [
      row["Timestamp"],
      row["Partner Name"],
      row["Contact Name"],
      row["Email"],
      row["Phone"],
      row["Website"],
      row["Address"],
      row["City"],
      row["Postal Code"],
      row["Country"],
      row["Services"],
      row["Photo Formats"],
      row["Video Formats"],
      row["Film Formats"],
      row["Audio Formats"],
      row["Output Formats"],
      row["Turnaround"],
      row["Rush"],
      row["Languages"],
      row["Consent"]
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
      ["Timestamp", "Partner Name", "Contact Name", "Email", "Phone", "Website", 
       "Address", "City", "Postal Code", "Country", "Services", "Photo Formats", 
       "Video Formats", "Film Formats", "Audio Formats", "Output Formats", 
       "Turnaround", "Rush", "Languages", "Consent"]
    ]);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Partners");
  }
  
  // Prepare row data
  const row = [
    new Date().toISOString(),
    data.partner_name,
    data.contact_name,
    data.email,
    data.phone || "",
    data.website || "",
    data.address?.street || "",
    data.address?.city || "",
    data.address?.postal_code || "",
    data.address?.country || "",
    data.services?.join(", ") || "",
    data.photo_formats?.join(", ") || "",
    data.video_formats?.join(", ") || "",
    data.film_formats?.join(", ") || "",
    data.audio_formats?.join(", ") || "",
    data.output_formats?.join(", ") || "",
    data.turnaround_days || "",
    data.rush_available ? "Yes" : "No",
    data.languages?.join(", ") || "",
    data.consent_listed ? "Yes" : "No"
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

  // Get base URL from environment
  const baseUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
    : 'https://memopyk.com';

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
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #ddd;">Services</td>
            <td style="padding: 12px; border-bottom: 1px solid #ddd;">${data.services?.join(', ') || 'Aucun'}</td>
          </tr>
          <tr>
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #ddd;">Délai (jours)</td>
            <td style="padding: 12px; border-bottom: 1px solid #ddd;">${data.turnaround_days || 'Non spécifié'}</td>
          </tr>
          <tr style="background: #F2EBDC;">
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #ddd;">Service Express</td>
            <td style="padding: 12px; border-bottom: 1px solid #ddd;">${data.rush_available ? '✅ Oui' : '❌ Non'}</td>
          </tr>
          <tr>
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #ddd;">Langues</td>
            <td style="padding: 12px; border-bottom: 1px solid #ddd;">${data.languages?.join(', ') || 'Non spécifié'}</td>
          </tr>
          <tr style="background: #F2EBDC;">
            <td style="padding: 12px; font-weight: bold;">Date de Soumission</td>
            <td style="padding: 12px;">${formatDate(new Date().toISOString())}</td>
          </tr>
        </table>

        ${data.notes ? `
          <div style="margin-top: 20px; background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #D67C4A;">
            <h3 style="color: #2A4759; margin-top: 0;">Notes Additionnelles</h3>
            <p style="color: #333; margin: 0;">${data.notes}</p>
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
    from: 'MEMOPYK Partners <onboarding@resend.dev>',
    to: 'ngoc@memopyk.com',
    subject: `🤝 Nouveau Partenaire: ${data.partner_name}`,
    html: emailHtml,
  });
}

export default router;

// Zoho integration helpers (disabled - using Excel fallback)
// TODO: Re-enable when Zoho credentials are configured
