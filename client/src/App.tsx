import React from "react";
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
import NotFoundPage from './pages/not-found';
import { queryClient } from './lib/queryClient';
import { Toaster } from '@/components/ui/toaster';

// TIMEOUT SAFEGUARD SYSTEM v1.0.46 - SILENT STREAM FAILURE DETECTION
console.log("%c🚀 MEMOPYK 80% VIEWPORT VIDEO SIZING v1.0.61 - Gallery video controls simplified and sizing updated", "color: red; font-size: 16px; font-weight: bold;");

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LanguageProvider>
          <Router>
              <Route path="/language" component={LanguageSelectionPage} />
              
              <Layout>
                {/* Root route - serve HomePage directly */}
                <Route path="/" component={HomePage} />
              <Route path="/admin/*" component={AdminRoute} />
              
              {/* Localized Routes */}
              <Route path="/fr-FR" component={HomePage} />
              <Route path="/en-US" component={HomePage} />
              <Route path="/fr-FR/admin*" component={AdminRoute} />
              <Route path="/en-US/admin*" component={AdminRoute} />
              <Route path="/fr-FR/gallery" component={() => <div className="min-h-screen flex items-center justify-center"><div className="text-2xl text-gray-500">Galerie Bientôt Disponible</div></div>} />
              <Route path="/en-US/gallery" component={() => <div className="min-h-screen flex items-center justify-center"><div className="text-2xl text-gray-500">Gallery Coming Soon</div></div>} />
              <Route path="/fr-FR/contact" component={() => <div className="min-h-screen flex items-center justify-center"><div className="text-2xl text-gray-500">Contact Bientôt Disponible</div></div>} />
              <Route path="/en-US/contact" component={() => <div className="min-h-screen flex items-center justify-center"><div className="text-2xl text-gray-500">Contact Coming Soon</div></div>} />
              
              {/* Test Route */}
              <Route path="/test-gallery-video" component={TestGalleryVideo} />
              
              {/* Legal Document Routes */}
              <Route path="/fr-FR/legal/:docType" component={LegalDocumentPage} />
              <Route path="/en-US/legal/:docType" component={LegalDocumentPage} />
              
              {/* Catch-all routes temporarily removed to prevent FAQ section conflict */}
              {/* Will restore with proper configuration after identifying root cause */}
            </Layout>
          </Router>
        </LanguageProvider>
      </AuthProvider>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
