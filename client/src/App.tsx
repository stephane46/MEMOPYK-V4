import "./index.css";
import { QueryClientProvider } from '@tanstack/react-query';
import { Router, Route } from 'wouter';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import AdminPage from './pages/AdminPage';
import AdminLogin from './pages/AdminLogin';
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
              <Route path="/" component={HomePage} />
              <Route path="/admin" component={() => {
                const isAuthenticated = localStorage.getItem('memopyk_admin_authenticated') === 'true';
                return isAuthenticated ? <AdminPage /> : <AdminLogin />;
              }} />
              <Route path="/gallery" component={() => <div className="min-h-screen flex items-center justify-center"><div className="text-2xl text-gray-500">Gallery Coming Soon</div></div>} />
              <Route path="/contact" component={() => <div className="min-h-screen flex items-center justify-center"><div className="text-2xl text-gray-500">Contact Coming Soon</div></div>} />
              <Route path="/:rest*" component={NotFoundPage} />
            </Layout>
          </Router>
        </LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
