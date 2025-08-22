import { Helmet } from 'react-helmet-async';
import { useLanguage } from '../contexts/LanguageContext';

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
}

export function SEO({ title, description, canonical }: SEOProps) {
  const { language } = useLanguage();
  
  // Default SEO content based on language
  const defaultContent = {
    'fr-FR': {
      title: 'MEMOPYK – Films & albums souvenirs à partir de vos photos et vidéos',
      description: 'MEMOPYK transforme vos photos et vidéos en albums et films souvenirs uniques. Un service 100 % humain, créatif et inspirant.',
    },
    'en-US': {
      title: 'MEMOPYK – Unique memory films & albums from your photos and videos',
      description: 'MEMOPYK turns your photos and videos into unique souvenir films and albums. A fully human, creative, and inspiring service.',
    }
  };

  const currentContent = defaultContent[language as keyof typeof defaultContent] || defaultContent['en-US'];
  const seoTitle = title || currentContent.title;
  const seoDescription = description || currentContent.description;
  const seoCanonical = canonical || `https://memopyk.com/${language}`;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "MEMOPYK",
    "url": "https://memopyk.com",
    "logo": "https://memopyk.com/logo.svg",
    "description": seoDescription,
    "sameAs": []
  };

  return (
    <Helmet>
      {/* Basic SEO */}
      <title>{seoTitle}</title>
      <meta name="description" content={seoDescription} />
      <link rel="canonical" href={seoCanonical} />

      {/* Hreflang */}
      <link rel="alternate" hreflang="fr-FR" href="https://memopyk.com/fr-FR" />
      <link rel="alternate" hreflang="en-US" href="https://memopyk.com/en-US" />
      <link rel="alternate" hreflang="x-default" href="https://memopyk.com/en-US" />

      {/* Open Graph */}
      <meta property="og:title" content={seoTitle} />
      <meta property="og:description" content={seoDescription} />
      <meta property="og:url" content={seoCanonical} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="MEMOPYK" />
      <meta property="og:image" content="https://memopyk.com/logo.svg" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={seoTitle} />
      <meta name="twitter:description" content={seoDescription} />
      <meta name="twitter:image" content="https://memopyk.com/logo.svg" />

      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
}