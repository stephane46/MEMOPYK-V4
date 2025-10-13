import DOMPurify from 'dompurify';
import { setAttr } from '@directus/visual-editing';
import { rewriteBodyImages } from '@/lib/imageUtils';

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
            const raw = b.item?.html || "";
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
                  fields: "html",
                  mode: "drawer",
                })}
              />
            );
          }

          default:
            return null;
        }
      })}
    </div>
  );
}
