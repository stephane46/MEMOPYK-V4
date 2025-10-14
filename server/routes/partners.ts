import { Router } from "express";
import { PartnerIntakeSchema } from "../../shared/partnerSchema";
import { verifyCaptcha, verifyCsrf, rateLimit } from "../utils/security";
import { zohoFetch, randomId } from "../zoho/zohoClient";

const router = Router();

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

    // 1) Resolve or create Account
    const accountId = await resolveOrCreateAccount(data);

    // 2) Resolve or create Contact
    const contactId = await resolveOrCreateContact(data, accountId);

    // 3) Upsert Partner record
    const partnerId = await upsertPartnerRecord(data, accountId, contactId);

    return res.json({ ok: true, partnerId, reqId });
  } catch (e: any) {
    console.error("INTAKE_ERR", reqId, e?.message || e);
    return res.status(500).json({ ok: false, error: "server_error", reqId });
  }
});

export default router;

// --- Helpers (Zoho CRM) ---
const MOD = process.env.PARTNERS_MODULE_API || "Partners";

function accountSearchQueries(name: string, website?: string, phone?: string, postal?: string) {
  const qs: string[] = [];
  if (website) qs.push(`(Website:equals:${website})`);
  if (phone && postal) qs.push(`((Phone:equals:${phone})and(Billing_Code:equals:${postal}))`);
  if (name) qs.push(`(Account_Name:equals:${escapeColon(name)})`);
  return qs;
}

function escapeColon(s: string) { 
  return s.replace(/:/g, "\\:"); 
}

async function resolveOrCreateAccount(d: any): Promise<string> {
  const name = d.partner_name;
  const website = d.website || "";
  const phone = d.phone || "";
  const postal = d.address?.postal_code || "";

  // Try search
  for (const criteria of accountSearchQueries(name, website, phone, postal)) {
    try {
      const search = await zohoFetch(`/crm/v2/Accounts/search?criteria=${encodeURIComponent(criteria)}`);
      if (search?.data?.[0]?.id) return search.data[0].id;
    } catch (e) {
      // Continue to next criteria
    }
  }
  
  // Create minimal Account
  const payload = {
    data: [{
      Account_Name: name,
      Website: website || undefined,
      Phone: phone || undefined,
      Billing_Street: d.address?.street || "",
      Billing_City: d.address?.city || "",
      Billing_Code: postal || "",
      Billing_Country: d.address?.country || "",
    }]
  };
  
  const created = await zohoFetch(`/crm/v2/Accounts`, { 
    method: "POST", 
    json: payload 
  });
  
  return created.data[0].details.id as string;
}

async function resolveOrCreateContact(d: any, accountId: string): Promise<string> {
  const email = d.email;
  
  // Search by email
  if (email) {
    try {
      const search = await zohoFetch(`/crm/v2/Contacts/search?email=${encodeURIComponent(email)}`);
      if (search?.data?.[0]?.id) return search.data[0].id;
    } catch (e) {
      // Continue to create
    }
  }
  
  // Create Contact from name split
  const [first, ...rest] = d.partner_name.split(" ");
  const last = rest.join(" ") || "-";
  
  const payload = { 
    data: [{ 
      First_Name: first, 
      Last_Name: last, 
      Email: email, 
      Phone: d.phone || undefined, 
      Account_Name: { id: accountId } 
    }] 
  };
  
  const created = await zohoFetch(`/crm/v2/Contacts`, { 
    method: "POST", 
    json: payload 
  });
  
  return created.data[0].details.id as string;
}

function toMultiSelect(arr?: string[]) {
  return (arr || []).map(v => ({ name: v }));
}

async function upsertPartnerRecord(d: any, accountId: string, contactId: string): Promise<string> {
  // Try to find Partner by email first
  let existingId: string | null = null;
  
  try {
    if (d.email) {
      const search = await zohoFetch(`/crm/v2/${encodeURIComponent(MOD)}/search?criteria=${encodeURIComponent(`(Email:equals:${d.email})`)}`);
      if (search?.data?.[0]?.id) existingId = search.data[0].id;
    }
  } catch (e) {
    // Continue to create
  }

  const record = {
    Partner_Name: d.partner_name,
    Email: d.email,
    Phone: d.phone || undefined,
    Website: d.website || undefined,
    Street: d.address?.street || "",
    Address_Line_2: d.address?.line2 || "",
    City: d.address?.city || "",
    Postal_Code: d.address?.postal_code || "",
    Country: d.address?.country || "",
    Services: toMultiSelect(d.services),
    Photo_Formats: toMultiSelect(d.photo_formats),
    Video_Formats: toMultiSelect(d.video_formats),
    Film_Formats: toMultiSelect(d.film_formats),
    Audio_Formats: toMultiSelect(d.audio_formats),
    Output: toMultiSelect(d.output),
    Turnaround: d.turnaround || "",
    Rush_Service: d.rush ?? false,
    Languages: toMultiSelect(d.languages),
    Consent_Listed: !!d.consent_listed,
    Notes: d.notes || "",
    Partner_Status: "Pending",
    Is_Active: false,
    Show_on_Map: false,
    Account: { id: accountId },
    Primary_Contact: { id: contactId },
  };

  if (existingId) {
    const upd = await zohoFetch(`/crm/v2/${encodeURIComponent(MOD)}`, { 
      method: "PUT", 
      json: { data: [{ id: existingId, ...record }] } 
    });
    return upd.data[0].details.id as string;
  } else {
    const created = await zohoFetch(`/crm/v2/${encodeURIComponent(MOD)}`, { 
      method: "POST", 
      json: { data: [record] } 
    });
    return created.data[0].details.id as string;
  }
}
