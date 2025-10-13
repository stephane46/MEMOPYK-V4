export const DIRECTUS_URL = "https://cms.memopyk.org";

export function directusAsset(
  raw: string,
  opts?: { width?: number; quality?: number; format?: "webp" | "jpg"; fit?: "inside" | "cover" }
) {
  if (!raw) return "";
  if (raw.startsWith("http")) return raw;
  const path = raw.startsWith("/assets/") ? raw : `/assets/${raw}`;
  
  const isWebP = raw.toLowerCase().endsWith('.webp');
  
  const q = new URLSearchParams({
    ...(opts?.width ? { width: String(opts.width) } : {}),
    ...(opts?.quality ? { quality: String(opts.quality) } : {}),
    ...(opts?.fit ? { fit: opts.fit } : {}),
    ...(opts?.format ? { format: opts.format } : !isWebP ? { format: "webp" } : {}),
  });
  return `${DIRECTUS_URL}${path}${q.toString() ? `?${q}` : ""}`;
}

export async function getPostWithBlocks(slug: string, locale: string) {
  const language = locale === 'fr-FR' ? 'fr' : 'en';
  
  const params = new URLSearchParams({
    'filter[slug][_eq]': slug,
    'filter[language][_eq]': language,
    'fields': '*,blocks.collection,blocks.item.*',
    'limit': '1'
  });

  const response = await fetch(`${DIRECTUS_URL}/items/posts?${params}`);
  
  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  
  if (!data.data || data.data.length === 0) {
    return null;
  }

  return data.data[0];
}
