export const DIRECTUS_URL = "https://cms.memopyk.org";

export function directusAsset(
  urlOrId: string,
  opts?: { width?: number; quality?: number; format?: "webp" | "jpg" }
) {
  const path = urlOrId.startsWith("/assets/")
    ? urlOrId
    : `/assets/${urlOrId}`;
  const q = new URLSearchParams({
    ...(opts?.width ? { width: String(opts.width) } : {}),
    ...(opts?.quality ? { quality: String(opts.quality) } : {}),
    ...(opts?.format ? { format: opts.format } : { format: "webp" }),
  });
  return `${DIRECTUS_URL}${path}${q.toString() ? "?" + q.toString() : ""}`;
}
