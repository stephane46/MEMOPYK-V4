import React, { useState, useEffect } from 'react';
import { AnalyticsNewTabNavigation } from './AnalyticsNewTabNavigation';
import { AnalyticsNewGlobalFilters } from './AnalyticsNewGlobalFilters';
import { AnalyticsNewOverview } from './AnalyticsNewOverview';
import { AnalyticsNewLiveView } from './AnalyticsNewLiveView';
import { AnalyticsNewLoadingStates } from './AnalyticsNewLoadingStates';
import { AnalyticsNewVideo } from './AnalyticsNewVideo';
import DataSourceBadge from './components/DataSourceBadge';
import './analyticsNew.tokens.css';

// Placeholder components for other tabs

const AnalyticsNewGeo: React.FC = () => (
  <div className="analytics-new-container space-y-6">
    <h2 className="text-xl font-bold text-gray-900">Geographic Analytics</h2>
    <AnalyticsNewLoadingStates 
      mode="empty" 
      title="Geographic data coming soon"
      description="Visitor distribution by location will be displayed here"
    />
  </div>
);

const AnalyticsNewCta: React.FC = () => (
  <div className="analytics-new-container space-y-6">
    <h2 className="text-xl font-bold text-gray-900">CTA Performance</h2>
    <AnalyticsNewLoadingStates 
      mode="empty" 
      title="CTA analytics coming soon"
      description="Call-to-action performance metrics will be displayed here"
    />
  </div>
);

const AnalyticsNewTrends: React.FC = () => (
  <div className="analytics-new-container space-y-6">
    <h2 className="text-xl font-bold text-gray-900">Trends</h2>
    <AnalyticsNewLoadingStates 
      mode="empty" 
      title="Trend analysis coming soon"
      description="Time-series analytics and comparisons will be displayed here"
    />
  </div>
);

const AnalyticsNewClarity: React.FC = () => (
  <div className="analytics-new-container space-y-6">
    <h2 className="text-xl font-bold text-gray-900">Microsoft Clarity</h2>
    <AnalyticsNewLoadingStates 
      mode="empty" 
      title="Clarity integration coming soon"
      description="Microsoft Clarity insights and heatmaps will be accessible here"
    />
  </div>
);

const AnalyticsNewFallback: React.FC = () => (
  <div className="analytics-new-container space-y-6">
    <h2 className="text-xl font-bold text-gray-900">Diagnostics</h2>
    <AnalyticsNewLoadingStates 
      mode="error" 
      title="Error handling and diagnostics"
      description="System diagnostics and error recovery tools will be available here"
      showRetry={true}
    />
  </div>
);

interface AnalyticsNewDashboardProps {
  className?: string;
}

export const AnalyticsNewDashboard: React.FC<AnalyticsNewDashboardProps> = ({ 
  className = '' 
}) => {
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Read query parameter on component mount and URL changes
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlTab = urlParams.get('an_tab');
    setActiveTab(urlTab || 'overview');
  }, []);

  // Listen for browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setActiveTab(params.get('an_tab') || 'overview');
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Handle tab changes and update URL
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    
    // Update URL with query parameter
    const url = new URL(window.location.href);
    url.searchParams.set('an_tab', tabId);
    window.history.pushState({}, '', url.toString());
  };

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <AnalyticsNewOverview />;
      case 'live':
        return <AnalyticsNewLiveView />;
      case 'video':
        return <AnalyticsNewVideo />;
      case 'geo':
        return <AnalyticsNewGeo />;
      case 'cta':
        return <AnalyticsNewCta />;
      case 'trends':
        return <AnalyticsNewTrends />;
      case 'clarity':
        return <AnalyticsNewClarity />;
      case 'fallback':
        return <AnalyticsNewFallback />;
      default:
        return <AnalyticsNewOverview />;
    }
  };

  return (
    <div 
      className={`analytics-new-container min-h-screen bg-[var(--analytics-new-background)] ${className}`}
      data-testid="analytics-new-dashboard"
    >
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-[var(--analytics-new-text)] flex items-center gap-3">
                Analytics New Dashboard
                <DataSourceBadge />
              </h1>
              <p className="text-[var(--analytics-new-text-muted)] mt-1">
                Comprehensive analytics platform for MEMOPYK
              </p>
            </div>
            <div className="text-xs text-[var(--analytics-new-text-muted)] bg-yellow-50 px-3 py-1 rounded-full border border-yellow-200">
              Phase 1 - MVP Skeleton
            </div>
          </div>
          
          {/* Global Filters */}
          <AnalyticsNewGlobalFilters />
        </div>

        {/* Tab Navigation */}
        <AnalyticsNewTabNavigation 
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 min-h-[400px]">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};