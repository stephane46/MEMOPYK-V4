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
                key={i}
                data-testid={`block-heading-${i}`}
                className={`${alignClass} ${sizeClass} font-['Playfair_Display'] text-[#2A4759] leading-tight text-balance`}
              >
                {text}
              </Tag>
            );
          }
          default:
            return null;
        }
      })}
    </div>
  );
}
