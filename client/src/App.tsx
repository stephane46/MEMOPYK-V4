import "./index.css";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router, Route } from 'wouter';
import { LanguageProvider } from './contexts/LanguageContext';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { AdminPage } from './pages/AdminPage';
import { LanguageSelectionPage } from './pages/LanguageSelectionPage';
import NotFoundPage from './pages/not-found';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <Router>
          <Route path="/language" component={LanguageSelectionPage} />
          
          <Layout>
            <Route path="/" component={HomePage} />
            <Route path="/admin" component={AdminPage} />
            <Route path="/gallery" component={() => <div className="min-h-screen flex items-center justify-center"><div className="text-2xl text-gray-500">Gallery Coming Soon</div></div>} />
            <Route path="/contact" component={() => <div className="min-h-screen flex items-center justify-center"><div className="text-2xl text-gray-500">Contact Coming Soon</div></div>} />
            <Route component={NotFoundPage} />
          </Layout>
        </Router>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
