import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Globe, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Clock, 
  Eye,
  MapPin,
  Activity,
  BarChart3,
  Download,
  RefreshCw,
  RotateCcw
} from 'lucide-react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { scaleSequential } from 'd3-scale';
import { interpolateBlues } from 'd3-scale-chromatic';
import { useFilteredGeo, CountryData, CityData, GeoAnalyticsData } from './hooks/useFilteredReports';
import './analyticsNew.tokens.css';

// World atlas data for map visualization
const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface GeoKpiCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<any>;
  color: string;
}

const GeoKpiCard: React.FC<GeoKpiCardProps> = ({ title, value, subtitle, icon: Icon, color }) => {
  return (
    <Card className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </CardContent>
    </Card>
  );
};

interface CountryRowProps {
  country: string;
  sessions: number;
  visitors: number;
  rank: number;
  engagement?: number;
}

const CountryRow: React.FC<CountryRowProps> = ({ country, sessions, visitors, rank, engagement }) => {
  const engagementRate = engagement || Math.round((sessions / visitors) * 100);
  
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
      <div className="flex items-center space-x-3">
        <div className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs font-medium">
          {rank}
        </div>
        <div className="flex items-center space-x-2">
          <MapPin className="h-4 w-4 text-gray-400" />
          <span className="font-medium text-gray-900">{country}</span>
        </div>
      </div>
      <div className="flex items-center space-x-6 text-sm">
        <div className="text-center">
          <div className="font-semibold text-gray-900">{sessions.toLocaleString()}</div>
          <div className="text-gray-500 text-xs">Sessions</div>
        </div>
        <div className="text-center">
          <div className="font-semibold text-gray-900">{visitors.toLocaleString()}</div>
          <div className="text-gray-500 text-xs">Visitors</div>
        </div>
        <div className="text-center">
          <div className="font-semibold text-gray-900">{engagementRate}%</div>
          <div className="text-gray-500 text-xs">Engagement</div>
        </div>
      </div>
    </div>
  );
};

export const AnalyticsNewGeo: React.FC = () => {
  // Use centralized filtering system with the useFilteredGeo hook
  const { data: geoData, isLoading: geoLoading, error: geoError, refetch, appliedFilters } = useFilteredGeo();
  
  // Map position state for recenter functionality (using react-simple-maps pattern)
  const [position, setPosition] = useState({ coordinates: [0, 10] as [number, number], zoom: 1 });
  
  // Tooltip state for map
  const [tooltip, setTooltip] = useState<{
    show: boolean;
    content: string;
    x: number;
    y: number;
  }>({ show: false, content: '', x: 0, y: 0 });
  
  // Function to recenter map to original position
  const recenterMap = () => {
    setPosition({ coordinates: [0, 10], zoom: 1 });
  };

  // Process data for visualizations - now using centralized hook data with totals included
  const processedData = React.useMemo(() => {
    if (!geoData?.countries) return null;
    
    // Data already processed by centralized hook, just organize for display
    const countries = geoData.countries;
    const { totalSessions, totalVisitors, coverageCount } = geoData;
    
    // Sort countries by sessions for ranking
    const sortedCountries = [...countries].sort((a, b) => b.sessions - a.sessions);
    
    // Find insights
    const topMarket = sortedCountries[0];
    const bestEngagement = sortedCountries.reduce((best, country) => {
      const rate = country.sessions / (country.visitors || 1);
      const bestRate = best.sessions / (best.visitors || 1);
      return rate > bestRate ? country : best;
    }, sortedCountries[0] || { country: '', sessions: 0, visitors: 1 });

    return {
      countries: sortedCountries,
      totalSessions,
      totalVisitors,
      topMarket,
      bestEngagement,
      coverageCount
    };
  }, [geoData]);

  if (geoLoading) {
    return (
      <div className="analytics-new-container space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Geographic Market Analysis</h2>
          <Badge variant="secondary" className="bg-blue-50 text-blue-700">
            🌍 Market Intelligence
          </Badge>
        </div>

        {/* Loading KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="bg-white border border-gray-200">
              <CardHeader className="space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Loading Map and Table */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-white border border-gray-200">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-80 w-full" />
            </CardContent>
          </Card>
          
          <Card className="bg-white border border-gray-200">
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (geoError || !processedData) {
    return (
      <div className="analytics-new-container space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Geographic Market Analysis</h2>
          <Button onClick={() => refetch()} size="sm" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
        
        <Card className="bg-white border border-red-200">
          <CardContent className="text-center py-8">
            <div className="text-red-600 text-lg font-medium mb-2">Geographic Data Unavailable</div>
            <div className="text-gray-600 mb-4">Unable to load geographic analytics data</div>
            <Button onClick={() => refetch()} variant="outline">Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { countries, totalSessions, totalVisitors, topMarket, bestEngagement, coverageCount } = processedData;

  return (
    <div className="analytics-new-container space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h2 className="text-xl font-bold text-gray-900">Geographic Market Analysis</h2>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs">
            Centralized Filters
          </Badge>
          <Badge variant="outline" className="bg-green-50 text-green-700 text-xs">
            Source: GA4
          </Badge>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="bg-blue-50 text-blue-700">
            🌍 {coverageCount} Markets
          </Badge>
          <Button size="sm" variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Market Intelligence KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <GeoKpiCard
          title="Top Market"
          value={topMarket?.country || 'N/A'}
          subtitle={`${topMarket?.sessions.toLocaleString() || 0} sessions`}
          icon={Globe}
          color="text-blue-600"
        />
        <GeoKpiCard
          title="Market Coverage"
          value={coverageCount.toString()}
          subtitle="countries reached"
          icon={MapPin}
          color="text-green-600"
        />
        <GeoKpiCard
          title="Best Engagement"
          value={bestEngagement?.country || 'N/A'}
          subtitle={`${Math.round((bestEngagement?.sessions / bestEngagement?.visitors) * 100) || 0}% rate`}
          icon={Activity}
          color="text-orange-600"
        />
        <GeoKpiCard
          title="Global Reach"
          value={`${totalVisitors.toLocaleString()}`}
          subtitle="unique visitors"
          icon={Users}
          color="text-purple-600"
        />
      </div>

      {/* Geographic Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* World Map Visualization */}
        <Card className="bg-white border border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
              <Globe className="h-5 w-5 mr-2 text-blue-600" />
              Visitor Distribution
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">Interactive Map</Badge>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={recenterMap}
                className="text-gray-500 hover:text-gray-700"
                data-testid="recenter-map"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80 relative">
              <ComposableMap
                projection="geoMercator"
                projectionConfig={{
                  rotate: [0, 0, 0],
                  scale: 120,
                }}
                width={800}
                height={320}
                className="w-full h-full"
              >
                <ZoomableGroup zoom={position.zoom} center={position.coordinates}>
                  <Geographies geography={geoUrl}>
                    {({ geographies }) =>
                      geographies.map(geo => {
                        const countryName = geo.properties?.name;
                        
                        // Enhanced country name matching with common variations
                        const countryData = countries.find(c => {
                          if (!countryName || !c.country) return false;
                          
                          const geoNameLower = countryName.toLowerCase();
                          const ga4NameLower = c.country.toLowerCase();
                          
                          // Direct match
                          if (geoNameLower === ga4NameLower) return true;
                          
                          // Common country name mappings
                          const countryMappings: Record<string, string[]> = {
                            'vietnam': ['viet nam', 'vietnam'],
                            'france': ['france', 'french republic'],
                            'united states': ['united states of america', 'usa', 'us'],
                            'united kingdom': ['uk', 'great britain', 'britain'],
                            'germany': ['deutschland'],
                          };
                          
                          // Check if either name appears in the other
                          if (geoNameLower.includes(ga4NameLower) || ga4NameLower.includes(geoNameLower)) {
                            return true;
                          }
                          
                          // Check mapping variations
                          for (const [key, variations] of Object.entries(countryMappings)) {
                            if ((variations.includes(geoNameLower) && ga4NameLower === key) ||
                                (variations.includes(ga4NameLower) && geoNameLower === key)) {
                              return true;
                            }
                          }
                          
                          return false;
                        });
                        
                        const sessions = countryData?.sessions || 0;
                        const maxSessions = Math.max(...countries.map(c => c.sessions));
                        const intensity = sessions > 0 ? sessions / maxSessions : 0;
                        
                        // Color scale from light blue to dark blue
                        const colorScale = scaleSequential(interpolateBlues).domain([0, 1]);
                        const fillColor = sessions > 0 ? colorScale(intensity) : '#f3f4f6';
                        
                        
                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            fill={fillColor}
                            stroke="#e2e8f0"
                            strokeWidth={0.5}
                            style={{
                              default: { outline: "none" },
                              hover: { 
                                fill: sessions > 0 ? colorScale(Math.min(intensity + 0.2, 1)) : "#e5e7eb",
                                outline: "none",
                                cursor: "pointer",
                                filter: sessions > 0 ? "brightness(0.9)" : "none"
                              },
                              pressed: { outline: "none" }
                            }}
                            onMouseEnter={(event) => {
                              if (sessions > 0 && countryData) {
                                const engagementRate = Math.round((countryData.sessions / countryData.visitors) * 100);
                                setTooltip({
                                  show: true,
                                  content: `${countryData.country}\n${countryData.sessions.toLocaleString()} sessions\n${countryData.visitors.toLocaleString()} visitors\n${engagementRate}% engagement`,
                                  x: event.clientX,
                                  y: event.clientY
                                });
                                // Set legend highlight based on country's intensity
                              }
                            }}
                            onMouseMove={(event) => {
                              if (tooltip.show) {
                                setTooltip(prev => ({ ...prev, x: event.clientX, y: event.clientY }));
                              }
                            }}
                            onMouseLeave={() => {
                              setTooltip({ show: false, content: '', x: 0, y: 0 });
                            }}
                          />
                        );
                      })
                    }
                  </Geographies>
                </ZoomableGroup>
              </ComposableMap>
              
              {/* Map Legend */}
              <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-md border">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Sessions</h4>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">Low</span>
                  <div className="flex space-x-1">
                    {[0.2, 0.4, 0.6, 0.8, 1.0].map((intensity, index) => {
                      return (
                        <div
                          key={index}
                          className={`legend-square-${index}`}
                          style={{
                            width: '16px',
                            height: '16px',
                            border: '1px solid #e5e7eb',
                            display: 'block'
                          }}
                        />
                      );
                    })}
                  </div>
                  <span className="text-xs text-gray-500">High</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {countries.length > 0 ? `Max: ${Math.max(...countries.map(c => c.sessions))} sessions` : 'No data'}
                </div>
              </div>

              {/* Tooltip */}
              {tooltip.show && (
                <div 
                  className="fixed z-50 bg-gray-900 text-white text-xs rounded-md px-3 py-2 shadow-lg pointer-events-none"
                  style={{
                    left: tooltip.x + 10,
                    top: tooltip.y - 10,
                    transform: 'translateY(-100%)'
                  }}
                >
                  {tooltip.content.split('\n').map((line, index) => (
                    <div key={index} className={index === 0 ? 'font-semibold' : ''}>
                      {line}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-4 text-center">
              <div className="text-xs text-gray-500">
                ✨ Hover over countries to see visitor metrics and engagement rates
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Markets Table */}
        <Card className="bg-white border border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
              <MapPin className="h-5 w-5 mr-2 text-orange-600" />
              Top Markets
            </CardTitle>
            <Badge variant="outline">Ranked by Sessions</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {countries.slice(0, 10).map((country, index) => (
                <CountryRow
                  key={`${country.country}-${index}-${country.sessions}-${country.visitors}`}
                  rank={index + 1}
                  country={country.country}
                  sessions={country.sessions}
                  visitors={country.visitors}
                />
              ))}
              {countries.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Globe className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <div>No geographic data available</div>
                  <div className="text-xs">Location data will appear as visitors arrive</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Business Insights */}
      <Card className="bg-white border border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
            <Eye className="h-5 w-5 mr-2 text-purple-600" />
            Market Intelligence Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {Math.round((totalSessions / totalVisitors) * 100) || 0}%
              </div>
              <div className="text-sm font-medium text-blue-700 mb-1">Global Engagement</div>
              <div className="text-xs text-blue-600">
                Average session-to-visitor ratio across all markets
              </div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {Math.round((countries.length / Math.max(totalVisitors, 1)) * 100) || 0}%
              </div>
              <div className="text-sm font-medium text-green-700 mb-1">Market Diversity</div>
              <div className="text-xs text-green-600">
                Geographic distribution effectiveness score
              </div>
            </div>
            
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600 mb-1">
                {topMarket ? Math.round((topMarket.sessions / totalSessions) * 100) : 0}%
              </div>
              <div className="text-sm font-medium text-orange-700 mb-1">Top Market Share</div>
              <div className="text-xs text-orange-600">
                Percentage of total sessions from leading market
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-700">
              <strong>Geographic Reach:</strong> MEMOPYK's cinematic storytelling reaches {coverageCount} international markets. 
              {topMarket && ` ${topMarket.country} represents your strongest market with ${topMarket.sessions} sessions.`}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};