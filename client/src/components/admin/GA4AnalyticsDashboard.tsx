import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Play, Clock, Target, Globe, Users, TrendingUp, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, ReferenceLine } from 'recharts';

interface GA4VideoEvent {
  video_id: string;
  video_title: string;
  event_name: string;
  locale: string;
  position_sec: number;
  duration_sec: number;
  percent?: number;
  watch_time_sec?: number;
  timestamp: string;
}

interface VideoStats {
  video_id: string;
  video_title: string;
  plays: number;
  avg_watch_time: number;
  completion_rate: number;
  progress_25: number;
  progress_50: number;
  progress_75: number;
  progress_100: number;
  locale_breakdown: { [key: string]: number };
}

interface KPIData {
  total_plays: number;
  avg_watch_time: number;
  completion_rate: number;
  top_locale: string;
}

interface FunnelData {
  video_title: string;
  progress_25: number;
  progress_50: number;
  progress_75: number;
  progress_100: number;
}

interface TrendData {
  date: string;
  plays: number;
  avg_watch_time: number;
}

interface RealtimeData {
  active_viewers: number;
  last_events: GA4VideoEvent[];
}

const GA4AnalyticsDashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState('7d');
  const [localeFilter, setLocaleFilter] = useState('all');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Simulated data queries (will be replaced with real GA4 data)
  const { data: kpiData, isLoading: kpiLoading, refetch: refetchKPI } = useQuery<KPIData>({
    queryKey: ['ga4-kpi', dateRange, localeFilter],
    queryFn: async () => {
      // Placeholder for GA4 API call
      return {
        total_plays: 247,
        avg_watch_time: 45.3,
        completion_rate: 67.8,
        top_locale: 'fr-FR'
      };
    }
  });

  const { data: videoStats, isLoading: videoStatsLoading, refetch: refetchVideoStats } = useQuery<VideoStats[]>({
    queryKey: ['ga4-video-stats', dateRange, localeFilter],
    queryFn: async () => {
      // Placeholder for GA4 API call
      return [
        {
          video_id: 'PomGalleryC.mp4',
          video_title: 'L\'été de Pom',
          plays: 89,
          avg_watch_time: 52.4,
          completion_rate: 71.9,
          progress_25: 95,
          progress_50: 87,
          progress_75: 78,
          progress_100: 71,
          locale_breakdown: { 'fr-FR': 67, 'en-US': 22 }
        },
        {
          video_id: 'VitaminSeaC.mp4', 
          video_title: 'Our Vitamin Sea',
          plays: 156,
          avg_watch_time: 41.2,
          completion_rate: 64.7,
          progress_25: 92,
          progress_50: 84,
          progress_75: 73,
          progress_100: 64,
          locale_breakdown: { 'fr-FR': 89, 'en-US': 67 }
        },
        {
          video_id: 'safari-1.mp4',
          video_title: 'Safari with friends', 
          plays: 2,
          avg_watch_time: 38.9,
          completion_rate: 50.0,
          progress_25: 100,
          progress_50: 100,
          progress_75: 50,
          progress_100: 50,
          locale_breakdown: { 'fr-FR': 1, 'en-US': 1 }
        }
      ];
    }
  });

  const { data: funnelData, isLoading: funnelLoading } = useQuery<FunnelData[]>({
    queryKey: ['ga4-funnel', dateRange, localeFilter],
    queryFn: async () => {
      return videoStats?.map(video => ({
        video_title: video.video_title,
        progress_25: video.progress_25,
        progress_50: video.progress_50,
        progress_75: video.progress_75,
        progress_100: video.progress_100
      })) || [];
    },
    enabled: !!videoStats
  });

  const { data: trendData, isLoading: trendLoading } = useQuery<TrendData[]>({
    queryKey: ['ga4-trends', dateRange, localeFilter],
    queryFn: async () => {
      // Placeholder trend data
      const dates = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push({
          date: date.toISOString().split('T')[0],
          plays: Math.floor(Math.random() * 50) + 20,
          avg_watch_time: Math.floor(Math.random() * 20) + 35
        });
      }
      return dates;
    }
  });

  const { data: realtimeData, isLoading: realtimeLoading } = useQuery<RealtimeData>({
    queryKey: ['ga4-realtime'],
    queryFn: async () => {
      return {
        active_viewers: Math.floor(Math.random() * 8) + 2,
        last_events: [
          {
            video_id: 'PomGalleryC.mp4',
            video_title: 'L\'été de Pom',
            event_name: 'video_progress',
            locale: 'fr-FR',
            position_sec: 34,
            duration_sec: 67,
            percent: 50,
            timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString()
          },
          {
            video_id: 'VitaminSeaC.mp4',
            video_title: 'Our Vitamin Sea', 
            event_name: 'video_complete',
            locale: 'en-US',
            position_sec: 58,
            duration_sec: 64,
            timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString()
          },
          {
            video_id: 'PomGalleryC.mp4',
            video_title: 'L\'été de Pom',
            event_name: 'video_open',
            locale: 'fr-FR', 
            position_sec: 0,
            duration_sec: 67,
            timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString()
          }
        ]
      };
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const handleRefresh = () => {
    refetchKPI();
    refetchVideoStats();
    setLastRefresh(new Date());
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimeAgo = (timestamp: string): string => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    return `Il y a ${hours}h${minutes % 60}min`;
  };

  return (
    <div className="space-y-6 p-6" data-testid="ga4-analytics-dashboard">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Analytics GA4</h1>
        <div className="flex items-center space-x-4">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">24 heures</SelectItem>
              <SelectItem value="7d">7 jours</SelectItem>
              <SelectItem value="30d">30 jours</SelectItem>
              <SelectItem value="90d">90 jours</SelectItem>
            </SelectContent>
          </Select>

          <Select value={localeFilter} onValueChange={setLocaleFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="fr-FR">Français</SelectItem>
              <SelectItem value="en-US">Anglais</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={handleRefresh} variant="outline" size="sm" data-testid="refresh-button">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card data-testid="kpi-plays">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lectures</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiLoading ? '-' : kpiData?.total_plays}</div>
            <p className="text-xs text-muted-foreground">Total des ouvertures vidéo</p>
          </CardContent>
        </Card>

        <Card data-testid="kpi-watch-time">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Temps Moyen</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpiLoading ? '-' : formatDuration(kpiData?.avg_watch_time || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Durée moyenne de visionnage</p>
          </CardContent>
        </Card>

        <Card data-testid="kpi-completion">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de Completion</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpiLoading ? '-' : `${kpiData?.completion_rate}%`}
            </div>
            <p className="text-xs text-muted-foreground">Vidéos regardées à 90%+</p>
          </CardContent>
        </Card>

        <Card data-testid="kpi-locale">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Langue Principale</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpiLoading ? '-' : (kpiData?.top_locale === 'fr-FR' ? 'FR' : 'EN')}
            </div>
            <p className="text-xs text-muted-foreground">Langue la plus utilisée</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* A) Top Videos Table */}
        <Card data-testid="top-videos-table">
          <CardHeader>
            <CardTitle>Top Vidéos de la Galerie</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {videoStatsLoading ? (
                <div className="text-center py-4">Chargement...</div>
              ) : (
                videoStats?.map((video) => (
                  <div key={video.video_id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{video.video_title}</h4>
                      <div className="flex space-x-4 text-sm text-muted-foreground mt-1">
                        <span>{video.plays} lectures</span>
                        <span>{formatDuration(video.avg_watch_time)} moy</span>
                        <span>{video.progress_50}% à 50%</span>
                        <span>{video.progress_100}% complet</span>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      {Object.entries(video.locale_breakdown).map(([locale, count]) => (
                        <Badge key={locale} variant="outline" className="text-xs">
                          {locale === 'fr-FR' ? 'FR' : 'EN'}: {count}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* B) Watch Funnel Chart */}
        <Card data-testid="watch-funnel-chart">
          <CardHeader>
            <CardTitle>Entonnoir de Visionnage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {funnelLoading ? (
                <div className="flex items-center justify-center h-full">Chargement...</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="video_title" tick={false} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="progress_25" stackId="a" fill="#22c55e" name="25%" />
                    <Bar dataKey="progress_50" stackId="a" fill="#3b82f6" name="50%" />
                    <Bar dataKey="progress_75" stackId="a" fill="#f59e0b" name="75%" />
                    <Bar dataKey="progress_100" stackId="a" fill="#ef4444" name="100%" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* C) Trend Over Time */}
        <Card data-testid="trend-chart">
          <CardHeader>
            <CardTitle>Tendances Temporelles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {trendLoading ? (
                <div className="flex items-center justify-center h-full">Chargement...</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Line yAxisId="left" type="monotone" dataKey="plays" stroke="#3b82f6" name="Lectures/jour" />
                    <Line yAxisId="right" type="monotone" dataKey="avg_watch_time" stroke="#f59e0b" name="Temps moy/jour" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* D) Realtime Activity */}
        <Card data-testid="realtime-activity">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Temps Réel</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-green-500" />
                <span className="text-sm">
                  <strong>{realtimeData?.active_viewers || 0}</strong> utilisateurs actifs (30 min)
                </span>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Derniers événements:</h4>
                {realtimeLoading ? (
                  <div className="text-sm text-muted-foreground">Chargement...</div>
                ) : (
                  realtimeData?.last_events.map((event, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs bg-muted p-2 rounded">
                      <div>
                        <span className="font-medium">{event.video_title}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {event.event_name === 'video_open' ? 'Ouvert' :
                           event.event_name === 'video_start' ? 'Démarré' :
                           event.event_name === 'video_progress' ? `${event.percent}%` :
                           event.event_name === 'video_complete' ? 'Complet' : event.event_name}
                        </Badge>
                      </div>
                      <span className="text-muted-foreground">{formatTimeAgo(event.timestamp)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <span>Dernière actualisation: {lastRefresh.toLocaleTimeString()}</span>
        <Badge variant="secondary">
          GA4 - {dateRange} | {localeFilter === 'all' ? 'Toutes langues' : localeFilter}
        </Badge>
      </div>
    </div>
  );
};

export default GA4AnalyticsDashboard;