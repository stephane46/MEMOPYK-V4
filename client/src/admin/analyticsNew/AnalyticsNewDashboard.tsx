import React from 'react';
import { Route, Switch } from 'wouter';
import { AnalyticsNewTabNavigation } from './AnalyticsNewTabNavigation';
import { AnalyticsNewGlobalFilters } from './AnalyticsNewGlobalFilters';
import { AnalyticsNewOverview } from './AnalyticsNewOverview';
import { AnalyticsNewLoadingStates } from './AnalyticsNewLoadingStates';
import './analyticsNew.tokens.css';

// Placeholder components for other tabs
const AnalyticsNewLiveView: React.FC = () => (
  <div className="analytics-new-container space-y-6">
    <h2 className="text-xl font-bold text-gray-900">Live View</h2>
    <AnalyticsNewLoadingStates 
      mode="empty" 
      title="Live view coming soon"
      description="Real-time visitor activity will be displayed here"
    />
  </div>
);

const AnalyticsNewVideo: React.FC = () => (
  <div className="analytics-new-container space-y-6">
    <h2 className="text-xl font-bold text-gray-900">Video Analytics</h2>
    <AnalyticsNewLoadingStates 
      mode="empty" 
      title="Video analytics coming soon"
      description="Video performance and engagement metrics will be displayed here"
    />
  </div>
);

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
              <h1 className="text-3xl font-bold text-[var(--analytics-new-text)]">
                Analytics New Dashboard
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
        <AnalyticsNewTabNavigation />

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 min-h-[400px]">
          <Switch>
            <Route path="/admin/analytics-new" component={() => <AnalyticsNewOverview />} />
            <Route path="/admin/analytics-new/live-view" component={() => <AnalyticsNewLiveView />} />
            <Route path="/admin/analytics-new/video" component={() => <AnalyticsNewVideo />} />
            <Route path="/admin/analytics-new/geo" component={() => <AnalyticsNewGeo />} />
            <Route path="/admin/analytics-new/cta" component={() => <AnalyticsNewCta />} />
            <Route path="/admin/analytics-new/trends" component={() => <AnalyticsNewTrends />} />
            <Route path="/admin/analytics-new/clarity" component={() => <AnalyticsNewClarity />} />
            <Route path="/admin/analytics-new/fallback" component={() => <AnalyticsNewFallback />} />
            {/* Fallback route */}
            <Route component={() => <AnalyticsNewOverview />} />
          </Switch>
        </div>
      </div>
    </div>
  );
};