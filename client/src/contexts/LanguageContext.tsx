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
    'site.title': 'MEMOPYK - Films Mémoire',
    'nav.how-it-works': 'Comment ça marche',
    'nav.gallery': 'Galerie',
    'nav.quote': 'Devis',
    'nav.appointment': 'Rendez-vous',
    'nav.language': 'Langue',
    'hero.title': 'Créateur de Films Mémoire',
    'hero.subtitle': 'Transformez vos moments précieux en films cinématographiques',
    'loading': 'Chargement...',
    'error': 'Erreur',
    'welcome': 'Bienvenue sur MEMOPYK'
  },
  'en-US': {
    'site.title': 'MEMOPYK - Memory Films',
    'nav.how-it-works': 'How it works',
    'nav.gallery': 'Gallery',
    'nav.quote': 'Quote',
    'nav.appointment': 'Appointment',
    'nav.language': 'Language',
    'hero.title': 'Memory Film Creator',
    'hero.subtitle': 'Transform your precious moments into cinematic films',
    'loading': 'Loading...',
    'error': 'Error',
    'welcome': 'Welcome to MEMOPYK'
  }
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [language, setLanguageState] = useState<Language>('fr-FR');

  // Extract language from URL path
  const getLanguageFromPath = (path: string): Language => {
    if (path.startsWith('/en-US')) return 'en-US';
    if (path.startsWith('/fr-FR')) return 'fr-FR';
    return 'fr-FR'; // Default to French
  };

  const removeLanguageFromPath = (path: string): string => {
    return path.replace(/^\/(fr-FR|en-US)/, '') || '/';
  };

  const getLocalizedPath = (path: string): string => {
    const cleanPath = removeLanguageFromPath(path);
    return `/${language}${cleanPath === '/' ? '' : cleanPath}`;
  };

  useEffect(() => {
    const currentLanguage = getLanguageFromPath(location);
    setLanguageState(currentLanguage);
    
    // Set HTML lang attribute and meta tags for SEO
    document.documentElement.lang = currentLanguage;
    document.querySelector('meta[name="Content-Language"]')?.setAttribute('content', currentLanguage);
    
    // Store in localStorage for persistence
    localStorage.setItem('memopyk-language', currentLanguage);
  }, [location]);

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