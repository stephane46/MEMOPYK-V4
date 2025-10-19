import DOMPurify from 'dompurify';
import { setAttr } from '@directus/visual-editing';
import { rewriteBodyImages } from '@/lib/imageUtils';
import { directusAsset } from '@/constants/directus';

interface PostBlocksProps {
  blocks: Array<{
    collection: string;
    item: any;
  }>;
}

export default function PostBlocks({ blocks }: PostBlocksProps) {
  return (
    <div className="space-y-8" data-testid="post-blocks">
      {blocks.map((b, i) => {
        switch (b.collection) {
          case "block_heading": {
            const { text, level = "h2", align = "left" } = b.item || {};
            const Tag = (["h1", "h2", "h3"].includes(level) ? level : "h2") as "h1" | "h2" | "h3";
            
            const alignClass = align === "center" ? "text-center" : "text-left";
            const sizeClass = level === "h1" 
              ? "text-4xl md:text-5xl" 
              : level === "h2" 
              ? "text-3xl md:text-4xl" 
              : "text-2xl md:text-3xl";
            
            return (
              <Tag 
                key={`heading-${i}`}
                data-testid={`block-heading-${i}`}
                className={`${alignClass} ${sizeClass} font-['Playfair_Display'] text-[#2A4759] leading-tight text-balance`}
                data-directus={setAttr({
                  collection: "block_heading",
                  item: b.item?.id,
                  fields: "text,level,align",
                  mode: "popover",
                })}
              >
                {text}
              </Tag>
            );
          }

          case "block_richtext": {
            const raw = b.item?.html || b.item?.content || "";
            const sanitized = DOMPurify.sanitize(raw);
            const html = rewriteBodyImages(sanitized);

            return (
              <article
                key={`richtext-${i}`}
                data-testid={`block-richtext-${i}`}
                className="prose prose-lg max-w-none
                  prose-headings:font-['Playfair_Display'] prose-headings:text-[#2A4759]
                  prose-p:text-gray-700 prose-p:leading-relaxed
                  prose-a:text-[#D67C4A] prose-a:no-underline hover:prose-a:underline
                  prose-strong:text-[#2A4759]
                  prose-img:rounded-lg prose-img:shadow-lg prose-img:max-w-full prose-img:h-auto
                  prose-blockquote:border-l-4 prose-blockquote:border-[#D67C4A] prose-blockquote:italic"
                dangerouslySetInnerHTML={{ __html: html }}
                data-directus={setAttr({
                  collection: "block_richtext",
                  item: b.item?.id,
                  fields: "content",
                  mode: "drawer",
                })}
              />
            );
          }

          case "block_gallery": {
            const items = b.item?.items || [];
            if (!items || items.length === 0) return null;

            return (
              <div
                key={`gallery-${i}`}
                data-testid={`block-gallery-${i}`}
                className="my-8"
                data-directus={setAttr({
                  collection: "block_gallery",
                  item: b.item?.id,
                  fields: "items",
                  mode: "drawer",
                })}
              >
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {items.map((galleryItem: any, idx: number) => {
                    const file = galleryItem.directus_file;
                    if (!file || !file.id) return null;

                    const fileId = file.id;
                    const title = file.title || '';
                    const description = file.description || title;

                    const sizes = '(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 300px';
                    
                    const srcset = [640, 828, 1200]
                      .map(w => `${directusAsset(fileId, { width: w, quality: 82, format: 'webp' })} ${w}w`)
                      .join(', ');

                    return (
                      <figure
                        key={galleryItem.id || idx}
                        className="relative overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow"
                        data-testid={`gallery-item-${i}-${idx}`}
                      >
                        <img
                          src={directusAsset(fileId, { width: 828, quality: 82, format: 'webp' })}
                          srcSet={srcset}
                          sizes={sizes}
                          alt={description}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-auto object-cover aspect-square"
                        />
                        {title && (
                          <figcaption className="sr-only">
                            {title}
                          </figcaption>
                        )}
                      </figure>
                    );
                  })}
                </div>
              </div>
            );
          }

          default:
            console.warn(`Unknown block collection: ${b.collection}`);
            return null;
        }
      })}
    </div>
  );
}
