import { Router } from "express";
import { PartnerIntakeSchema } from "../../shared/partnerSchema";
import { verifyCaptcha, verifyCsrf, rateLimit } from "../utils/security";
import { randomId } from "../zoho/zohoClient";
import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";

const router = Router();
const EXCEL_FILE = path.join(process.cwd(), "partner-submissions.xlsx");

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
    
    // TODO: Send email notification to ngoc@memopyk.com
    console.log(`📧 TODO: Email notification to ngoc@memopyk.com for partner: ${data.partner_name}`);

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

    // Format for display (last 10 submissions)
    const partners = data.slice(-10).reverse().map((row: any) => ({
      name: row["Partner Name"] || "",
      email: row["Email"] || "",
      country: row["Country"] || "",
      submitted: row["Submitted"] || "",
      services: row["Services"] || ""
    }));

    res.json({ partners, count: data.length });
  } catch (e: any) {
    console.error("Summary error:", e);
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

export default router;

// Zoho integration helpers (disabled - using Excel fallback)
// TODO: Re-enable when Zoho credentials are configured
