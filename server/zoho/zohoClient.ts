import crypto from "crypto";

type ZohoTokenState = { accessToken: string; expiry: number };

const baseUrl = process.env.ZOHO_BASE_URL || "";
const authUrl = process.env.ZOHO_AUTH_URL || "";
const clientId = process.env.ZOHO_CLIENT_ID || "";
const clientSecret = process.env.ZOHO_CLIENT_SECRET || "";
const refreshToken = process.env.ZOHO_REFRESH_TOKEN || "";

if (!baseUrl || !authUrl || !clientId || !clientSecret || !refreshToken) {
  console.warn("⚠️ Zoho env vars not configured - partner intake will fail");
}

let tokenState: ZohoTokenState | null = null;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (tokenState && now < tokenState.expiry - 10_000) return tokenState.accessToken;
  
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  }).toString();
  
  console.log("🔐 ZOHO AUTH: Requesting access token from:", authUrl);
  console.log("🔐 ZOHO AUTH: Using client_id:", clientId.substring(0, 10) + "...");
  
  const res = await fetch(authUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  
  if (!res.ok) {
    const t = await res.text();
    console.error("❌ ZOHO AUTH FAILED:", {
      status: res.status,
      authUrl,
      clientId: clientId.substring(0, 10) + "...",
      hasRefreshToken: !!refreshToken,
      response: t.substring(0, 200)
    });
    throw new Error(`Zoho token refresh failed: ${res.status} - Please check your ZOHO credentials in environment variables`);
  }
  
  const json: any = await res.json();
  tokenState = {
    accessToken: json.access_token,
    expiry: Date.now() + (json.expires_in * 1000 || 3300_000),
  };
  
  return tokenState.accessToken;
}

export async function zohoFetch(path: string, init?: RequestInit & { json?: any }) {
  const token = await getAccessToken();
  const url = path.startsWith("http") ? path : `${baseUrl}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Zoho-oauthtoken ${token}`,
  };
  
  let body: BodyInit | undefined;
  if (init?.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(init.json);
  }
  
  const res = await fetch(url, { 
    ...init, 
    headers: { ...headers, ...(init?.headers || {}) }, 
    body 
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Zoho API ${res.status} ${url}: ${text}`);
  }
  
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}

export function randomId(prefix = "req_") {
  return prefix + crypto.randomBytes(8).toString("hex");
}
