import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TestTube, 
  RefreshCw, 
  Clock, 
  Video, 
  Image, 
  Database,
  Zap,
  Activity,
  RotateCcw,
  HardDriveIcon,
  CheckCircle,
  AlertCircle,
  XCircle,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getTimeStatus, detectSourceFromHeaders, humanBytes, getPayloadSize, type PerfType } from '@/lib/performance-thresholds';

interface PerformanceResult {
  id: string;
  timestamp: Date;
  refreshType: 'normal' | 'hard';
  heroVideoTime: number;
  heroVideoSource: 'cache' | 'vps' | 'error';
  heroVideoSize?: number;
  staticImageTime: number;
  staticImageSource: 'cache' | 'vps' | 'error';
  staticImageSize?: number;
  galleryApiTime: number;
  galleryApiSource: 'cache' | 'vps' | 'error';
  galleryApiSize?: number;
  totalTime: number;
}

export default function PerformanceTestDashboard() {
  const [performanceResults, setPerformanceResults] = useState<PerformanceResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [refreshType, setRefreshType] = useState<'normal' | 'hard'>('normal');
  const [currentTest, setCurrentTest] = useState('');
  const [testProgress, setTestProgress] = useState(0);
  const { toast } = useToast();

  // Load saved results from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('memopyk-performance-results');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const results = parsed.map((r: any) => ({
          ...r,
          timestamp: new Date(r.timestamp)
        }));
        setPerformanceResults(results);
      } catch (error) {
        console.error('Error loading saved performance results:', error);
      }
    }
  }, []);

  // Save results to localStorage
  const saveResults = (results: PerformanceResult[]) => {
    try {
      localStorage.setItem('memopyk-performance-results', JSON.stringify(results));
    } catch (error) {
      console.error('Error saving performance results:', error);
    }
  };

  const runPerformanceTest = async () => {
    setIsRunning(true);
    setTestProgress(0);
    
    const testId = `test_${Date.now()}`;
    let heroVideoTime = 0;
    let heroVideoSource: 'cache' | 'vps' | 'error' = 'error';
    let heroVideoSize = 0;
    let staticImageTime = 0;
    let staticImageSource: 'cache' | 'vps' | 'error' = 'error';
    let staticImageSize = 0;
    let galleryApiTime = 0;
    let galleryApiSource: 'cache' | 'vps' | 'error' = 'error';
    let galleryApiSize = 0;

    try {
      toast({
        title: "Performance Test Started",
        description: `Running ${refreshType === 'hard' ? 'Hard Refresh (Ctrl+F5)' : 'Normal Refresh (F5)'} test`,
      });

      // Test 1: Hero Video Performance
      setCurrentTest('Testing Hero Video Loading...');
      setTestProgress(20);
      
      const heroStartTime = performance.now();
      try {
        // Test hero video loading by fetching a video with cache-control based on refresh type
        const heroResponse = await fetch('/api/video-proxy?filename=VideoHero1.mp4&range=bytes=0-1023', {
          cache: refreshType === 'hard' ? 'no-store' : 'default',
          headers: refreshType === 'hard' ? {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'X-Test-Bypass-Cache': '1'
          } : {}
        });
        heroVideoTime = Math.round(performance.now() - heroStartTime);
        heroVideoSize = getPayloadSize(heroResponse) || 1024; // 1KB range request
        
        // Use header-based detection, fallback to time threshold
        const heroHeaders = detectSourceFromHeaders(heroResponse);
        if (heroHeaders.cache) {
          heroVideoSource = heroHeaders.cache === 'HIT' ? 'cache' : 'vps';
        } else {
          // Fallback to time threshold
          heroVideoSource = refreshType === 'hard' ? 'vps' : (heroVideoTime < 100 ? 'cache' : 'vps');
        }
        
        console.log(`🎬 Hero video test: ${heroVideoTime}ms • ${humanBytes(heroVideoSize)} from ${heroVideoSource} (${refreshType} refresh)`);
      } catch (error) {
        heroVideoTime = -1;
        heroVideoSource = 'error';
        console.error('Hero video test failed:', error);
      }

      // Test 2: Static Image Performance  
      setCurrentTest('Testing Static Image Loading...');
      setTestProgress(50);
      
      const imageStartTime = performance.now();
      try {
        // Test static image loading with actual cached image
        const imageResponse = await fetch('/api/image-proxy?filename=static_auto_1754635504743.jpg', {
          cache: refreshType === 'hard' ? 'no-store' : 'default',
          headers: refreshType === 'hard' ? {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'X-Test-Bypass-Cache': '1'
          } : {}
        });
        staticImageTime = Math.round(performance.now() - imageStartTime);
        staticImageSize = getPayloadSize(imageResponse) || 50419; // ~50KB typical static image
        
        // Use header-based detection
        const imageHeaders = detectSourceFromHeaders(imageResponse);
        if (imageHeaders.cache) {
          staticImageSource = imageHeaders.cache === 'HIT' ? 'cache' : 'vps';
        } else {
          // Fallback
          staticImageSource = refreshType === 'hard' ? 'vps' : 'cache';
        }
        
        console.log(`🖼️ Static image test: ${staticImageTime}ms • ${humanBytes(staticImageSize)} from ${staticImageSource} (${refreshType} refresh) - X-Cache-Status: ${imageHeaders.cache}`);
      } catch (error) {
        staticImageTime = -1;
        staticImageSource = 'error';
        console.error('Static image test failed:', error);
      }

      // Test 3: Gallery Videos API Performance
      setCurrentTest('Testing Gallery Videos Loading...');
      setTestProgress(80);
      
      const apiStartTime = performance.now();
      try {
        const apiResponse = await fetch('/api/gallery', {
          cache: refreshType === 'hard' ? 'no-store' : 'default',
          headers: refreshType === 'hard' ? {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'X-Test-Bypass-Cache': '1'
          } : {}
        });
        const apiData = await apiResponse.json();
        galleryApiTime = Math.round(performance.now() - apiStartTime);
        galleryApiSize = getPayloadSize(apiResponse) || JSON.stringify(apiData).length;
        
        // Use header-based detection
        const apiHeaders = detectSourceFromHeaders(apiResponse);
        if (apiHeaders.cache) {
          galleryApiSource = apiHeaders.cache === 'HIT' ? 'cache' : 'vps';
        } else {
          // Fallback to time threshold
          galleryApiSource = galleryApiTime < 50 ? 'cache' : 'vps';
        }
        
        console.log(`📊 Gallery Videos API test: ${galleryApiTime}ms • ${humanBytes(galleryApiSize)} from ${galleryApiSource} (${refreshType} refresh)`);
      } catch (error) {
        galleryApiTime = -1;
        galleryApiSource = 'error';
        console.error('Gallery API test failed:', error);
      }

      setTestProgress(100);
      setCurrentTest('Test Complete!');

      const totalTime = heroVideoTime + staticImageTime + galleryApiTime;
      
      const newResult: PerformanceResult = {
        id: testId,
        timestamp: new Date(),
        refreshType,
        heroVideoTime,
        heroVideoSource,
        heroVideoSize,
        staticImageTime,
        staticImageSource,
        staticImageSize,
        galleryApiTime,
        galleryApiSource,
        galleryApiSize,
        totalTime
      };

      // Add to results and keep only last 10
      const updatedResults = [newResult, ...performanceResults].slice(0, 10);
      setPerformanceResults(updatedResults);
      saveResults(updatedResults);

      toast({
        title: "Performance Test Complete",
        description: `Total time: ${totalTime}ms (Hero: ${heroVideoTime}ms • ${humanBytes(heroVideoSize)}, Images: ${staticImageTime}ms • ${humanBytes(staticImageSize)}, API: ${galleryApiTime}ms • ${humanBytes(galleryApiSize)})`,
      });

    } catch (error) {
      console.error('Performance test error:', error);
      toast({
        title: "Test Failed",
        description: "Performance test encountered an error",
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
      setCurrentTest('');
      setTestProgress(0);
    }
  };

  const clearResults = () => {
    setPerformanceResults([]);
    localStorage.removeItem('memopyk-performance-results');
    toast({
      title: "Results Cleared",
      description: "All performance test results have been cleared",
    });
  };

  // Removed old getTimeStatus - now using the one from performance-thresholds.ts

  // Get status badge color based on performance time  
  const getStatusBadge = (status: { label: string; pill: string }) => {
    const colorMap = {
      'good': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      'fair': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300', 
      'poor': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    };
    
    return (
      <Badge className={`${colorMap[status.pill as keyof typeof colorMap]} text-xs px-2 py-1`}>
        {status.label}
      </Badge>
    );
  };

  const getSourceBadge = (source: 'cache' | 'vps' | 'database' | 'error') => {
    switch (source) {
      case 'cache':
        return <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">Cache</Badge>;
      case 'vps':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200">VPS</Badge>;
      case 'database':
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800 hover:bg-purple-200">Database</Badge>;
      case 'error':
        return <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-200">Error</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const averageResults = performanceResults.length > 0 ? {
    heroVideo: Math.round(performanceResults.reduce((sum, r) => sum + (r.heroVideoTime > 0 ? r.heroVideoTime : 0), 0) / performanceResults.length),
    staticImage: Math.round(performanceResults.reduce((sum, r) => sum + (r.staticImageTime > 0 ? r.staticImageTime : 0), 0) / performanceResults.length),
    galleryApi: Math.round(performanceResults.reduce((sum, r) => sum + (r.galleryApiTime > 0 ? r.galleryApiTime : 0), 0) / performanceResults.length)
  } : null;

  return (
    <div className="space-y-6">
      {/* Test Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5 text-orange-500" />
            Performance Testing
          </CardTitle>
          <CardDescription>
            Test site performance with F5 (normal refresh) or Ctrl+F5 (hard refresh). Cache indicates local server storage, VPS indicates live database/CDN requests.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Test Type:</label>
              <Select value={refreshType} onValueChange={(value: 'normal' | 'hard') => setRefreshType(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                      F5 - Normal Refresh
                    </div>
                  </SelectItem>
                  <SelectItem value="hard">
                    <div className="flex items-center gap-2">
                      <RotateCcw className="h-4 w-4" />
                      Ctrl+F5 - Hard Refresh
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              onClick={runPerformanceTest} 
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              <Activity className="h-4 w-4" />
              {isRunning ? 'Running Test...' : 'Run Performance Test'}
            </Button>

            <Button 
              variant="outline" 
              onClick={clearResults}
              disabled={isRunning || performanceResults.length === 0}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Clear Results
            </Button>
          </div>

          {isRunning && (
            <div className="space-y-2">
              <Progress value={testProgress} className="w-full" />
              <p className="text-sm text-muted-foreground">{currentTest}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Average Performance */}
      {averageResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              Average Performance ({performanceResults.length} tests)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-3">
                  <Video className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">Hero Videos</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">{averageResults.heroVideo}ms • ~1 KB</span>
                    {getStatusBadge(getTimeStatus('hero', averageResults.heroVideo))}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Average from cache
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-3">
                  <Image className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">Static Images</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">{averageResults.staticImage}ms • ~50 KB</span>
                    {getStatusBadge(getTimeStatus('image', averageResults.staticImage))}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Average from cache
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-3">
                  <Video className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">Gallery Videos</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">{averageResults.galleryApi}ms • ~2 KB</span>
                    {getStatusBadge(getTimeStatus('api', averageResults.galleryApi))}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Average from VPS
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Test Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-green-500" />
            Recent Test Results (Last 10)
          </CardTitle>
          <CardDescription>
            Detailed performance metrics from recent tests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {performanceResults.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <TestTube className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No test results yet. Run a performance test to see results.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {performanceResults.map((result, index) => (
                <div key={result.id} className="p-4 rounded-lg border bg-gradient-to-r from-gray-50 to-white">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Badge variant={result.refreshType === 'hard' ? 'destructive' : 'secondary'}>
                        {result.refreshType === 'hard' ? 'Ctrl+F5' : 'F5'}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {result.timestamp.toLocaleDateString()} {result.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <span className="text-lg font-bold">
                      Total: {result.totalTime}ms
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border">
                      <div className="flex items-center gap-2 mb-2">
                        <Video className="h-4 w-4 text-purple-500" />
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">Hero Video</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          {result.heroVideoTime > 0 ? result.heroVideoTime : 'Error'}ms • {humanBytes(result.heroVideoSize || 1024)}
                        </span>
                        <div className="flex items-center gap-1">
                          {getStatusBadge(getTimeStatus('hero', result.heroVideoTime))}
                          {getSourceBadge(result.heroVideoSource)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border">
                      <div className="flex items-center gap-2 mb-2">
                        <Image className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">Static Image</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          {result.staticImageTime > 0 ? result.staticImageTime : 'Error'}ms • {humanBytes(result.staticImageSize || 50419)}
                        </span>
                        <div className="flex items-center gap-1">
                          {getStatusBadge(getTimeStatus('image', result.staticImageTime))}
                          {getSourceBadge(result.staticImageSource)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border">
                      <div className="flex items-center gap-2 mb-2">
                        <Video className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">Gallery Videos</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          {result.galleryApiTime > 0 ? result.galleryApiTime : 'Error'}ms • {humanBytes(result.galleryApiSize || 2048)}
                        </span>
                        <div className="flex items-center gap-1">
                          {getStatusBadge(getTimeStatus('api', result.galleryApiTime))}
                          {getSourceBadge(result.galleryApiSource)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}