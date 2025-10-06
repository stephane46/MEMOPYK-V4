import { useQuery } from '@tanstack/react-query';
import { useLocation, Link, useParams } from 'wouter';
import { Helmet } from 'react-helmet-async';
import directus from '@/lib/directus';
import { readItems } from '@directus/sdk';
import type { Post } from '@/lib/directus';

export default function BlogPostPage() {
  const [location] = useLocation();
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const languageCode = location.includes('/fr-FR') ? 'fr-FR' : 'en-US';
  const language = languageCode === 'fr-FR' ? 'fr' : 'en';

  const { data: post, isLoading } = useQuery<Post | null>({
    queryKey: ['/api/blog/post', slug, languageCode],
    queryFn: async () => {
      const response = await directus.request(
        readItems('posts', {
          filter: {
            slug: { _eq: slug },
            status: { _eq: 'published' },
            language: { _eq: languageCode }
          },
          fields: ['*', { author: ['name', 'avatar', 'bio'] }] as any,
          limit: 1
        })
      );
      
      if (!response || response.length === 0) {
        return null;
      }
      
      return response[0] as unknown as Post;
    }
  });

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

  const seoTitle = post.meta_title || post.title;
  const seoDescription = post.meta_description || post.excerpt;
  const seoKeywords = post.meta_keywords;
  const ogImage = post.og_image_url || post.featured_image_url;

  return (
    <>
      <Helmet>
        <title>{seoTitle} | MEMOPYK</title>
        <meta name="description" content={seoDescription || ''} />
        {seoKeywords && <meta name="keywords" content={seoKeywords} />}
        {post.canonical_url && <link rel="canonical" href={post.canonical_url} />}
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={post.og_description || seoDescription || ''} />
        {ogImage && <meta property="og:image" content={ogImage} />}
        <meta property="og:type" content="article" />
        <meta property="article:published_time" content={post.publish_date} />
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
          {post.featured_image_url && (
            <div className="w-full h-[400px] md:h-[500px] overflow-hidden">
              <img
                src={post.featured_image_url}
                alt={post.featured_image_alt || post.title}
                className="w-full h-full object-cover"
                data-testid="img-post-featured"
              />
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
              className="prose prose-lg max-w-none
                prose-headings:font-['Playfair_Display'] prose-headings:text-[#2A4759]
                prose-p:text-gray-700 prose-p:leading-relaxed
                prose-a:text-[#D67C4A] prose-a:no-underline hover:prose-a:underline
                prose-strong:text-[#2A4759]
                prose-img:rounded-lg prose-img:shadow-lg
                prose-blockquote:border-l-4 prose-blockquote:border-[#D67C4A] prose-blockquote:italic
                bg-white p-8 rounded-lg shadow-sm"
              dangerouslySetInnerHTML={{ __html: post.content }}
              data-testid="post-content"
            />
          </div>
        </article>
      </div>
    </>
  );
}
