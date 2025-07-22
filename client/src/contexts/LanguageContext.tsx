import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'fr' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Basic translations for the app
const translations: Record<Language, Record<string, string>> = {
  fr: {
    'site.title': 'MEMOPYK - Films Mémoire',
    'nav.home': 'Accueil',
    'nav.gallery': 'Galerie',
    'nav.contact': 'Contact',
    'nav.admin': 'Administration',
    'nav.language': 'Langue',
    'hero.title': 'Créateur de Films Mémoire',
    'hero.subtitle': 'Transformez vos moments précieux en films cinématographiques',
    'loading': 'Chargement...',
    'error': 'Erreur',
    'welcome': 'Bienvenue sur MEMOPYK'
  },
  en: {
    'site.title': 'MEMOPYK - Memory Films',
    'nav.home': 'Home',
    'nav.gallery': 'Gallery',
    'nav.contact': 'Contact',
    'nav.admin': 'Admin',
    'nav.language': 'Language',
    'hero.title': 'Memory Film Creator',
    'hero.subtitle': 'Transform your precious moments into cinematic films',
    'loading': 'Loading...',
    'error': 'Error',
    'welcome': 'Welcome to MEMOPYK'
  }
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('fr');

  useEffect(() => {
    const savedLanguage = localStorage.getItem('memopyk-language') as Language;
    if (savedLanguage && (savedLanguage === 'fr' || savedLanguage === 'en')) {
      setLanguageState(savedLanguage);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('memopyk-language', lang);
  };

  const t = (key: string, fallback?: string): string => {
    return translations[language][key] || fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}