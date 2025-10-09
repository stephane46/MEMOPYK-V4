import DOMPurify from 'dompurify';

interface Block {
  type: string;
  content?: string | any;
  level?: number;
  url?: string;
  alt?: string;
  caption?: string;
  items?: string[];
  language?: string;
  code?: string;
}

interface BlockRendererProps {
  blocks: Block[];
}

export function BlockRenderer({ blocks }: BlockRendererProps) {
  if (!blocks || !Array.isArray(blocks)) {
    return null;
  }

  const renderBlock = (block: Block, index: number) => {
    const sanitizeHtml = (html: string) => {
      return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'span', 'code', 'mark', 'sub', 'sup'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'class']
      });
    };

    switch (block.type) {
      case 'paragraph':
        return (
          <p
            key={index}
            className="mb-6 text-gray-700 leading-relaxed text-lg"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.content || '') }}
          />
        );

      case 'heading':
        const level = block.level || 2;
        const headingClasses = {
          1: 'text-4xl md:text-5xl font-playfair font-bold text-memopyk-dark-blue mb-8 mt-12',
          2: 'text-3xl md:text-4xl font-playfair font-bold text-memopyk-dark-blue mb-6 mt-10',
          3: 'text-2xl md:text-3xl font-playfair font-semibold text-memopyk-dark-blue mb-5 mt-8',
          4: 'text-xl md:text-2xl font-playfair font-semibold text-memopyk-navy mb-4 mt-6',
          5: 'text-lg md:text-xl font-poppins font-semibold text-memopyk-navy mb-4 mt-6',
          6: 'text-base md:text-lg font-poppins font-semibold text-memopyk-navy mb-3 mt-4'
        };
        const headingClass = headingClasses[level as keyof typeof headingClasses] || headingClasses[2];
        const headingContent = { __html: sanitizeHtml(block.content || '') };
        
        switch (level) {
          case 1:
            return <h1 key={index} className={headingClass} dangerouslySetInnerHTML={headingContent} />;
          case 2:
            return <h2 key={index} className={headingClass} dangerouslySetInnerHTML={headingContent} />;
          case 3:
            return <h3 key={index} className={headingClass} dangerouslySetInnerHTML={headingContent} />;
          case 4:
            return <h4 key={index} className={headingClass} dangerouslySetInnerHTML={headingContent} />;
          case 5:
            return <h5 key={index} className={headingClass} dangerouslySetInnerHTML={headingContent} />;
          case 6:
            return <h6 key={index} className={headingClass} dangerouslySetInnerHTML={headingContent} />;
          default:
            return <h2 key={index} className={headingClass} dangerouslySetInnerHTML={headingContent} />;
        }

      case 'list':
        const isOrdered = block.content?.type === 'ordered';
        const ListTag = isOrdered ? 'ol' : 'ul';
        const items = block.items || block.content?.items || [];
        return (
          <ListTag
            key={index}
            className={`mb-6 ml-6 text-gray-700 leading-relaxed text-lg space-y-2 ${
              isOrdered ? 'list-decimal' : 'list-disc'
            }`}
          >
            {items.map((item: string, i: number) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: sanitizeHtml(item) }} />
            ))}
          </ListTag>
        );

      case 'quote':
      case 'blockquote':
        return (
          <blockquote
            key={index}
            className="border-l-4 border-memopyk-orange pl-6 py-4 mb-6 italic text-gray-700 text-lg bg-memopyk-cream/30 rounded-r-lg"
          >
            <p dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.content || '') }} />
          </blockquote>
        );

      case 'image':
        return (
          <figure key={index} className="mb-8 mt-8">
            <img
              src={block.url || block.content?.url}
              alt={block.alt || block.content?.alt || ''}
              className="w-full rounded-lg shadow-lg"
              loading="lazy"
            />
            {(block.caption || block.content?.caption) && (
              <figcaption className="text-center text-sm text-gray-600 mt-3 italic">
                {block.caption || block.content?.caption}
              </figcaption>
            )}
          </figure>
        );

      case 'code':
        return (
          <pre
            key={index}
            className="bg-gray-900 text-gray-100 p-6 rounded-lg mb-6 overflow-x-auto"
          >
            <code className="text-sm font-mono">
              {block.code || block.content}
            </code>
          </pre>
        );

      case 'divider':
      case 'horizontal-rule':
        return (
          <hr key={index} className="my-10 border-t-2 border-memopyk-sky-blue/30" />
        );

      case 'callout':
        return (
          <div
            key={index}
            className="bg-memopyk-sky-blue/10 border-l-4 border-memopyk-sky-blue p-6 mb-6 rounded-r-lg"
          >
            <div
              className="text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.content || '') }}
            />
          </div>
        );

      case 'video':
        const videoUrl = block.url || block.content?.url;
        if (videoUrl && (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be'))) {
          const videoId = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/)?.[1];
          return (
            <div key={index} className="mb-8 mt-8 aspect-video">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                title="Video"
                className="w-full h-full rounded-lg shadow-lg"
                allowFullScreen
              />
            </div>
          );
        }
        return null;

      default:
        if (typeof block.content === 'string') {
          return (
            <div
              key={index}
              className="mb-6 text-gray-700 leading-relaxed text-lg"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.content) }}
            />
          );
        }
        return null;
    }
  };

  return (
    <div className="blog-content">
      {blocks.map((block, index) => renderBlock(block, index))}
    </div>
  );
}
