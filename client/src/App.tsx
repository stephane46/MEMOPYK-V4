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
import { initTestMode, initGA } from '@/lib/analytics';
import { initOpenReplay } from '@/lib/openReplay';
import { readGa4Ids } from '@/lib/readGa4';

// Routes configured for gallery
// Language-specific upload system v1.0.82 ready

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
        
        {/* Root redirects - Let LanguageContext handle browser detection */}
        <Route path="/" component={() => { 
          // LanguageContext will handle browser language detection and redirect
          return null; 
        }} />
        <Route path="/admin/*" component={() => { 
          // LanguageContext will handle browser language detection and redirect to appropriate admin
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
  // Initialize GA4, OpenReplay and test mode on app load (EXCLUDE admin pages)
  useEffect(() => {
    const isAdminPage = window.location.pathname.includes('/admin');
    
    // Global unhandled promise rejection handler to prevent runtime error modal
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Check if it's an OpenReplay related error
      if (event.reason && typeof event.reason === 'object' && 
          (event.reason.toString().includes('Failed to fetch') || 
           event.reason.toString().includes('OpenReplay') ||
           event.reason.toString().includes('tracker'))) {
        console.warn('🚫 OpenReplay connection issue handled gracefully:', event.reason);
        event.preventDefault(); // Prevent the unhandled rejection from causing runtime error modal
      }
    };
    
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    if (!isAdminPage) {
      // Initialize GA4 only for public pages
      initGA();
      
      // Initialize OpenReplay session recording
      try {
        const ga = readGa4Ids();
        const openReplayTracker = initOpenReplay({
          getUserId: () => undefined, // No user auth system yet
          getLang: () => navigator.language,
          getCountryIso3: () => undefined, // Could integrate with existing analytics later
          getGaClient: () => ga,
          extraMeta: { site: "MEMOPYK" },
        });
        
        if (openReplayTracker) {
          console.log('🎬 OpenReplay successfully initialized');
          // Give it a moment to start, then check the session token
          setTimeout(() => {
            console.log('🎬 OpenReplay session token:', openReplayTracker.getSessionToken());
          }, 1000);
        } else {
          console.log('⚠️ OpenReplay initialization failed - check network connection');
        }
      } catch (error) {
        console.error('🚫 OpenReplay initialization error:', error);
      }
      
      // Then initialize test mode  
      const isTestMode = initTestMode();
      if (isTestMode) {
        console.log('🔍 Test mode active - all GA4 events will include debug_mode=true');
      }
    } else {
      console.log('🚫 Admin page detected - GA4 and OpenReplay tracking disabled');
    }
    
    // Cleanup function
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
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
