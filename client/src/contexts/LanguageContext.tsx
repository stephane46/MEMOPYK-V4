import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'wouter';

type Language = 'fr-FR' | 'en-US';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
  getLocalizedPath: (path: string) => string;
  removeLanguageFromPath: (path: string) => string;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Basic translations for the app
const translations: Record<Language, Record<string, string>> = {
  'fr-FR': {
    'site.title': 'MEMOPYK - Films Souvenirs',
    'nav.how-it-works': 'Comment ça marche',
    'nav.gallery': 'Galerie',
    'nav.quote': 'Commencer',
    'nav.appointment': 'Rendez-vous',
    'nav.language': 'Langue',
    'hero.title': 'Créateur de Films Souvenirs',
    'hero.subtitle': 'Transformez vos moments précieux en films cinématographiques',
    'loading': 'Chargement...',
    'error': 'Erreur',
    'welcome': 'Bienvenue sur MEMOPYK'
  },
  'en-US': {
    'site.title': 'MEMOPYK - Memory Keepsakes',
    'nav.how-it-works': 'How it works',
    'nav.gallery': 'Gallery',
    'nav.quote': 'Get started',
    'nav.appointment': 'Appointment',
    'nav.language': 'Language',
    'hero.title': 'Memory Keepsake Creator',
    'hero.subtitle': 'Transform your precious moments into cinematic films',
    'loading': 'Loading...',
    'error': 'Error',
    'welcome': 'Welcome to MEMOPYK'
  }
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [language, setLanguageState] = useState<Language>('fr-FR');
  const [hasInitialized, setHasInitialized] = useState(false);

  // Add testing helper to window - available immediately
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).testLanguageDetection = (testLanguages: string[]) => {
        console.log('🧪 TESTING with languages:', testLanguages);
        Object.defineProperty(navigator, 'languages', {
          value: testLanguages,
          configurable: true
        });
        const result = testLanguages[0]?.toLowerCase().startsWith('fr') ? 'fr-FR' : 'en-US';
        console.log('🧪 TEST RESULT:', result);
        console.log('🧪 To apply: localStorage.removeItem("memopyk-language"); location.reload();');
        return result;
      };
      console.log('🧪 Testing function created: testLanguageDetection() is now available in console');
    }
  }, []);

  // Detect browser language preference - FIXED for overseas English users
  const detectBrowserLanguage = (): Language => {
    // Check for stored preference first
    const storedLanguage = localStorage.getItem('memopyk-language') as Language;
    if (storedLanguage && ['fr-FR', 'en-US'].includes(storedLanguage)) {
      return storedLanguage;
    }

    // Get browser language preferences - prioritize PRIMARY language only
    const browserLanguages = navigator.languages || [navigator.language || 'en'];
    
    // CRITICAL FIX: Check ONLY the first (primary) language preference
    // This prevents overseas English users from seeing French when they have 
    // secondary French preferences (like en-US, en-GB, fr-CA, fr)
    if (browserLanguages.length > 0) {
      const primaryLanguage = browserLanguages[0].toLowerCase().trim();
      
      console.log('🌍 LANGUAGE DETECTION:', {
        allLanguages: browserLanguages,
        primaryLanguage,
        userAgent: navigator.userAgent.substring(0, 100)
      });
      
      // Check if primary language is French
      if (primaryLanguage.startsWith('fr')) {
        console.log('🇫🇷 PRIMARY language is French → Showing French');
        return 'fr-FR';
      }
      
      // Check if primary language is English
      if (primaryLanguage.startsWith('en')) {
        console.log('🇺🇸 PRIMARY language is English → Showing English');
        return 'en-US';
      }
      
      // For other primary languages, default to English
      console.log('🌍 OTHER primary language → Defaulting to English');
    }
    
    // Fallback for edge cases
    return 'en-US';
  };

  // Extract language from URL path
  const getLanguageFromPath = (path: string): Language | null => {
    if (path.startsWith('/en-US')) return 'en-US';
    if (path.startsWith('/fr-FR')) return 'fr-FR';
    return null; // No language in path - need to detect
  };

  const removeLanguageFromPath = (path: string): string => {
    return path.replace(/^\/(fr-FR|en-US)/, '') || '/';
  };

  const getLocalizedPath = (path: string): string => {
    const cleanPath = removeLanguageFromPath(path);
    return `/${language}${cleanPath === '/' ? '' : cleanPath}`;
  };

  useEffect(() => {
    const pathLanguage = getLanguageFromPath(location);
    
    if (pathLanguage) {
      // URL contains a language prefix, use it
      setLanguageState(pathLanguage);
      
      // Set HTML lang attribute and meta tags for SEO
      document.documentElement.lang = pathLanguage;
      document.querySelector('meta[name="Content-Language"]')?.setAttribute('content', pathLanguage);
      
      // Store in localStorage for persistence
      localStorage.setItem('memopyk-language', pathLanguage);
      setHasInitialized(true);
    } else if (!hasInitialized) {
      // No language in URL and first visit - detect browser language
      const detectedLanguage = detectBrowserLanguage();
      
      // Redirect to language-specific URL
      const currentPath = removeLanguageFromPath(location);
      const newPath = `/${detectedLanguage}${currentPath === '/' ? '' : currentPath}`;
      
      // Use replace to avoid adding to browser history
      window.history.replaceState({}, '', newPath);
      
      setLanguageState(detectedLanguage);
      document.documentElement.lang = detectedLanguage;
      document.querySelector('meta[name="Content-Language"]')?.setAttribute('content', detectedLanguage);
      localStorage.setItem('memopyk-language', detectedLanguage);
      setHasInitialized(true);
    }
  }, [location, hasInitialized]);

  const setLanguage = (lang: Language) => {
    const currentPath = removeLanguageFromPath(location);
    const newPath = `/${lang}${currentPath === '/' ? '' : currentPath}`;
    window.history.pushState({}, '', newPath);
    setLanguageState(lang);
    
    // Update HTML attributes
    document.documentElement.lang = lang;
    document.querySelector('meta[name="Content-Language"]')?.setAttribute('content', lang);
    localStorage.setItem('memopyk-language', lang);
  };

  const t = (key: string, fallback?: string): string => {
    return translations[language][key] || fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, getLocalizedPath, removeLanguageFromPath }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};