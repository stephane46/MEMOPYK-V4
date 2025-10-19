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
  
  // Comprehensive fields for Simple CMS template support
  const fields = [
    'id', 'title', 'slug', 'status', 'published_at', 'description',
    'excerpt', 'body_html', 'language', 'publish_date',
    'meta_title', 'meta_description', 'meta_keywords',
    'canonical_url', 'og_image_url', 'og_description',
    'featured_image_url', 'featured_image_alt', 'reading_time_minutes',
    // Author deep read
    'author.id', 'author.name', 'author.avatar',
    // Featured image deep read
    'image.id', 'image.title', 'image.description', 'image.width', 'image.height',
    // M2A blocks with all possible collections
    'blocks.collection',
    'blocks.item.*',
    // Gallery nested items (for block_gallery)
    'blocks.item.items.id',
    'blocks.item.items.file.id',
    'blocks.item.items.file.title',
    'blocks.item.items.file.description',
    'blocks.item.items.file.width',
    'blocks.item.items.file.height',
  ];
  
  const params = new URLSearchParams({
    'filter[slug][_eq]': slug,
    'filter[language][_eq]': language,
    'filter[status][_eq]': 'published',
    'filter[published_at][_lte]': new Date().toISOString(),
    'fields': fields.join(','),
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
