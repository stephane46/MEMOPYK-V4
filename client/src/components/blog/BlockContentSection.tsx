import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { directusAsset } from '@/constants/directus';
import { setAttr } from '@directus/visual-editing';

type FileRef = string | { id: string } | null;

export type ContentSection = {
  id?: string;
  layout: "text-only" | "image-left" | "image-right" | "image-full" | "two-images" | "three-images";
  text?: string | null;
  image_primary?: FileRef;
  image_secondary?: FileRef;
  image_third?: FileRef;
  media_width?: "25" | "33" | "40" | "50" | "60" | "66" | "75" | null;
  media_align?: "left" | "center" | "right" | null;
  max_width?: "content" | "wide" | "full" | null;
  spacing_top?: "none" | "sm" | "md" | "lg" | null;
  spacing_bottom?: "none" | "sm" | "md" | "lg" | null;
  background?: "default" | "light" | "dark" | null;
  caption?: string | null;
  alt?: string | null;
};

interface BlockContentSectionProps {
  item: ContentSection;
  index?: number;
}

// Helper to extract file ID from FileRef
function getFileId(fileRef: FileRef | undefined): string | null {
  if (!fileRef) return null;
  if (typeof fileRef === 'string') return fileRef;
  return fileRef.id || null;
}

// Helper to render markdown to HTML
function renderMarkdown(markdown: string | null | undefined): string {
  if (!markdown) return '';
  const rawHtml = marked.parse(markdown, { async: false }) as string;
  return DOMPurify.sanitize(rawHtml);
}

// Spacing map
const spacingMap = {
  none: 'py-0',
  sm: 'py-4',
  md: 'py-8',
  lg: 'py-16',
};

// Max width map
const maxWidthMap = {
  content: 'max-w-4xl',
  wide: 'max-w-6xl',
  full: 'max-w-full',
};

// Background map
const backgroundMap = {
  default: 'bg-transparent',
  light: 'bg-gray-50',
  dark: 'bg-gray-900 text-white',
};

// Media width map (percentage to flex-basis)
const mediaWidthMap = {
  '25': 'w-full md:w-1/4',
  '33': 'w-full md:w-1/3',
  '40': 'w-full md:w-2/5',
  '50': 'w-full md:w-1/2',
  '60': 'w-full md:w-3/5',
  '66': 'w-full md:w-2/3',
  '75': 'w-full md:w-3/4',
};

export default function BlockContentSection({ item, index = 0 }: BlockContentSectionProps) {
  const spacingTop = spacingMap[item.spacing_top || 'md'];
  const spacingBottom = spacingMap[item.spacing_bottom || 'md'];
  const maxWidth = maxWidthMap[item.max_width || 'content'];
  const background = backgroundMap[item.background || 'default'];
  
  const isDark = item.background === 'dark';
  
  const textHtml = renderMarkdown(item.text);
  
  const primaryId = getFileId(item.image_primary);
  const secondaryId = getFileId(item.image_secondary);
  const thirdId = getFileId(item.image_third);

  // Temporary logging to verify image URLs
  console.log('🖼️ BlockContentSection image IDs:', { primaryId, secondaryId, thirdId });
  if (primaryId) {
    console.log('🖼️ Primary URL:', directusAsset(primaryId, { width: 1200, format: 'webp' }));
  }
  if (secondaryId) {
    console.log('🖼️ Secondary URL:', directusAsset(secondaryId, { width: 1200, format: 'webp' }));
  }
  if (thirdId) {
    console.log('🖼️ Third URL:', directusAsset(thirdId, { width: 1200, format: 'webp' }));
  }

  const directusAttr = item.id ? setAttr({
    collection: "block_content_section_v3",
    item: item.id,
    fields: "layout,text,image_primary,image_secondary,image_third,media_width,media_align,max_width,spacing_top,spacing_bottom,background,caption,alt",
    mode: "drawer",
  }) : {};

  // Text-only layout
  if (item.layout === 'text-only') {
    return (
      <div
        className={`${spacingTop} ${spacingBottom} ${background}`}
        data-testid={`block-content-section-${index}`}
        {...directusAttr}
      >
        <div className={`mx-auto px-4 ${maxWidth}`}>
          {textHtml && (
            <article
              className={`prose prose-lg max-w-none
                prose-headings:font-['Playfair_Display'] ${isDark ? 'prose-headings:text-white' : 'prose-headings:text-[#2A4759]'}
                prose-h2:text-3xl prose-h2:mt-8 prose-h2:mb-4
                prose-h3:text-2xl prose-h3:mt-6 prose-h3:mb-3
                ${isDark ? 'prose-p:text-gray-200' : 'prose-p:text-gray-700'} prose-p:leading-relaxed prose-p:text-lg
                prose-a:text-[#D67C4A] prose-a:no-underline prose-a:font-medium hover:prose-a:underline
                ${isDark ? 'prose-strong:text-white' : 'prose-strong:text-[#2A4759]'} prose-strong:font-semibold
                ${isDark ? 'prose-ul:text-gray-200 prose-ol:text-gray-200 prose-li:text-gray-200' : 'prose-ul:text-gray-700 prose-ol:text-gray-700 prose-li:text-gray-700'}`}
              dangerouslySetInnerHTML={{ __html: textHtml }}
            />
          )}
        </div>
      </div>
    );
  }

  // Image-full layout
  if (item.layout === 'image-full') {
    return (
      <div
        className={`${spacingTop} ${spacingBottom} ${background}`}
        data-testid={`block-content-section-${index}`}
        {...directusAttr}
      >
        <div className={`mx-auto px-4 ${maxWidth}`}>
          {primaryId && (
            <figure className="mb-8">
              <img
                src={directusAsset(primaryId, { width: 1600, quality: 85, format: 'webp' })}
                alt={item.alt || ''}
                className="w-full h-auto rounded-xl shadow-2xl"
                loading="lazy"
              />
              {item.caption && (
                <figcaption className="mt-3 text-center text-sm text-gray-600 italic">
                  {item.caption}
                </figcaption>
              )}
            </figure>
          )}
          {textHtml && (
            <article
              className={`prose prose-lg max-w-none
                prose-headings:font-['Playfair_Display'] ${isDark ? 'prose-headings:text-white' : 'prose-headings:text-[#2A4759]'}
                ${isDark ? 'prose-p:text-gray-200' : 'prose-p:text-gray-700'} prose-p:leading-relaxed
                prose-a:text-[#D67C4A] prose-a:no-underline hover:prose-a:underline
                ${isDark ? 'prose-strong:text-white' : 'prose-strong:text-[#2A4759]'}`}
              dangerouslySetInnerHTML={{ __html: textHtml }}
            />
          )}
        </div>
      </div>
    );
  }

  // Two images layout
  if (item.layout === 'two-images') {
    return (
      <div
        className={`${spacingTop} ${spacingBottom} ${background}`}
        data-testid={`block-content-section-${index}`}
        {...directusAttr}
      >
        <div className={`mx-auto px-4 ${maxWidth}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {primaryId && (
              <figure>
                <img
                  src={directusAsset(primaryId, { width: 800, quality: 85, format: 'webp' })}
                  alt={item.alt || ''}
                  className="w-full h-auto rounded-xl shadow-lg"
                  loading="lazy"
                />
              </figure>
            )}
            {secondaryId && (
              <figure>
                <img
                  src={directusAsset(secondaryId, { width: 800, quality: 85, format: 'webp' })}
                  alt={item.alt || ''}
                  className="w-full h-auto rounded-xl shadow-lg"
                  loading="lazy"
                />
              </figure>
            )}
          </div>
          {item.caption && (
            <p className="text-center text-sm text-gray-600 italic mb-6">
              {item.caption}
            </p>
          )}
          {textHtml && (
            <article
              className={`prose prose-lg max-w-none
                prose-headings:font-['Playfair_Display'] ${isDark ? 'prose-headings:text-white' : 'prose-headings:text-[#2A4759]'}
                ${isDark ? 'prose-p:text-gray-200' : 'prose-p:text-gray-700'} prose-p:leading-relaxed
                prose-a:text-[#D67C4A] prose-a:no-underline hover:prose-a:underline`}
              dangerouslySetInnerHTML={{ __html: textHtml }}
            />
          )}
        </div>
      </div>
    );
  }

  // Three images layout
  if (item.layout === 'three-images') {
    return (
      <div
        className={`${spacingTop} ${spacingBottom} ${background}`}
        data-testid={`block-content-section-${index}`}
        {...directusAttr}
      >
        <div className={`mx-auto px-4 ${maxWidth}`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {primaryId && (
              <figure>
                <img
                  src={directusAsset(primaryId, { width: 600, quality: 85, format: 'webp' })}
                  alt={item.alt || ''}
                  className="w-full h-auto rounded-xl shadow-lg"
                  loading="lazy"
                />
              </figure>
            )}
            {secondaryId && (
              <figure>
                <img
                  src={directusAsset(secondaryId, { width: 600, quality: 85, format: 'webp' })}
                  alt={item.alt || ''}
                  className="w-full h-auto rounded-xl shadow-lg"
                  loading="lazy"
                />
              </figure>
            )}
            {thirdId && (
              <figure>
                <img
                  src={directusAsset(thirdId, { width: 600, quality: 85, format: 'webp' })}
                  alt={item.alt || ''}
                  className="w-full h-auto rounded-xl shadow-lg"
                  loading="lazy"
                />
              </figure>
            )}
          </div>
          {item.caption && (
            <p className="text-center text-sm text-gray-600 italic mb-6">
              {item.caption}
            </p>
          )}
          {textHtml && (
            <article
              className={`prose prose-lg max-w-none
                prose-headings:font-['Playfair_Display'] ${isDark ? 'prose-headings:text-white' : 'prose-headings:text-[#2A4759]'}
                ${isDark ? 'prose-p:text-gray-200' : 'prose-p:text-gray-700'} prose-p:leading-relaxed
                prose-a:text-[#D67C4A] prose-a:no-underline hover:prose-a:underline`}
              dangerouslySetInnerHTML={{ __html: textHtml }}
            />
          )}
        </div>
      </div>
    );
  }

  // Image-left or Image-right layout
  if (item.layout === 'image-left' || item.layout === 'image-right') {
    const mediaWidth = mediaWidthMap[item.media_width || '50'];
    const alignClass = item.media_align === 'center' ? 'mx-auto' : item.media_align === 'right' ? 'ml-auto' : 'mr-auto';
    const isLeft = item.layout === 'image-left';
    
    return (
      <div
        className={`${spacingTop} ${spacingBottom} ${background}`}
        data-testid={`block-content-section-${index}`}
        {...directusAttr}
      >
        <div className={`mx-auto px-4 ${maxWidth}`}>
          <div className={`flex flex-col ${isLeft ? 'md:flex-row' : 'md:flex-row-reverse'} gap-8 items-start`}>
            {/* Image */}
            {primaryId && (
              <figure className={`${mediaWidth} flex-shrink-0`}>
                <img
                  src={directusAsset(primaryId, { width: 1000, quality: 85, format: 'webp' })}
                  alt={item.alt || ''}
                  className={`w-full h-auto rounded-xl shadow-lg ${alignClass}`}
                  loading="lazy"
                />
                {item.caption && (
                  <figcaption className="mt-3 text-sm text-gray-600 italic text-center">
                    {item.caption}
                  </figcaption>
                )}
              </figure>
            )}
            
            {/* Text */}
            {textHtml && (
              <div className="flex-1 min-w-0">
                <article
                  className={`prose prose-lg max-w-none
                    prose-headings:font-['Playfair_Display'] ${isDark ? 'prose-headings:text-white' : 'prose-headings:text-[#2A4759]'}
                    ${isDark ? 'prose-p:text-gray-200' : 'prose-p:text-gray-700'} prose-p:leading-relaxed
                    prose-a:text-[#D67C4A] prose-a:no-underline hover:prose-a:underline
                    ${isDark ? 'prose-strong:text-white' : 'prose-strong:text-[#2A4759]'}`}
                  dangerouslySetInnerHTML={{ __html: textHtml }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
