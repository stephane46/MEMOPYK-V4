import "./index.css";
import { QueryClientProvider } from '@tanstack/react-query';
import { Router, Route } from 'wouter';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { AdminRoute } from './components/AdminRoute';
import { LanguageSelectionPage } from './pages/LanguageSelectionPage';
import NotFoundPage from './pages/not-found';
import { queryClient } from './lib/queryClient';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LanguageProvider>
          <Router>
            <Route path="/language" component={LanguageSelectionPage} />
            
            <Layout>
              {/* Localized Routes */}
              <Route path="/fr-FR" component={HomePage} />
              <Route path="/en-US" component={HomePage} />
              <Route path="/fr-FR/admin/*" component={AdminRoute} />
              <Route path="/en-US/admin/*" component={AdminRoute} />
              <Route path="/fr-FR/gallery" component={() => <div className="min-h-screen flex items-center justify-center"><div className="text-2xl text-gray-500">Galerie Bientôt Disponible</div></div>} />
              <Route path="/en-US/gallery" component={() => <div className="min-h-screen flex items-center justify-center"><div className="text-2xl text-gray-500">Gallery Coming Soon</div></div>} />
              <Route path="/fr-FR/contact" component={() => <div className="min-h-screen flex items-center justify-center"><div className="text-2xl text-gray-500">Contact Bientôt Disponible</div></div>} />
              <Route path="/en-US/contact" component={() => <div className="min-h-screen flex items-center justify-center"><div className="text-2xl text-gray-500">Contact Coming Soon</div></div>} />
              
              {/* Root redirects */}
              <Route path="/" component={() => { 
                window.location.href = '/fr-FR'; 
                return null; 
              }} />
              <Route path="/admin/*" component={() => { 
                window.location.href = '/fr-FR/admin'; 
                return null; 
              }} />
              
              <Route path="/:rest*" component={NotFoundPage} />
            </Layout>
          </Router>
        </LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
