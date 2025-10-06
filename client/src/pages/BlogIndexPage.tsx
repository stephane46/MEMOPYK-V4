import { useQuery } from '@tanstack/react-query';
import { useLocation, Link } from 'wouter';
import { Helmet } from 'react-helmet-async';
import directus from '@/lib/directus';
import { readItems } from '@directus/sdk';
import type { Post } from '@/lib/directus';

export default function BlogIndexPage() {
  const [location] = useLocation();
  const languageCode = location.includes('/fr-FR') ? 'fr-FR' : 'en-US';
  const language = languageCode === 'fr-FR' ? 'fr' : 'en';

  const { data: posts, isLoading } = useQuery<Post[]>({
    queryKey: ['/api/blog/posts', languageCode],
    queryFn: async () => {
      const response = await directus.request(
        readItems('posts', {
          filter: {
            status: { _eq: 'published' },
            language: { _eq: languageCode }
          },
          sort: ['-publish_date'],
          fields: ['*', { author: ['name', 'avatar'] }] as any
        })
      );
      return response as unknown as Post[];
    }
  });

  const t = {
    'fr-FR': {
      title: 'Blog MEMOPYK',
      description: 'Découvrez nos derniers articles sur les films souvenirs et la préservation des mémoires',
      readMore: 'Lire la suite',
      backHome: 'Retour à l\'accueil',
      noPosts: 'Aucun article disponible pour le moment'
    },
    'en-US': {
      title: 'MEMOPYK Blog',
      description: 'Discover our latest articles about memory films and preserving your memories',
      readMore: 'Read more',
      backHome: 'Back to home',
      noPosts: 'No articles available at the moment'
    }
  }[languageCode];

  const homeRoute = language === 'fr' ? '/fr-FR' : '/en-US';
  const blogRoute = language === 'fr' ? '/fr-FR/blog' : '/en-US/blog';

  return (
    <>
      <Helmet>
        <title>{t.title} | MEMOPYK</title>
        <meta name="description" content={t.description} />
        <meta property="og:title" content={`${t.title} | MEMOPYK`} />
        <meta property="og:description" content={t.description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://memopyk.org${blogRoute}`} />
      </Helmet>

      <div className="min-h-screen bg-[#F2EBDC]">
        <header className="bg-[#2A4759] text-white py-8">
          <div className="container mx-auto px-4">
            <Link href={homeRoute} data-testid="link-home">
              <span className="text-[#D67C4A] hover:text-[#F2EBDC] transition-colors cursor-pointer">
                ← {t.backHome}
              </span>
            </Link>
            <h1 className="text-4xl md:text-5xl font-['Playfair_Display'] mt-4" data-testid="text-blog-title">
              {t.title}
            </h1>
            <p className="text-[#89BAD9] mt-2 text-lg" data-testid="text-blog-description">
              {t.description}
            </p>
          </div>
        </header>

        <main className="container mx-auto px-4 py-12">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white rounded-lg shadow-lg overflow-hidden animate-pulse">
                  <div className="w-full h-64 bg-gray-300"></div>
                  <div className="p-6">
                    <div className="h-6 bg-gray-300 rounded mb-4"></div>
                    <div className="h-4 bg-gray-300 rounded mb-2"></div>
                    <div className="h-4 bg-gray-300 rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : posts && posts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`${blogRoute}/${post.slug}`}
                  data-testid={`card-blog-post-${post.slug}`}
                >
                  <article className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer h-full flex flex-col">
                    {post.featured_image_url && (
                      <img
                        src={post.featured_image_url}
                        alt={post.featured_image_alt || post.title}
                        className="w-full h-64 object-cover"
                        data-testid={`img-blog-featured-${post.slug}`}
                      />
                    )}
                    <div className="p-6 flex-1 flex flex-col">
                      <h2
                        className="text-2xl font-['Playfair_Display'] text-[#2A4759] mb-3"
                        data-testid={`text-blog-title-${post.slug}`}
                      >
                        {post.title}
                      </h2>
                      <p className="text-gray-700 mb-4 flex-1" data-testid={`text-blog-excerpt-${post.slug}`}>
                        {post.excerpt}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500" data-testid={`text-blog-date-${post.slug}`}>
                          {new Date(post.publish_date).toLocaleDateString(
                            languageCode === 'fr-FR' ? 'fr-FR' : 'en-US',
                            { year: 'numeric', month: 'long', day: 'numeric' }
                          )}
                        </span>
                        <span className="text-[#D67C4A] font-semibold" data-testid={`link-read-more-${post.slug}`}>
                          {t.readMore} →
                        </span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-2xl text-[#2A4759]" data-testid="text-no-posts">{t.noPosts}</p>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
