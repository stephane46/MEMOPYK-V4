import { useEffect, useState } from "react";
import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Play, Clock, TrendingUp, BarChart3, RefreshCcw } from "lucide-react";
import ExportRangeControls from "./ExportRangeControls";
import { GlobalFilterContext } from "./GlobalFilterContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface VideoPerformanceData {
  video_id: string;
  video_title: string;
  starts: number;
  completed_90: number;
  avg_watch_time: number;
  median_watch_time: number;
  pct_0: number;
  pct_10: number;
  pct_20: number;
  pct_30: number;
  pct_40: number;
  pct_50: number;
  pct_60: number;
  pct_70: number;
  pct_80: number;
  pct_90: number;
  pct_100: number;
  sec_60: number;
  sec_120: number;
  sec_180: number;
  sec_240: number;
  sec_300: number;
}

interface AnalyticsVideoPerformanceCardProps {
  dateRange?: string;
}

// Helper function to append global range to API URLs
function withRange(url: string, range: {from?: string; to?: string}) {
  const u = new URL(url, window.location.origin);
  if (range.from) u.searchParams.set("from", range.from);
  if (range.to) u.searchParams.set("to", range.to);
  return u.pathname + u.search; // relative
}

export const AnalyticsVideoPerformanceCard = ({ dateRange = "30" }: AnalyticsVideoPerformanceCardProps) => {
  const { range } = React.useContext(GlobalFilterContext);
  const [data, setData] = useState<VideoPerformanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchVideoPerformance = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(withRange("/api/analytics/video-performance", range));
        if (!response.ok) {
          throw new Error('Failed to fetch video performance data');
        }
        
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error('Video performance fetch error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchVideoPerformance();
  }, [range]);

  const handleRefresh = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(withRange("/api/analytics/video-performance", range));
      if (!response.ok) {
        throw new Error('Failed to fetch video performance data');
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Video performance fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data for percent milestones
  const preparePercentData = (video: VideoPerformanceData) => [
    { milestone: "0%", viewers: video.pct_0 },
    { milestone: "10%", viewers: video.pct_10 },
    { milestone: "20%", viewers: video.pct_20 },
    { milestone: "30%", viewers: video.pct_30 },
    { milestone: "40%", viewers: video.pct_40 },
    { milestone: "50%", viewers: video.pct_50 },
    { milestone: "60%", viewers: video.pct_60 },
    { milestone: "70%", viewers: video.pct_70 },
    { milestone: "80%", viewers: video.pct_80 },
    { milestone: "90%", viewers: video.pct_90 },
    { milestone: "100%", viewers: video.pct_100 }
  ];

  // Prepare chart data for time milestones
  const prepareTimeData = (video: VideoPerformanceData) => [
    { milestone: "≥1min", viewers: video.sec_60 },
    { milestone: "≥2min", viewers: video.sec_120 },
    { milestone: "≥3min", viewers: video.sec_180 },
    { milestone: "≥4min", viewers: video.sec_240 },
    { milestone: "≥5min", viewers: video.sec_300 }
  ];

  const formatWatchTime = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toFixed(0).padStart(2, '0')}`;
  };

  const getCompletionRate = (video: VideoPerformanceData) => {
    if (video.starts === 0) return 0;
    return ((video.completed_90 / video.starts) * 100).toFixed(1);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            <Skeleton className="h-6 w-48" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Play className="h-5 w-5" />
            Erreur de Performance Vidéo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">Erreur: {error}</p>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Performance Vidéo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Aucune donnée de performance vidéo disponible.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Performance Vidéo ({data.length} vidéos)
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={handleRefresh} disabled={loading} className="gap-2">
              <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            {/* NEW: range CSV export */}
            <ExportRangeControls report="video" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {data.map((video, index) => (
          <div key={video.video_id} className="space-y-4">
            {/* Video Header */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-semibold text-lg">{video.video_title}</h3>
                <p className="text-sm text-gray-600">{video.video_id}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{video.starts}</div>
                  <div className="text-xs text-gray-500">Démarrages</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{video.completed_90}</div>
                  <div className="text-xs text-gray-500">Complétions 90%</div>
                </div>
                <Badge variant="outline" className="text-sm">
                  {getCompletionRate(video)}% complété
                </Badge>
              </div>
            </div>

            {/* Dual Chart Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Percent Milestones Chart */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Jalons de Pourcentage
                </h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={preparePercentData(video)} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="milestone" 
                        fontSize={12}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis fontSize={12} />
                      <Tooltip 
                        formatter={(value) => [value, 'Spectateurs']}
                        labelFormatter={(label) => `À ${label}`}
                      />
                      <Bar dataKey="viewers" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Time Milestones Chart */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Jalons de Temps
                </h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={prepareTimeData(video)} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="milestone" 
                        fontSize={12}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis fontSize={12} />
                      <Tooltip 
                        formatter={(value) => [value, 'Spectateurs']}
                        labelFormatter={(label) => `Regardé ${label}`}
                      />
                      <Bar dataKey="viewers" fill="#10b981" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-blue-50 rounded-lg">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Temps Moyen</span>
                </div>
                <div className="text-lg font-bold text-blue-600">
                  {formatWatchTime(video.avg_watch_time)}
                </div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <BarChart3 className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Temps Médian</span>
                </div>
                <div className="text-lg font-bold text-green-600">
                  {formatWatchTime(video.median_watch_time)}
                </div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Play className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium">Taux de Démarrage</span>
                </div>
                <div className="text-lg font-bold text-purple-600">100%</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium">Taux de Complétion</span>
                </div>
                <div className="text-lg font-bold text-orange-600">
                  {getCompletionRate(video)}%
                </div>
              </div>
            </div>

            {/* Separator between videos */}
            {index < data.length - 1 && <hr className="border-gray-200" />}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};