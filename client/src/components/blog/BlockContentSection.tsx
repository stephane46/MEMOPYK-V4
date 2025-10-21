import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { directusAsset } from '@/constants/directus';
import { setAttr } from '@directus/visual-editing';

// Enable GFM (GitHub Flavored Markdown) for tables
marked.setOptions({
  gfm: true,
  breaks: false,
});

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
  gutter?: number | null;
  corner_radius?: number | null;
  image_shadow?: boolean | null;
  block_shadow?: boolean | null;
  caption_align?: "left" | "center" | "right" | null;
  caption_position?: "above" | "below" | "overlay" | null;
  caption_bg?: "none" | "light" | "dark" | null;
  image_fit?: "natural" | "cover" | "contain" | null;
  image_height?: number | null;
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
  
  // Read gutter and corner_radius fields for grid layouts
  const gutter = Number(item.gutter ?? 24);
  const cornerRadius = Number(item.corner_radius ?? 12);
  
  // Read shadow and caption controls
  const imgShadow = !!item.image_shadow;
  const blkShadow = !!item.block_shadow;
  const capAlign = item.caption_align ?? 'left';
  const capPos = item.caption_position ?? 'below';
  const capBg = item.caption_bg ?? 'dark';
  
  // Read image sizing controls
  const imageFit = item.image_fit ?? 'natural';
  const imageHeight = Number(item.image_height ?? 400);
  
  // CSS variables for grid layouts
  const gridStyleVars = {
    '--gutter': `${gutter}px`,
    '--radius': `${cornerRadius}px`,
    '--tile-h': imageFit !== 'natural' ? `${imageHeight}px` : 'auto',
  } as React.CSSProperties;
  
  // Container classes
  const containerCls = [
    'bcs',
    blkShadow ? 'bcs--shadow' : null
  ].filter(Boolean).join(' ');
  
  // Caption classes
  const captionCls = [
    'bcs-caption',
    capAlign === 'center' ? 'bcs-caption--center' :
    capAlign === 'right' ? 'bcs-caption--right' : 'bcs-caption--left',
    capPos === 'overlay' ? 'bcs-caption--overlay' : null,
    capPos === 'above' ? 'bcs-caption--above' : 'bcs-caption--below',
    capPos === 'overlay' && capBg === 'light' ? 'bcs-caption--bg-light' : null,
    capPos === 'overlay' && capBg === 'dark' ? 'bcs-caption--bg-dark' : null
  ].filter(Boolean).join(' ');
  
  // Image shadow class
  const imgShadowCls = imgShadow ? 'tile--shadow' : '';

  const directusAttr = item.id ? setAttr({
    collection: "block_content_section_v3",
    item: item.id,
    fields: "layout,text,image_primary,image_secondary,image_third,media_width,media_align,max_width,spacing_top,spacing_bottom,background,caption,alt,image_fit,image_height,gutter,corner_radius,image_shadow,block_shadow,caption_align,caption_position,caption_bg",
    mode: "drawer",
  }) : {};
  
  // Helper to get image URL with proper transforms
  const getImageUrl = (fileId: string | null, options: { width?: number } = {}) => {
    if (!fileId) return null;
    const width = options.width || 1600;
    
    if (imageFit === 'natural') {
      return directusAsset(fileId, { width, quality: 80, format: 'webp' });
    } else if (imageFit === 'cover') {
      // Build URL manually for cover with height
      return `https://cms-blog.memopyk.org/assets/${fileId}?width=${width}&height=${imageHeight}&fit=cover&quality=80&format=webp`;
    } else if (imageFit === 'contain') {
      // Build URL manually for contain with height
      return `https://cms-blog.memopyk.org/assets/${fileId}?width=${width}&height=${imageHeight}&fit=inside&quality=80&format=webp`;
    }
    return directusAsset(fileId, { width, quality: 80, format: 'webp' });
  };
  
  // Helper to get tile classes based on image_fit
  const getTileClasses = (baseShadow = false) => {
    const classes = ['tile'];
    
    if (imageFit === 'cover') {
      classes.push('tile--cover');
    } else if (imageFit === 'contain') {
      classes.push('tile--contain');
    } else {
      classes.push('tile--natural');
    }
    
    if (baseShadow && imgShadow) {
      classes.push('tile--shadow');
    }
    
    return classes.join(' ');
  };
  
  // Caption rendering helper
  const renderCaption = () => {
    if (!item.caption) return null;
    return (
      <div className={captionCls}>
        <span>{item.caption}</span>
      </div>
    );
  };

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
              className={`md-content prose prose-lg max-w-none
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
        className={`${spacingTop} ${spacingBottom} ${background} ${containerCls}`}
        data-testid={`block-content-section-${index}`}
        {...directusAttr}
      >
        <div className={`mx-auto px-4 ${maxWidth}`}>
          {capPos === 'above' && renderCaption()}
          {primaryId && (
            <figure className="mb-8">
              <div className={`img-wrap ${capPos === 'overlay' ? 'relative' : ''}`}>
                <img
                  src={directusAsset(primaryId, { width: 1600, quality: 85, format: 'webp' })}
                  alt={item.alt || ''}
                  className={`w-full h-auto rounded-xl ${imgShadowCls}`}
                  loading="lazy"
                />
                {capPos === 'overlay' && renderCaption()}
              </div>
            </figure>
          )}
          {capPos === 'below' && renderCaption()}
          {textHtml && (
            <article
              className={`md-content prose prose-lg max-w-none
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
        className={`${spacingTop} ${spacingBottom} ${background} ${containerCls}`}
        data-testid={`block-content-section-${index}`}
        {...directusAttr}
      >
        <div className={`mx-auto px-4 ${maxWidth}`}>
          {capPos === 'above' && renderCaption()}
          <div 
            className="grid grid-cols-1 md:grid-cols-2 mb-8"
            style={gridStyleVars}
          >
            {primaryId && (
              <figure>
                <div className={`img-wrap ${capPos === 'overlay' ? 'relative' : ''}`}>
                  <img
                    src={getImageUrl(primaryId, { width: 800 })!}
                    alt={item.alt || ''}
                    className={getTileClasses(true)}
                    loading="lazy"
                  />
                  {capPos === 'overlay' && renderCaption()}
                </div>
              </figure>
            )}
            {secondaryId && (
              <figure>
                <img
                  src={getImageUrl(secondaryId, { width: 800 })!}
                  alt={item.alt || ''}
                  className={getTileClasses(true)}
                  loading="lazy"
                />
              </figure>
            )}
          </div>
          {capPos === 'below' && renderCaption()}
          {textHtml && (
            <article
              className={`md-content prose prose-lg max-w-none
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
        className={`${spacingTop} ${spacingBottom} ${background} ${containerCls}`}
        data-testid={`block-content-section-${index}`}
        {...directusAttr}
      >
        <div className={`mx-auto px-4 ${maxWidth}`}>
          {capPos === 'above' && renderCaption()}
          <div 
            className="grid grid-cols-1 md:grid-cols-3 mb-8"
            style={gridStyleVars}
          >
            {primaryId && (
              <figure>
                <div className={`img-wrap ${capPos === 'overlay' ? 'relative' : ''}`}>
                  <img
                    src={getImageUrl(primaryId, { width: 600 })!}
                    alt={item.alt || ''}
                    className={getTileClasses(true)}
                    loading="lazy"
                  />
                  {capPos === 'overlay' && renderCaption()}
                </div>
              </figure>
            )}
            {secondaryId && (
              <figure>
                <img
                  src={getImageUrl(secondaryId, { width: 600 })!}
                  alt={item.alt || ''}
                  className={getTileClasses(true)}
                  loading="lazy"
                />
              </figure>
            )}
            {thirdId && (
              <figure>
                <img
                  src={getImageUrl(thirdId, { width: 600 })!}
                  alt={item.alt || ''}
                  className={getTileClasses(true)}
                  loading="lazy"
                />
              </figure>
            )}
          </div>
          {capPos === 'below' && renderCaption()}
          {textHtml && (
            <article
              className={`md-content prose prose-lg max-w-none
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
        className={`${spacingTop} ${spacingBottom} ${background} ${containerCls}`}
        data-testid={`block-content-section-${index}`}
        {...directusAttr}
      >
        <div className={`mx-auto px-4 ${maxWidth}`}>
          <div className={`flex flex-col ${isLeft ? 'md:flex-row' : 'md:flex-row-reverse'} gap-8 items-start`}>
            {/* Image */}
            {primaryId && (
              <figure className={`${mediaWidth} flex-shrink-0`}>
                {capPos === 'above' && renderCaption()}
                <div className={`img-wrap ${capPos === 'overlay' ? 'relative' : ''}`}>
                  <img
                    src={directusAsset(primaryId, { width: 1000, quality: 85, format: 'webp' })}
                    alt={item.alt || ''}
                    className={`w-full h-auto rounded-xl ${imgShadowCls} ${alignClass}`}
                    loading="lazy"
                  />
                  {capPos === 'overlay' && renderCaption()}
                </div>
                {capPos === 'below' && renderCaption()}
              </figure>
            )}
            
            {/* Text */}
            {textHtml && (
              <div className="flex-1 min-w-0">
                <article
                  className={`md-content prose prose-lg max-w-none
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
