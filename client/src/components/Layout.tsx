import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useLanguage } from '../contexts/LanguageContext';
import { Menu, X } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { t, language, setLanguage, getLocalizedPath } = useLanguage();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);
  
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
    <div className="min-h-screen bg-white overflow-x-hidden max-w-full">
      {/* Fixed Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-memopyk-cream shadow-sm border-b">
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

            {/* Navigation Links - Hidden on mobile */}
            <div className="hidden lg:flex space-x-6">
              {navigation.map((item) => (
                <Link 
                  key={item.href} 
                  href={item.href}
                  className={`text-sm font-medium transition-colors ${
                    location === item.href
                      ? 'text-memopyk-navy border-b-2 border-memopyk-orange pb-1'
                      : 'text-gray-600 hover:text-memopyk-navy'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>

            {/* Language Toggle & Mobile Menu */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setLanguage('en-US')}
                  className={`p-2 rounded-md transition-all ${
                    language === 'en-US' 
                      ? 'border-2 border-memopyk-navy bg-memopyk-cream shadow-md' 
                      : 'border-2 border-transparent hover:border-memopyk-blue-gray hover:bg-gray-50'
                  }`}
                  title="Switch to English"
                >
                  <img 
                    src="https://flagcdn.com/w40/us.png" 
                    alt="English"
                    className="w-8 h-6 object-cover rounded"
                  />
                </button>
                <button
                  onClick={() => setLanguage('fr-FR')}
                  className={`p-2 rounded-md transition-all ${
                    language === 'fr-FR' 
                      ? 'border-2 border-memopyk-navy bg-memopyk-cream shadow-md' 
                      : 'border-2 border-transparent hover:border-memopyk-blue-gray hover:bg-gray-50'
                  }`}
                  title="Passer au français"
                >
                  <img 
                    src="https://flagcdn.com/w40/fr.png" 
                    alt="French"
                    className="w-8 h-6 object-cover rounded"
                  />
                </button>
              </div>

              {/* Mobile menu button - Enhanced with 44px touch target */}
              <button 
                onClick={() => {
                  console.log('Hamburger menu clicked! Current state:', isMobileMenuOpen);
                  setIsMobileMenuOpen(!isMobileMenuOpen);
                }}
                className="lg:hidden p-3 rounded-md text-gray-600 hover:text-memopyk-navy hover:bg-gray-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>

          {/* Enhanced Mobile Navigation - Slide Down Animation */}
          <div className={`lg:hidden transition-all duration-300 ease-in-out overflow-hidden ${
            isMobileMenuOpen 
              ? 'max-h-96 opacity-100 border-t border-gray-200 bg-white' 
              : 'max-h-0 opacity-0'
          }`}>
            <div className="py-4 space-y-2">
              {navigation.map((item) => (
                <Link 
                  key={item.href} 
                  href={item.href}
                  className={`block px-4 py-3 rounded-md text-base font-medium transition-all duration-200 min-h-[44px] flex items-center ${
                    location === item.href
                      ? 'text-memopyk-navy bg-memopyk-cream border-l-4 border-memopyk-orange'
                      : 'text-gray-600 hover:text-memopyk-navy hover:bg-gray-50 hover:border-l-4 hover:border-memopyk-blue-gray'
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
                <li><Link href={getLocalizedPath('/')} className="hover:text-white">{t('nav.home')}</Link></li>
                <li><Link href={getLocalizedPath('/gallery')} className="hover:text-white">{t('nav.gallery')}</Link></li>
                <li><Link href={getLocalizedPath('/contact')} className="hover:text-white">{t('nav.contact')}</Link></li>
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