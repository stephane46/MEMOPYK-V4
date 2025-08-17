import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, MapPin, Clock } from "lucide-react";

interface ActivityData {
  activities: Array<{
    id: string;
    timestamp: string;
    ip: string;
    country: string;
    city: string;
    language: string;
    page_url: string;
    duration: number;
    video_views: any[];
    user_agent: string;
    is_active: boolean;
  }>;
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
      console.log('🔍 RECENT ACTIVITY PANEL: Fetching from /api/analytics/recent-activity');
      
      fetch("/api/analytics/recent-activity")
        .then(r => {
          console.log('🔍 RECENT ACTIVITY PANEL: Response status:', r.status);
          return r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`));
        })
        .then(j => { 
          console.log('🔍 RECENT ACTIVITY PANEL: Data received:', j);
          if (alive) {
            setData(j); 
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
          Recent Activity
          <Activity className="h-5 w-5 text-green-500" />
        </CardTitle>
        <div className="text-xs text-gray-500">
          Auto-refresh 15s{lastUpdated && ` • Last updated: ${lastUpdated}`}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Recent Visitors:</span>
            <Badge variant="default" className="bg-blue-600">
              {data.total === 0 ? "No recent activity" : `${data.total} visitors`}
            </Badge>
          </div>

          {data.activities.length > 0 ? (
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-600">Last 30 minutes:</div>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {data.activities.slice(0, 10).map((activity) => (
                  <div key={activity.id} className="border-b last:border-b-0 pb-2 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3 text-gray-500" />
                        <span className="font-medium">{activity.country}</span>
                        {activity.city && <span className="text-gray-500">• {activity.city}</span>}
                      </div>
                      <Badge variant={activity.is_active ? "default" : "secondary"} className="text-xs">
                        {activity.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(activity.timestamp).toLocaleTimeString()}</span>
                      <span>• {activity.language.toUpperCase()}</span>
                      <span>• {activity.duration}s session</span>
                      {activity.video_views.length > 0 && (
                        <span>• {activity.video_views.length} videos</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm text-gray-500">No recent visitor activity</div>
              <div className="text-xs text-gray-400">Visitors will appear here when they access your site</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}