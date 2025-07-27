import { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useLanguage } from '../contexts/LanguageContext';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { t, language, setLanguage, getLocalizedPath } = useLanguage();
  const [location] = useLocation();
  
  const navigation = [
    { name: t('nav.home'), href: getLocalizedPath('/') },
    { name: t('nav.gallery'), href: getLocalizedPath('/gallery') },
    { name: t('nav.contact'), href: getLocalizedPath('/contact') },
    { name: t('nav.admin'), href: getLocalizedPath('/admin') },
  ];

  const toggleLanguage = () => {
    setLanguage(language === 'fr-FR' ? 'en-US' : 'fr-FR');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Fixed Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm border-b">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <img 
                src="/logo.svg" 
                alt="MEMOPYK" 
                className="h-10 w-auto"
              />
            </Link>

            {/* Navigation Links */}
            <div className="hidden md:flex space-x-8">
              {navigation.map((item) => (
                <Link 
                  key={item.href} 
                  href={item.href}
                  className={`text-sm font-medium transition-colors ${
                    location === item.href
                      ? 'text-blue-600 border-b-2 border-blue-600 pb-1'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>

            {/* Language Toggle & Mobile Menu */}
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleLanguage}
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                <span className="text-3xl">
                  {language === 'fr-FR' ? '🇫🇷' : '🇺🇸'}
                </span>
              </button>

              {/* Mobile menu button */}
              <button className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden border-t border-gray-200 py-4">
            <div className="space-y-2">
              {navigation.map((item) => (
                <Link 
                  key={item.href} 
                  href={item.href}
                  className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    location === item.href
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content - Add padding for fixed nav */}
      <main className="pt-16">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="col-span-1 lg:col-span-1">
              <img 
                src="/logo.svg" 
                alt="MEMOPYK" 
                className="h-12 w-auto mb-4"
              />
              <p className="text-gray-400 mb-4">
                {language === 'fr-FR' 
                  ? 'Créateur de films mémoire pour immortaliser vos moments précieux.'
                  : 'Memory film creator to immortalize your precious moments.'
                }
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">
                {language === 'fr-FR' ? 'Liens Rapides' : 'Quick Links'}
              </h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/" className="hover:text-white">{t('nav.home')}</Link></li>
                <li><Link href="/gallery" className="hover:text-white">{t('nav.gallery')}</Link></li>
                <li><Link href="/contact" className="hover:text-white">{t('nav.contact')}</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">
                {language === 'fr-FR' ? 'Légal' : 'Legal'}
              </h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href={getLocalizedPath('/legal/privacy-policy')} className="hover:text-white">
                  {language === 'fr-FR' ? 'Politique de confidentialité' : 'Privacy Policy'}
                </Link></li>
                <li><Link href={getLocalizedPath('/legal/terms-of-service')} className="hover:text-white">
                  {language === 'fr-FR' ? 'Conditions générales d\'utilisation' : 'Terms of Service'}
                </Link></li>
                <li><Link href={getLocalizedPath('/legal/cookie-policy')} className="hover:text-white">
                  {language === 'fr-FR' ? 'Politique des cookies' : 'Cookie Policy'}
                </Link></li>
                <li><Link href={getLocalizedPath('/legal/terms-of-sale')} className="hover:text-white">
                  {language === 'fr-FR' ? 'Conditions générales de vente' : 'Terms of Sale'}
                </Link></li>
                <li><Link href={getLocalizedPath('/legal/legal-notice')} className="hover:text-white">
                  {language === 'fr-FR' ? 'Mentions légales' : 'Legal Notice'}
                </Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-gray-400">
                <li>contact@memopyk.com</li>
                <li>+33 1 23 45 67 89</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 MEMOPYK. {language === 'fr-FR' ? 'Tous droits réservés.' : 'All rights reserved.'}</p>
            <div className="mt-2">
              <Link href={getLocalizedPath('/admin')} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
                admin
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}