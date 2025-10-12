import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, Link, useParams } from 'wouter';
import { Helmet } from 'react-helmet-async';
import { BlockRenderer } from '@/components/blog/BlockRenderer';
import { DEFAULT_OG, DEFAULT_OG_FR } from '@/constants/seo';
import { directusAsset } from '@/constants/directus';
import DOMPurify from 'dompurify';

function rewriteBodyImages(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;

  div.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src') || '';
    const m = src.match(/https?:\/\/cms\.memopyk\.org\/assets\/([a-f0-9-]+)/i);
    if (!m) return;
    
    const id = m[1];
    const base = `https://cms.memopyk.org/assets/${id}`;
    const mk = (w: number) => `${base}?width=${w}&fit=inside&quality=82&format=webp`;

    img.setAttribute('src', mk(828));
    img.setAttribute('srcset', [
      `${mk(640)} 640w`,
      `${mk(828)} 828w`,
      `${mk(1200)} 1200w`,
    ].join(', '));
    img.setAttribute('sizes', '(max-width: 768px) 100vw, 90vw');
    img.setAttribute('loading', 'lazy');
    img.setAttribute('decoding', 'async');

    const style = img.getAttribute('style') || '';
    if (!/max-width/i.test(style)) {
      img.setAttribute('style', `${style};max-width:100%;height:auto;`.trim());
    }
  });

  return div.innerHTML;
}

interface Author {
  id: string;
  name: string;
  avatar?: string;
  bio?: string;
}

interface PostContent {
  blocks?: Array<{
    type: string;
    content?: string | any;
    level?: number;
    url?: string;
    alt?: string;
    caption?: string;
    items?: string[];
  }>;
}

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string | PostContent;
  body_html?: string;
  language: string;
  author?: Author;
  status: string;
  publish_date: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  canonical_url?: string;
  og_image_url?: string;
  og_description?: string;
  featured_image_url?: string;
  featured_image_alt?: string;
  reading_time_minutes?: number;
}

export default function BlogPostPage() {
  const [location] = useLocation();
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const languageCode = location.includes('/fr-FR') ? 'fr-FR' : 'en-US';
  const language = languageCode === 'fr-FR' ? 'fr' : 'en';

  const { data: post, isLoading } = useQuery<Post | null>({
    queryKey: ['/api/blog/post', slug, languageCode],
    queryFn: async () => {
      const response = await fetch(`/api/blog/posts/${slug}?language=${languageCode}`);
      if (response.status === 404) return null;
      if (!response.ok) throw new Error('Failed to fetch post');
      return response.json();
    }
  });

  const inVisualEditingMode = typeof window !== 'undefined' && window.location.search.includes('ve=1');

  useEffect(() => {
    if (!inVisualEditingMode) return;
    
    import('@/lib/visualEditing').then(m => m.applyVisualEditing());
  }, [inVisualEditingMode]);

  const t = {
    'fr-FR': {
      backToBlog: 'Retour au blog',
      notFound: 'Article non trouvé',
      notFoundDescription: 'L\'article que vous recherchez n\'existe pas ou a été supprimé.',
      readingTime: 'min de lecture'
    },
    'en-US': {
      backToBlog: 'Back to blog',
      notFound: 'Article not found',
      notFoundDescription: 'The article you are looking for does not exist or has been removed.',
      readingTime: 'min read'
    }
  }[languageCode];

  const blogRoute = language === 'fr' ? '/fr-FR/blog' : '/en-US/blog';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F2EBDC]">
        <header className="bg-[#2A4759] text-white py-6">
          <div className="container mx-auto px-4">
            <Link href={blogRoute} data-testid="link-back-to-blog">
              <span className="text-[#D67C4A] hover:text-[#F2EBDC] transition-colors cursor-pointer">
                ← {t.backToBlog}
              </span>
            </Link>
          </div>
        </header>
        <main className="container mx-auto px-4 py-12">
          <div className="animate-pulse">
            <div className="h-12 bg-gray-300 rounded mb-6 max-w-2xl"></div>
            <div className="h-6 bg-gray-300 rounded mb-4 max-w-xs"></div>
            <div className="h-96 bg-gray-300 rounded mb-8"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-300 rounded"></div>
              <div className="h-4 bg-gray-300 rounded"></div>
              <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!post) {
    return (
      <>
        <Helmet>
          <title>{t.notFound} | MEMOPYK</title>
        </Helmet>
        <div className="min-h-screen bg-[#F2EBDC]">
          <header className="bg-[#2A4759] text-white py-6">
            <div className="container mx-auto px-4">
              <Link href={blogRoute} data-testid="link-back-to-blog">
                <span className="text-[#D67C4A] hover:text-[#F2EBDC] transition-colors cursor-pointer">
                  ← {t.backToBlog}
                </span>
              </Link>
            </div>
          </header>
          <main className="container mx-auto px-4 py-12 text-center">
            <h1 className="text-4xl font-['Playfair_Display'] text-[#2A4759] mb-4" data-testid="text-not-found-title">
              {t.notFound}
            </h1>
            <p className="text-gray-700" data-testid="text-not-found-description">{t.notFoundDescription}</p>
          </main>
        </div>
      </>
    );
  }

  const defaultOg = languageCode === 'fr-FR' ? DEFAULT_OG_FR : DEFAULT_OG;
  
  const seoTitle = post.meta_title || post.title;
  const seoDescription = post.meta_description || post.excerpt || "";
  const seoKeywords = post.meta_keywords;
  
  function resolveHero(raw?: string | null, width?: number) {
    if (!raw) return null;
    if (raw.includes('REPLACE') || raw.startsWith('[')) return null;
    return directusAsset(raw, { ...(width ? { width } : {}), quality: 82, fit: 'inside' });
  }

  const heroUrl =
    resolveHero(post.featured_image_url) ??
    resolveHero(post.og_image_url) ??
    defaultOg.url;

  const heroSrcSet = post.featured_image_url || post.og_image_url
    ? [640, 828, 1200, 1920]
        .map(w => `${resolveHero(post.featured_image_url || post.og_image_url, w)} ${w}w`)
        .join(', ')
    : undefined;

  const ogUrl =
    resolveHero(post.og_image_url) ??
    resolveHero(post.featured_image_url) ??
    defaultOg.url;

  return (
    <>
      <Helmet>
        <title>{seoTitle} | MEMOPYK</title>
        <meta name="description" content={seoDescription} />
        {seoKeywords && <meta name="keywords" content={seoKeywords} />}
        {post.canonical_url && <link rel="canonical" href={post.canonical_url} />}
        
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={post.og_description || seoDescription} />
        <meta property="og:image" content={ogUrl} />
        <meta property="og:image:width" content={String(defaultOg.width)} />
        <meta property="og:image:height" content={String(defaultOg.height)} />
        <meta property="og:type" content="article" />
        <meta property="article:published_time" content={post.publish_date} />
        
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seoTitle} />
        <meta name="twitter:description" content={post.og_description || seoDescription} />
        <meta name="twitter:image" content={ogUrl} />
      </Helmet>

      <div className="min-h-screen bg-[#F2EBDC]">
        <header className="bg-[#2A4759] text-white py-6">
          <div className="container mx-auto px-4">
            <Link href={blogRoute} data-testid="link-back-to-blog">
              <span className="text-[#D67C4A] hover:text-[#F2EBDC] transition-colors cursor-pointer">
                ← {t.backToBlog}
              </span>
            </Link>
          </div>
        </header>

        <article className="pb-12">
          {heroUrl && (
            <div className="w-full">
              <div className="mx-auto max-w-screen-xl px-4">
                <div className="relative w-full aspect-[16/9] max-h-[70vh] bg-gray-100 rounded-xl overflow-hidden">
                  <img
                    src={heroUrl}
                    srcSet={heroSrcSet}
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 90vw, 1200px"
                    alt={post.featured_image_alt || post.title}
                    loading="eager"
                    decoding="async"
                    className="w-full h-full object-contain"
                    data-testid="img-post-featured"
                  />
                </div>
              </div>
            </div>
          )}

          <header className="bg-white py-12 mb-8 shadow-sm">
            <div className="container mx-auto px-4 max-w-4xl">
              <h1
                className="text-4xl md:text-5xl font-['Playfair_Display'] text-[#2A4759] mb-4"
                data-testid="text-post-title"
              >
                {post.title}
              </h1>
              <div className="flex items-center gap-4 text-gray-600 flex-wrap">
                {post.publish_date && (
                  <time dateTime={post.publish_date} data-testid="text-post-date">
                    {new Date(post.publish_date).toLocaleDateString(
                      languageCode === 'fr-FR' ? 'fr-FR' : 'en-US',
                      { year: 'numeric', month: 'long', day: 'numeric' }
                    )}
                  </time>
                )}
                {post.author && typeof post.author === 'object' && post.author.name && (
                  <>
                    <span>•</span>
                    <span data-testid="text-post-author">{post.author.name}</span>
                  </>
                )}
                {post.reading_time_minutes && (
                  <>
                    <span>•</span>
                    <span data-testid="text-reading-time">{post.reading_time_minutes} {t.readingTime}</span>
                  </>
                )}
              </div>
            </div>
          </header>

          <div className="container mx-auto px-4 max-w-4xl">
            <div
              className="bg-white p-8 md:p-12 rounded-lg shadow-sm"
              data-testid="post-content"
            >
              {post.body_html ? (
                <article
                  className="prose prose-lg max-w-none
                    prose-headings:font-['Playfair_Display'] prose-headings:text-[#2A4759]
                    prose-p:text-gray-700 prose-p:leading-relaxed
                    prose-a:text-[#D67C4A] prose-a:no-underline hover:prose-a:underline
                    prose-strong:text-[#2A4759]
                    prose-img:rounded-lg prose-img:shadow-lg prose-img:max-w-full prose-img:h-auto
                    prose-blockquote:border-l-4 prose-blockquote:border-[#D67C4A] prose-blockquote:italic"
                  dangerouslySetInnerHTML={{ __html: rewriteBodyImages(DOMPurify.sanitize(post.body_html)) }}
                />
              ) : typeof post.content === 'object' && post.content.blocks ? (
                <BlockRenderer blocks={post.content.blocks} />
              ) : (
                <div
                  className="prose prose-lg max-w-none
                    prose-headings:font-['Playfair_Display'] prose-headings:text-[#2A4759]
                    prose-p:text-gray-700 prose-p:leading-relaxed
                    prose-a:text-[#D67C4A] prose-a:no-underline hover:prose-a:underline
                    prose-strong:text-[#2A4759]
                    prose-img:rounded-lg prose-img:shadow-lg
                    prose-blockquote:border-l-4 prose-blockquote:border-[#D67C4A] prose-blockquote:italic"
                  dangerouslySetInnerHTML={{ __html: typeof post.content === 'string' ? post.content : '' }}
                />
              )}
            </div>
          </div>
        </article>
      </div>
    </>
  );
}
