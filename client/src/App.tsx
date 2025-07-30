import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Route, Switch } from "wouter";
import { HomePage } from "./pages/HomePage";
import AdminPage from "./pages/AdminPage";
import { Layout } from "./components/Layout";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

const queryClient = new QueryClient();

function App() {
  const [location, setLocation] = useLocation();
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'fr'>('en');

  // Language detection and routing
  useEffect(() => {
    const detectLanguage = () => {
      if (location.startsWith('/fr')) {
        setCurrentLanguage('fr');
      } else if (location.startsWith('/en')) {
        setCurrentLanguage('en');
      } else {
        // Default to English and redirect
        setCurrentLanguage('en');
        if (location === '/') {
          setLocation('/en');
        }
      }
    };
    
    detectLanguage();
  }, [location, setLocation]);

  const switchLanguage = (lang: 'en' | 'fr') => {
    setCurrentLanguage(lang);
    const currentPath = location.replace(/^\/(en|fr)/, '');
    setLocation(`/${lang}${currentPath}`);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <Layout currentLanguage={currentLanguage} onLanguageSwitch={switchLanguage}>
        <Switch>
          <Route path="/en" component={HomePage} />
          <Route path="/fr" component={HomePage} />
          <Route path="/en/admin" component={AdminPage} />
          <Route path="/fr/admin" component={AdminPage} />
          <Route path="/" component={HomePage} />
          <Route path="/admin" component={AdminPage} />
        </Switch>
      </Layout>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
