import { useEffect } from 'react';
import { HowItWorksSection } from '../components/sections/HowItWorksSection';

import { useLanguage } from '../contexts/LanguageContext';
import { useVideoAnalytics } from '../hooks/useVideoAnalytics';

export function HowItWorksPage() {
  const { language } = useLanguage();
  const { trackSession } = useVideoAnalytics();
  
  // Track visitor session on page load
  useEffect(() => {
    console.log('📊 Tracking visitor session on HowItWorksPage load');
    trackSession();
  }, [trackSession]);
  
  // Set page title based on language
  useEffect(() => {
    const title = language === 'fr-FR' 
      ? 'Comment ça marche | MEMOPYK - Films de souvenirs personnalisés'
      : 'How it works | MEMOPYK - Personalized memory films';
    document.title = title;
  }, [language]);
  
  return (
    <div className="min-h-screen">
      {/* How It Works 3-Step Process */}
      <HowItWorksSection />
    </div>
  );
}