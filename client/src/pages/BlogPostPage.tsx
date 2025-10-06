import { useQuery } from '@tanstack/react-query';
import { useLocation, Link, useParams } from 'wouter';
import { Helmet } from 'react-helmet-async';
import directus from '@/lib/directus';
import { readItems } from '@directus/sdk';
import type { BlogPost } from '@/lib/directus';
import BlockRenderer from '@/components/blog/BlockRenderer';

export default function BlogPostPage() {
  const [location] = useLocation();
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const language = location.includes('/fr-FR') ? 'fr' : 'en';

  const { data: post, isLoading } = useQuery<BlogPost | null>({
    queryKey: ['/api/blog/post', slug],
    queryFn: async () => {
      const response = await directus.request(
        readItems('blog_posts', {
          filter: {
            slug: { _eq: slug },
            status: { _eq: 'published' }
          },
          fields: ['*', { blocks: ['*'] }] as any,
          limit: 1
        })
      );
      
      if (!response || response.length === 0) {
        return null;
      }
      
      return response[0] as unknown as BlogPost;
    }
  });

  const t = {
    fr: {
      backToBlog: 'Retour au blog',
      notFound: 'Article non trouvé',
      notFoundDescription: 'L\'article que vous recherchez n\'existe pas ou a été supprimé.'
    },
    en: {
      backToBlog: 'Back to blog',
      notFound: 'Article not found',
      notFoundDescription: 'The article you are looking for does not exist or has been removed.'
    }
  }[language];

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

  const title = language === 'fr' ? post.title_fr : post.title_en;
  const seoTitle = language === 'fr' ? (post.seo_title_fr || post.title_fr) : (post.seo_title_en || post.title_en);
  const seoDescription = language === 'fr' ? (post.seo_description_fr || post.excerpt_fr) : (post.seo_description_en || post.excerpt_en);
  const seoKeywords = language === 'fr' ? post.seo_keywords_fr : post.seo_keywords_en;

  const sortedBlocks = post.blocks ? [...post.blocks].sort((a, b) => a.sort - b.sort) : [];

  return (
    <>
      <Helmet>
        <title>{seoTitle} | MEMOPYK</title>
        <meta name="description" content={seoDescription || ''} />
        {seoKeywords && <meta name="keywords" content={seoKeywords} />}
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription || ''} />
        {post.featured_image && (
          <meta property="og:image" content={`https://cms.memopyk.org/assets/${post.featured_image}`} />
        )}
        <meta property="og:type" content="article" />
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
          <header className="bg-white py-12 mb-8 shadow-sm">
            <div className="container mx-auto px-4 max-w-4xl">
              <h1
                className="text-4xl md:text-5xl font-['Playfair_Display'] text-[#2A4759] mb-4"
                data-testid="text-post-title"
              >
                {title}
              </h1>
              <div className="flex items-center gap-4 text-gray-600">
                {post.published_date && (
                  <time dateTime={post.published_date} data-testid="text-post-date">
                    {new Date(post.published_date).toLocaleDateString(
                      language === 'fr' ? 'fr-FR' : 'en-US',
                      { year: 'numeric', month: 'long', day: 'numeric' }
                    )}
                  </time>
                )}
                {post.author && (
                  <>
                    <span>•</span>
                    <span data-testid="text-post-author">{post.author}</span>
                  </>
                )}
              </div>
            </div>
          </header>

          <div className="container mx-auto px-4">
            {sortedBlocks.map((block) => (
              <BlockRenderer key={block.id} block={block} language={language} />
            ))}
          </div>
        </article>
      </div>
    </>
  );
}
