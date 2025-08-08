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

interface PerformanceResult {
  id: string;
  timestamp: Date;
  refreshType: 'normal' | 'hard';
  heroVideoTime: number;
  heroVideoSource: 'cache' | 'vps' | 'error';
  staticImageTime: number;
  staticImageSource: 'cache' | 'vps' | 'error';
  galleryApiTime: number;
  galleryApiSource: 'cache' | 'vps' | 'error';
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
    let staticImageTime = 0;
    let staticImageSource: 'cache' | 'vps' | 'error' = 'error';
    let galleryApiTime = 0;
    let galleryApiSource: 'cache' | 'vps' | 'error' = 'error';

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
        // Test hero video loading by fetching a video
        const heroResponse = await fetch('/api/video-proxy?filename=VideoHero1.mp4&range=bytes=0-1023', {
          cache: refreshType === 'hard' ? 'no-cache' : 'default'
        });
        heroVideoTime = Math.round(performance.now() - heroStartTime);
        
        // Determine source based on response time (cache < 50ms typically)
        heroVideoSource = heroVideoTime < 50 ? 'cache' : 'vps';
        console.log(`🎬 Hero video test: ${heroVideoTime}ms from ${heroVideoSource}`);
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
        // Test static image loading
        const imageResponse = await fetch('/api/image-proxy?filename=static_image_1.jpg', {
          cache: refreshType === 'hard' ? 'no-cache' : 'default'
        });
        staticImageTime = Math.round(performance.now() - imageStartTime);
        
        // Determine source based on response time (cache < 20ms typically for images)
        staticImageSource = staticImageTime < 20 ? 'cache' : 'vps';
        console.log(`🖼️ Static image test: ${staticImageTime}ms from ${staticImageSource}`);
      } catch (error) {
        staticImageTime = -1;
        staticImageSource = 'error';
        console.error('Static image test failed:', error);
      }

      // Test 3: Gallery API Performance
      setCurrentTest('Testing Gallery API Response...');
      setTestProgress(80);
      
      const apiStartTime = performance.now();
      try {
        const apiResponse = await fetch('/api/gallery', {
          cache: refreshType === 'hard' ? 'no-cache' : 'default'
        });
        await apiResponse.json();
        galleryApiTime = Math.round(performance.now() - apiStartTime);
        
        // Gallery API always hits database/VPS (designed for cross-environment sync)
        galleryApiSource = 'vps';
        console.log(`📊 Gallery API test: ${galleryApiTime}ms from ${galleryApiSource}`);
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
        staticImageTime,
        staticImageSource,
        galleryApiTime,
        galleryApiSource,
        totalTime
      };

      // Add to results and keep only last 10
      const updatedResults = [newResult, ...performanceResults].slice(0, 10);
      setPerformanceResults(updatedResults);
      saveResults(updatedResults);

      toast({
        title: "Performance Test Complete",
        description: `Total time: ${totalTime}ms (Hero: ${heroVideoTime}ms, Images: ${staticImageTime}ms, API: ${galleryApiTime}ms)`,
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

  const getTimeStatus = (time: number, type: 'hero' | 'image' | 'api') => {
    if (time === -1) return 'error';
    
    switch (type) {
      case 'hero':
        return time < 50 ? 'excellent' : time < 100 ? 'good' : time < 200 ? 'warning' : 'poor';
      case 'image':
        return time < 10 ? 'excellent' : time < 50 ? 'good' : time < 100 ? 'warning' : 'poor';
      case 'api':
        return time < 100 ? 'excellent' : time < 200 ? 'good' : time < 400 ? 'warning' : 'poor';
      default:
        return 'good';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'excellent':
        return <Badge className="bg-green-500 hover:bg-green-600">Excellent</Badge>;
      case 'good':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Good</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Slow</Badge>;
      case 'poor':
        return <Badge className="bg-red-500 hover:bg-red-600">Poor</Badge>;
      case 'error':
        return <Badge className="bg-gray-500 hover:bg-gray-600">Error</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  const getSourceBadge = (source: 'cache' | 'vps' | 'error') => {
    switch (source) {
      case 'cache':
        return <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">Cache</Badge>;
      case 'vps':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200">VPS</Badge>;
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
            Test site performance with F5 (normal refresh) or Ctrl+F5 (hard refresh)
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
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium">Hero Videos</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">{averageResults.heroVideo}ms</span>
                  {getStatusBadge(getTimeStatus(averageResults.heroVideo, 'hero'))}
                  <span className="text-xs text-muted-foreground">Cache</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Image className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Static Images</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">{averageResults.staticImage}ms</span>
                  {getStatusBadge(getTimeStatus(averageResults.staticImage, 'image'))}
                  <span className="text-xs text-muted-foreground">Cache</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Gallery API</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">{averageResults.galleryApi}ms</span>
                  {getStatusBadge(getTimeStatus(averageResults.galleryApi, 'api'))}
                  <span className="text-xs text-muted-foreground">VPS</span>
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
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Video className="h-4 w-4 text-purple-500" />
                        <span className="text-sm">Hero Videos</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{result.heroVideoTime > 0 ? result.heroVideoTime : 'Error'}ms</span>
                        {getStatusBadge(getTimeStatus(result.heroVideoTime, 'hero'))}
                        {getSourceBadge(result.heroVideoSource)}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Image className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Static Images</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{result.staticImageTime > 0 ? result.staticImageTime : 'Error'}ms</span>
                        {getStatusBadge(getTimeStatus(result.staticImageTime, 'image'))}
                        {getSourceBadge(result.staticImageSource)}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-blue-500" />
                        <span className="text-sm">Gallery API</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{result.galleryApiTime > 0 ? result.galleryApiTime : 'Error'}ms</span>
                        {getStatusBadge(getTimeStatus(result.galleryApiTime, 'api'))}
                        {getSourceBadge(result.galleryApiSource)}
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