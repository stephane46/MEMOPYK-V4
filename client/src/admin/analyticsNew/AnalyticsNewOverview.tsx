import React from 'react';
import { Users, Video, Clock, MousePointer, Eye } from 'lucide-react';
import { AnalyticsNewKpiCard, KpiData } from './AnalyticsNewKpiCard';
import { Badge } from '@/components/ui/badge';
import './analyticsNew.tokens.css';

// Mock data for Phase 1
const USE_MOCK = true;
const SIMULATE_ERROR = false;
const SIMULATE_EMPTY = false;
const SIMULATE_LOADING = false;

interface AnalyticsNewOverviewProps {
  className?: string;
}

export const AnalyticsNewOverview: React.FC<AnalyticsNewOverviewProps> = ({ 
  className = '' 
}) => {
  const generateMockSparkline = () => {
    return Array.from({ length: 7 }, () => Math.floor(Math.random() * 100) + 20);
  };

  const mockKpiData: KpiData[] = [
    {
      id: 'sessions',
      title: 'Total Sessions',
      value: SIMULATE_EMPTY ? 0 : 2847,
      change: 12.3,
      trend: 'up',
      sparklineData: SIMULATE_EMPTY ? [] : generateMockSparkline(),
      icon: Users,
      color: 'blue',
      isLoading: SIMULATE_LOADING,
      error: SIMULATE_ERROR ? 'Failed to load sessions data' : undefined,
    },
    {
      id: 'video-plays',
      title: 'Video Plays',
      value: SIMULATE_EMPTY ? 0 : 1523,
      change: -2.1,
      trend: 'down',
      sparklineData: SIMULATE_EMPTY ? [] : generateMockSparkline(),
      icon: Video,
      color: 'green',
      isLoading: SIMULATE_LOADING,
      error: SIMULATE_ERROR ? 'Failed to load video data' : undefined,
    },
    {
      id: 'avg-watch-time',
      title: 'Avg Watch Time',
      value: SIMULATE_EMPTY ? '0:00' : '2:34',
      change: 8.7,
      trend: 'up',
      sparklineData: SIMULATE_EMPTY ? [] : generateMockSparkline(),
      icon: Clock,
      color: 'orange',
      isLoading: SIMULATE_LOADING,
      error: SIMULATE_ERROR ? 'Failed to load watch time data' : undefined,
    },
    {
      id: 'cta-clicks',
      title: 'CTA Clicks',
      value: SIMULATE_EMPTY ? 0 : 342,
      change: 15.8,
      trend: 'up',
      sparklineData: SIMULATE_EMPTY ? [] : generateMockSparkline(),
      icon: MousePointer,
      color: 'purple',
      isLoading: SIMULATE_LOADING,
      error: SIMULATE_ERROR ? 'Failed to load CTA data' : undefined,
    },
    {
      id: 'completion-rate',
      title: 'Completion Rate',
      value: SIMULATE_EMPTY ? '0%' : '68.4%',
      change: 0,
      trend: 'flat',
      sparklineData: SIMULATE_EMPTY ? [] : generateMockSparkline(),
      icon: Eye,
      color: 'red',
      isLoading: SIMULATE_LOADING,
      error: SIMULATE_ERROR ? 'Failed to load completion data' : undefined,
    },
  ];

  const mockActiveUsers = SIMULATE_EMPTY ? 0 : Math.floor(Math.random() * 20) + 5;

  return (
    <div className={`analytics-new-container space-y-6 ${className}`}>
      {/* Header with Active Users Badge */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Overview</h1>
          <p className="text-gray-600 mt-1">Key performance metrics for your MEMOPYK platform</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Badge 
            variant="outline" 
            className="bg-green-50 text-green-700 border-green-200"
            data-testid="active-users-badge"
          >
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
            {mockActiveUsers} active now
          </Badge>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {mockKpiData.map((kpi) => (
          <AnalyticsNewKpiCard
            key={kpi.id}
            data={kpi}
            className="transition-transform hover:scale-105"
          />
        ))}
      </div>

      {/* Mock State Toggles for Development */}
      {USE_MOCK && (
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">
            🔧 Phase 1 - Mock Data Mode
          </h3>
          <p className="text-xs text-yellow-700 mb-3">
            This overview is showing mock data with simulated states. 
            Toggle flags in <code>AnalyticsNewOverview.tsx</code> to test different states:
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">USE_MOCK: {USE_MOCK.toString()}</Badge>
            <Badge variant="outline">SIMULATE_ERROR: {SIMULATE_ERROR.toString()}</Badge>
            <Badge variant="outline">SIMULATE_EMPTY: {SIMULATE_EMPTY.toString()}</Badge>
            <Badge variant="outline">SIMULATE_LOADING: {SIMULATE_LOADING.toString()}</Badge>
          </div>
        </div>
      )}
    </div>
  );
};