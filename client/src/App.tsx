import "./index.css";
import { QueryClientProvider } from '@tanstack/react-query';
import { Router, Route } from 'wouter';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { AdminRoute } from './components/AdminRoute';
import { LanguageSelectionPage } from './pages/LanguageSelectionPage';
import { LegalDocumentPage } from './pages/LegalDocumentPage';
import TestGalleryVideo from './pages/TestGalleryVideo';
import SimpleVideoPlayer from './pages/SimpleVideoPlayer';
import GV2Page from './pages/GV2Page';
import NotFoundPage from './pages/not-found';
import { queryClient } from './lib/queryClient';
import { Toaster } from '@/components/ui/toaster';
import GallerySectionWrapper from './components/sections/GallerySectionWrapper';
import { useEffect } from 'react';
import { useAnalytics } from '@/hooks/use-analytics';
import { initTestMode } from '@/lib/analytics';

console.log("🔀 routes configured for /gallery");

// TIMEOUT SAFEGUARD SYSTEM v1.0.46 - SILENT STREAM FAILURE DETECTION
console.log("%c🚀 MEMOPYK LANGUAGE-SPECIFIC UPLOAD SYSTEM v1.0.82 - Force reload to fix English upload section visibility", "color: red; font-size: 16px; font-weight: bold;");

function AnalyticsRouter() {
  // Track page views when routes change
  useAnalytics();
  
  return (
    <>
      <Route path="/language" component={LanguageSelectionPage} />
      
      <Layout>
        {/* Test Routes - Handle these first, before redirects */}
        <Route path="/gv" component={SimpleVideoPlayer} />
        <Route path="/gv2" component={GV2Page} />
        <Route path="/test-gallery-video" component={TestGalleryVideo} />
        
        {/* Root redirects - Handle these after test routes */}
        <Route path="/" component={() => { 
          window.location.href = '/fr-FR'; 
          return null; 
        }} />
        <Route path="/admin/*" component={() => { 
          window.location.href = '/fr-FR/admin'; 
          return null; 
        }} />
        
        {/* Localized Routes */}
        <Route path="/fr-FR" component={HomePage} />
        <Route path="/en-US" component={HomePage} />
        <Route path="/fr-FR/admin*" component={AdminRoute} />
        <Route path="/en-US/admin*" component={AdminRoute} />
        <Route path="/fr-FR/gallery" component={GallerySectionWrapper} />
        <Route path="/en-US/gallery" component={GallerySectionWrapper} />
        <Route path="/fr-FR/contact" component={() => <div className="min-h-screen flex items-center justify-center"><div className="text-2xl text-gray-500">Contact Bientôt Disponible</div></div>} />
        <Route path="/en-US/contact" component={() => <div className="min-h-screen flex items-center justify-center"><div className="text-2xl text-gray-500">Contact Coming Soon</div></div>} />
        
        {/* Test Routes - Localized versions */}
        <Route path="/fr-FR/gv" component={SimpleVideoPlayer} />
        <Route path="/en-US/gv" component={SimpleVideoPlayer} />
        <Route path="/fr-FR/gv2" component={GV2Page} />
        <Route path="/en-US/gv2" component={GV2Page} />
        

        
        {/* Legal Document Routes */}
        <Route path="/fr-FR/legal/:docType" component={LegalDocumentPage} />
        <Route path="/en-US/legal/:docType" component={LegalDocumentPage} />
        
        {/* Catch-all routes temporarily removed to prevent FAQ section conflict */}
        {/* Will restore with proper configuration after identifying root cause */}
      </Layout>
    </>
  );
}

function App() {
  // Initialize test mode on app load
  useEffect(() => {
    const isTestMode = initTestMode();
    if (isTestMode) {
      console.log('🔍 Test mode active - all GA4 events will include debug_mode=true');
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LanguageProvider>
          <Router>
            <AnalyticsRouter />
          </Router>
        </LanguageProvider>
      </AuthProvider>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
