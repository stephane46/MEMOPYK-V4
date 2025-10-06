import type { Block } from '@/lib/directus';

interface BlockRendererProps {
  block: Block;
  language: 'fr' | 'en';
}

export default function BlockRenderer({ block, language }: BlockRendererProps) {
  const blockType = block.block_type;
  const content = block.content || {};

  switch (blockType) {
    case 'hero_block':
      return (
        <div className="relative w-full h-[500px] mb-8 overflow-hidden rounded-lg shadow-xl">
          {content.image && (
            <img
              src={`https://cms.memopyk.org/assets/${content.image}`}
              alt={content[`title_${language}`] || ''}
              className="w-full h-full object-cover"
              data-testid={`img-hero-block-${block.id}`}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
            <div className="p-8 text-white max-w-4xl">
              {content[`title_${language}`] && (
                <h2
                  className="text-4xl md:text-5xl font-['Playfair_Display'] mb-4"
                  data-testid={`text-hero-title-${block.id}`}
                >
                  {content[`title_${language}`]}
                </h2>
              )}
              {content[`subtitle_${language}`] && (
                <p className="text-xl" data-testid={`text-hero-subtitle-${block.id}`}>
                  {content[`subtitle_${language}`]}
                </p>
              )}
            </div>
          </div>
        </div>
      );

    case 'text_block':
      return (
        <div className="max-w-4xl mx-auto mb-8 bg-white p-8 rounded-lg shadow-sm" data-testid={`block-text-${block.id}`}>
          {content[`heading_${language}`] && (
            <h2
              className="text-3xl font-['Playfair_Display'] text-[#2A4759] mb-6"
              data-testid={`text-heading-${block.id}`}
            >
              {content[`heading_${language}`]}
            </h2>
          )}
          {content[`content_${language}`] && (
            <div
              className="prose prose-lg max-w-none text-gray-700"
              dangerouslySetInnerHTML={{ __html: content[`content_${language}`] }}
              data-testid={`text-content-${block.id}`}
            />
          )}
        </div>
      );

    case 'photo_block':
      return (
        <div className="max-w-4xl mx-auto mb-8" data-testid={`block-photo-${block.id}`}>
          {content.image && (
            <figure className="rounded-lg overflow-hidden shadow-lg">
              <img
                src={`https://cms.memopyk.org/assets/${content.image}`}
                alt={content[`caption_${language}`] || ''}
                className="w-full h-auto"
                data-testid={`img-photo-${block.id}`}
              />
              {content[`caption_${language}`] && (
                <figcaption
                  className="bg-white p-4 text-gray-600 text-center italic"
                  data-testid={`text-caption-${block.id}`}
                >
                  {content[`caption_${language}`]}
                </figcaption>
              )}
            </figure>
          )}
        </div>
      );

    case 'photo_gallery_block':
      return (
        <div className="max-w-6xl mx-auto mb-8" data-testid={`block-gallery-${block.id}`}>
          {content[`title_${language}`] && (
            <h3
              className="text-2xl font-['Playfair_Display'] text-[#2A4759] mb-6 text-center"
              data-testid={`text-gallery-title-${block.id}`}
            >
              {content[`title_${language}`]}
            </h3>
          )}
          {content.images && Array.isArray(content.images) && content.images.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {content.images.map((imageId: string, index: number) => (
                <div key={index} className="rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow">
                  <img
                    src={`https://cms.memopyk.org/assets/${imageId}`}
                    alt={`${content[`title_${language}`] || 'Gallery image'} ${index + 1}`}
                    className="w-full h-64 object-cover"
                    data-testid={`img-gallery-${block.id}-${index}`}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      );

    case 'video_block':
      return (
        <div className="max-w-4xl mx-auto mb-8" data-testid={`block-video-${block.id}`}>
          {content[`title_${language}`] && (
            <h3
              className="text-2xl font-['Playfair_Display'] text-[#2A4759] mb-4"
              data-testid={`text-video-title-${block.id}`}
            >
              {content[`title_${language}`]}
            </h3>
          )}
          {content.video_url && (
            <div className="relative pt-[56.25%] rounded-lg overflow-hidden shadow-lg bg-black">
              <iframe
                src={content.video_url}
                title={content[`title_${language}`] || 'Video'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute top-0 left-0 w-full h-full"
                data-testid={`video-iframe-${block.id}`}
              />
            </div>
          )}
          {content[`caption_${language}`] && (
            <p className="mt-4 text-gray-600 text-center italic" data-testid={`text-video-caption-${block.id}`}>
              {content[`caption_${language}`]}
            </p>
          )}
        </div>
      );

    case 'cta_block':
      return (
        <div className="max-w-4xl mx-auto mb-8" data-testid={`block-cta-${block.id}`}>
          <div className="bg-gradient-to-r from-[#2A4759] to-[#011526] text-white p-8 md:p-12 rounded-lg shadow-xl text-center">
            {content[`heading_${language}`] && (
              <h3
                className="text-3xl font-['Playfair_Display'] mb-4"
                data-testid={`text-cta-heading-${block.id}`}
              >
                {content[`heading_${language}`]}
              </h3>
            )}
            {content[`text_${language}`] && (
              <p className="text-lg mb-6 text-[#89BAD9]" data-testid={`text-cta-text-${block.id}`}>
                {content[`text_${language}`]}
              </p>
            )}
            {content.button_url && content[`button_text_${language}`] && (
              <a
                href={content.button_url}
                className="inline-block bg-[#D67C4A] hover:bg-[#F2EBDC] hover:text-[#2A4759] text-white font-bold py-3 px-8 rounded-full transition-colors shadow-lg"
                data-testid={`button-cta-${block.id}`}
              >
                {content[`button_text_${language}`]}
              </a>
            )}
          </div>
        </div>
      );

    case 'testimonial_block':
      return (
        <div className="max-w-4xl mx-auto mb-8" data-testid={`block-testimonial-${block.id}`}>
          <div className="bg-white p-8 rounded-lg shadow-lg border-l-4 border-[#D67C4A]">
            {content[`quote_${language}`] && (
              <blockquote
                className="text-xl text-gray-700 italic mb-4"
                data-testid={`text-testimonial-quote-${block.id}`}
              >
                "{content[`quote_${language}`]}"
              </blockquote>
            )}
            <div className="flex items-center gap-4">
              {content.photo && (
                <img
                  src={`https://cms.memopyk.org/assets/${content.photo}`}
                  alt={content.author_name || ''}
                  className="w-16 h-16 rounded-full object-cover"
                  data-testid={`img-testimonial-photo-${block.id}`}
                />
              )}
              <div>
                {content.author_name && (
                  <p className="font-semibold text-[#2A4759]" data-testid={`text-testimonial-author-${block.id}`}>
                    {content.author_name}
                  </p>
                )}
                {content.author_title && (
                  <p className="text-sm text-gray-600" data-testid={`text-testimonial-title-${block.id}`}>
                    {content.author_title}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      );

    default:
      return (
        <div className="max-w-4xl mx-auto mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded" data-testid={`block-unknown-${block.id}`}>
          <p className="text-yellow-800">Unknown block type: {blockType}</p>
        </div>
      );
  }
}
