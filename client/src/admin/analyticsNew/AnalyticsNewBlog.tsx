import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAnalyticsNewFilters } from './analyticsNewFilters.store';
import { AnalyticsNewLoadingStates } from './AnalyticsNewLoadingStates';
import { formatDistanceToNow } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { Eye } from 'lucide-react';

interface PopularBlogPost {
  post_slug: string;
  post_title: string;
  language: string;
  view_count: number;
  last_viewed: string;
}

export const AnalyticsNewBlog: React.FC = () => {
  const { selectedPeriod } = useAnalyticsNewFilters();
  
  // Map period to days
  const days = selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 90;

  const { data: popularPosts, isLoading, error } = useQuery<PopularBlogPost[]>({
    queryKey: ['/api/analytics/blog/popular', { days }],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/blog/popular?days=${days}`);
      if (!response.ok) throw new Error('Failed to fetch popular blog posts');
      return response.json();
    }
  });

  if (isLoading) {
    return (
      <div className="analytics-new-container space-y-6">
        <h2 className="text-xl font-bold text-gray-900">Blog Analytics</h2>
        <AnalyticsNewLoadingStates mode="loading" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-new-container space-y-6">
        <h2 className="text-xl font-bold text-gray-900">Blog Analytics</h2>
        <AnalyticsNewLoadingStates 
          mode="error" 
          title="Failed to load blog analytics"
          description="There was an error loading blog post views"
        />
      </div>
    );
  }

  if (!popularPosts || popularPosts.length === 0) {
    return (
      <div className="analytics-new-container space-y-6">
        <h2 className="text-xl font-bold text-gray-900">Blog Analytics</h2>
        <AnalyticsNewLoadingStates 
          mode="empty" 
          title="No blog post views yet"
          description={`No blog posts have been viewed in the last ${days} days`}
        />
      </div>
    );
  }

  const formatLastViewed = (dateString: string) => {
    const date = new Date(dateString);
    const locale = fr; // Use French locale for consistency
    return formatDistanceToNow(date, { addSuffix: true, locale });
  };

  return (
    <div className="analytics-new-container space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Blog Analytics</h2>
        <div className="text-sm text-gray-600">
          Last {days} days
        </div>
      </div>

      {/* Popular Posts Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900">Popular Blog Posts</h3>
          <p className="text-sm text-gray-600 mt-1">
            Most viewed blog posts ranked by total views
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Post Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Language
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Views
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Last Viewed
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {popularPosts.map((post, index) => (
                <tr 
                  key={post.post_slug}
                  className="hover:bg-gray-50 transition-colors"
                  data-testid={`blog-post-${post.post_slug}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className={`
                        inline-flex items-center justify-center h-8 w-8 rounded-full text-sm font-bold
                        ${index === 0 ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${index === 1 ? 'bg-gray-200 text-gray-800' : ''}
                        ${index === 2 ? 'bg-orange-100 text-orange-800' : ''}
                        ${index > 2 ? 'bg-gray-100 text-gray-600' : ''}
                      `}>
                        {index + 1}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-start">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {post.post_title}
                        </p>
                        <p className="text-xs text-gray-500 truncate mt-1">
                          /{post.language}/blog/{post.post_slug}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {post.language === 'en-US' ? 'EN' : 'FR'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Eye className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-semibold text-gray-900">
                        {post.view_count}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                    {formatLastViewed(post.last_viewed)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Total unique posts: <span className="font-semibold text-gray-900">{popularPosts.length}</span>
            </span>
            <span className="text-gray-600">
              Total views: <span className="font-semibold text-gray-900">
                {popularPosts.reduce((sum, post) => sum + post.view_count, 0)}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
