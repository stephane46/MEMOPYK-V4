export const DIRECTUS_URL = "https://cms.memopyk.org";

export function directusAsset(
  raw: string,
  opts?: { width?: number; quality?: number; format?: "webp" | "jpg" }
) {
  if (!raw) return "";
  if (raw.startsWith("http")) return raw;
  const path = raw.startsWith("/assets/") ? raw : `/assets/${raw}`;
  
  const isWebP = raw.toLowerCase().endsWith('.webp');
  
  const q = new URLSearchParams({
    ...(opts?.width ? { width: String(opts.width) } : {}),
    ...(opts?.quality ? { quality: String(opts.quality) } : {}),
    ...(opts?.format ? { format: opts.format } : !isWebP ? { format: "webp" } : {}),
  });
  return `${DIRECTUS_URL}${path}${q.toString() ? `?${q}` : ""}`;
}
