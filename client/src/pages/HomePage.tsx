import { useLanguage } from '../contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';

export function HomePage() {
  const { t, language } = useLanguage();

  // Fetch hero videos from API
  const { data: heroVideos, isLoading: videosLoading } = useQuery<any[]>({
    queryKey: ['/api/hero-videos'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch hero text content
  const { data: heroText, isLoading: textLoading } = useQuery<any[]>({
    queryKey: ['/api/hero-text', language],
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = videosLoading || textLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">{t('loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center text-white px-4">
          <h1 className="text-4xl md:text-6xl font-bold mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>
            {heroText?.[0]?.[`title_${language}`] || t('hero.title')}
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-gray-200">
            {heroText?.[0]?.[`subtitle_${language}`] || t('hero.subtitle')}
          </p>
          <div className="space-x-4">
            <button className="bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-lg font-semibold transition-colors">
              {language === 'fr' ? 'Découvrir' : 'Discover'}
            </button>
            <button className="border border-white hover:bg-white hover:text-slate-900 px-8 py-3 rounded-lg font-semibold transition-colors">
              {language === 'fr' ? 'Voir la Galerie' : 'View Gallery'}
            </button>
          </div>
        </div>

        {/* Video Background Placeholder */}
        {heroVideos && heroVideos.length > 0 && (
          <div className="absolute inset-0 -z-10 bg-black/40">
            <div className="text-center text-white/60 pt-20">
              <p className="text-sm">Hero videos loaded: {heroVideos.length}</p>
              <p className="text-xs mt-2">Video carousel implementation coming next</p>
            </div>
          </div>
        )}
      </section>

      {/* Quick Stats Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-8 text-gray-800">
            {language === 'fr' ? 'MEMOPYK en chiffres' : 'MEMOPYK in Numbers'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">100+</div>
              <div className="text-gray-600">
                {language === 'fr' ? 'Films créés' : 'Films Created'}
              </div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">500+</div>
              <div className="text-gray-600">
                {language === 'fr' ? 'Familles satisfaites' : 'Happy Families'}
              </div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">5★</div>
              <div className="text-gray-600">
                {language === 'fr' ? 'Note moyenne' : 'Average Rating'}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}