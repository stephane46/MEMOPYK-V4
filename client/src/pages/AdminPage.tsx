import { useLanguage } from '../contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';

export function AdminPage() {
  const { t, language } = useLanguage();

  // Fetch analytics dashboard data
  const { data: analytics, isLoading } = useQuery<{
    totalViews: number;
    totalSessions: number;
    avgSessionDuration: number;
    bounceRate: number;
    topPages: Array<{page: string; views: number; language: string}>;
    recentActivity: Array<{timestamp: string; action: string; page?: string; videoId?: number}>;
  }>({
    queryKey: ['/api/analytics/dashboard'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">{t('loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            {language === 'fr' ? 'Panneau d\'Administration' : 'Admin Dashboard'}
          </h1>
          <p className="text-gray-600 mt-2">
            {language === 'fr' ? 'Gérer le contenu et analyser les performances' : 'Manage content and analyze performance'}
          </p>
        </div>

        {/* Analytics Overview */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500 mb-2">
                {language === 'fr' ? 'Vues Totales' : 'Total Views'}
              </h3>
              <div className="text-2xl font-bold text-blue-600">{analytics.totalViews}</div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500 mb-2">
                {language === 'fr' ? 'Sessions' : 'Sessions'}
              </h3>
              <div className="text-2xl font-bold text-green-600">{analytics.totalSessions}</div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500 mb-2">
                {language === 'fr' ? 'Durée Moyenne' : 'Avg Duration'}
              </h3>
              <div className="text-2xl font-bold text-purple-600">{analytics.avgSessionDuration}s</div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500 mb-2">
                {language === 'fr' ? 'Taux de Rebond' : 'Bounce Rate'}
              </h3>
              <div className="text-2xl font-bold text-red-600">{Math.round(analytics.bounceRate * 100)}%</div>
            </div>
          </div>
        )}

        {/* Top Pages */}
        {analytics?.topPages && (
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-semibold">
                {language === 'fr' ? 'Pages Populaires' : 'Top Pages'}
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {analytics.topPages.slice(0, 5).map((page: any, index: number) => (
                  <div key={index} className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{page.page}</div>
                      <div className="text-sm text-gray-500">
                        {language === 'fr' ? 'Langue:' : 'Language:'} {page.language.toUpperCase()}
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-800">{page.views}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {analytics?.recentActivity && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-semibold">
                {language === 'fr' ? 'Activité Récente' : 'Recent Activity'}
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {analytics.recentActivity.map((activity: any, index: number) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                    <div>
                      <div className="font-medium capitalize">{activity.action.replace('_', ' ')}</div>
                      <div className="text-sm text-gray-500">{activity.page || activity.videoId}</div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(activity.timestamp).toLocaleDateString(language)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}