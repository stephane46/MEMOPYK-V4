import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, MapPin, Clock, Globe, Monitor, Smartphone } from "lucide-react";

interface SessionData {
  id: string;
  session_id: string;
  ip_address: string;
  user_agent: string;
  language: string;
  country: string;
  city: string;
  created_at: string;
  duration: number | null;
  page_views: number;
  is_bot: boolean;
  referrer?: string;
}

interface ActivityData {
  sessions: SessionData[];
  total: number;
  timestamp: string;
}

export function RecentActivityPanel() {
  const [data, setData] = useState<ActivityData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    
    const load = () => {
      setIsLoading(true);
      console.log('🔍 RECENT ACTIVITY PANEL: Fetching recent sessions');
      
      // Get sessions from last 2 hours for more activity
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];
      
      fetch(`/api/analytics/sessions?dateFrom=${twoHoursAgo}&dateTo=${today}`)
        .then(r => {
          console.log('🔍 RECENT ACTIVITY PANEL: Response status:', r.status);
          return r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`));
        })
        .then(sessions => { 
          // Filter to last 2 hours and active sessions
          const twoHoursAgoTime = Date.now() - 2 * 60 * 60 * 1000;
          const recentSessions = sessions.filter((session: SessionData) => {
            const sessionTime = new Date(session.created_at).getTime();
            return sessionTime > twoHoursAgoTime && !session.is_bot;
          }).slice(0, 20); // Limit to 20 most recent
          
          const activityData: ActivityData = {
            sessions: recentSessions,
            total: recentSessions.length,
            timestamp: new Date().toISOString()
          };
          
          console.log('🔍 RECENT ACTIVITY PANEL: Found', recentSessions.length, 'recent sessions');
          if (alive) {
            setData(activityData); 
            setError(null);
            setIsLoading(false);
            setLastUpdated(new Date().toLocaleTimeString());
          }
        })
        .catch(e => { 
          console.error('🔍 RECENT ACTIVITY PANEL: Error:', e);
          if (alive) {
            setError(String(e)); 
            setIsLoading(false);
          }
        });
    };

    load();
    const id = setInterval(load, 15000); // refresh every 15s
    return () => { alive = false; clearInterval(id); };
  }, []);

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            Recent Activity
            <Activity className="h-5 w-5 text-red-500" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-600">Activity error: {error}</div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            Recent Activity
            <Activity className="h-5 w-5 text-blue-500" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-500">Loading recent activity...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          Realtime Activity
          <Activity className="h-5 w-5 text-green-500" />
        </CardTitle>
        <div className="text-xs text-gray-500">
          Auto-refresh 15s{lastUpdated && ` • Last updated: ${lastUpdated}`}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Active Users:</span>
            <Badge variant="default" className="bg-green-600">
              {data.total} live
            </Badge>
          </div>

          {data.sessions.length > 0 ? (
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-600">Last 2 hours:</div>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {data.sessions.map((session) => {
                  const timeAgo = getTimeAgo(session.created_at);
                  const duration = formatDuration(session.duration);
                  const deviceType = getDeviceType(session.user_agent);
                  const isActive = session.duration === null || (session.duration && session.duration > 30000);
                  
                  return (
                    <div key={session.id} className="border-b last:border-b-0 pb-2 text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                          <MapPin className="h-3 w-3 text-gray-500" />
                          <span className="font-medium">{session.country !== 'Unknown' ? session.country : 'Unknown Location'}</span>
                          {session.city !== 'Unknown' && (
                            <span className="text-gray-500">• {session.city}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {deviceType === 'mobile' ? <Smartphone className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-600 ml-4">
                        <div className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          <span>{session.language}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{timeAgo}</span>
                        </div>
                        {session.duration && (
                          <div className="flex items-center gap-1">
                            <Activity className="h-3 w-3" />
                            <span>on site {duration}</span>
                          </div>
                        )}
                        {session.page_views > 0 && (
                          <Badge variant="outline" className="text-xs px-1 py-0">
                            {session.page_views} views
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-4">
              No recent video activity
              <div className="text-xs text-gray-400 mt-1">
                Debug: {data.total} total events (expand to see)
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Helper functions
function getTimeAgo(timestamp: string): string {
  const now = Date.now();
  const time = new Date(timestamp).getTime();
  const diffMs = now - time;
  
  if (diffMs < 60000) return 'just now';
  if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m ago`;
  if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)}h ago`;
  return `${Math.floor(diffMs / 86400000)}d ago`;
}

function formatDuration(duration: number | null): string {
  if (!duration) return '0s';
  
  const seconds = Math.floor(duration / 1000);
  if (seconds < 60) return `${seconds}s`;
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

function getDeviceType(userAgent: string): 'mobile' | 'desktop' {
  const mobileRegex = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|Windows Phone/i;
  return mobileRegex.test(userAgent) ? 'mobile' : 'desktop';
}