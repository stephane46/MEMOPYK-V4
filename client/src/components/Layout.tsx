import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useLanguage } from '../contexts/LanguageContext';
import { Menu, X, Mail, Phone } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';

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

  // Handle scroll to section after navigation
  useEffect(() => {
    const scrollToSection = sessionStorage.getItem('scrollToSection');
    if (scrollToSection) {
      sessionStorage.removeItem('scrollToSection');
      // Use a small timeout to ensure the page is fully loaded
      setTimeout(() => {
        const element = document.getElementById(scrollToSection);
        if (element) {
          const headerHeight = 64; // Fixed header height (h-16 = 4rem = 64px)
          const elementPosition = element.offsetTop;
          const offsetPosition = elementPosition - headerHeight;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  }, [location]);

  // Handle anchor scrolling
  const handleAnchorClick = (sectionId: string) => {
    // First navigate to home page if not already there
    const cleanLocation = location.replace(/^\/(fr-FR|en-US)/, '') || '/';
    if (cleanLocation !== '/') {
      // Store the section ID in sessionStorage so we can scroll after navigation
      sessionStorage.setItem('scrollToSection', sectionId);
      window.location.href = getLocalizedPath('/');
    } else {
      const element = document.getElementById(sectionId);
      if (element) {
        const headerHeight = 64; // Fixed header height (h-16 = 4rem = 64px)
        const elementPosition = element.offsetTop;
        const offsetPosition = elementPosition - headerHeight;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    }
  };

  const navigation = [
    { 
      name: t('nav.how-it-works'), 
      type: 'anchor', 
      sectionId: 'how-it-works' 
    },
    { 
      name: t('nav.gallery'), 
      type: 'anchor', 
      sectionId: 'gallery' 
    },
    { 
      name: t('nav.quote'), 
      type: 'anchor', 
      sectionId: 'cta' 
    },
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
            <Link 
              href={getLocalizedPath('/')} 
              className="flex items-center"
              onClick={() => {
                // Always scroll to top when logo is clicked
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <img 
                src="/logo.svg" 
                alt="MEMOPYK" 
                className="h-8 w-auto cursor-pointer"
              />
            </Link>

            {/* Navigation Links - Hidden on mobile */}
            <div className="hidden lg:flex space-x-6">
              {navigation.map((item, index) => {
                if (item.type === 'anchor') {
                  return (
                    <button
                      key={`nav-${index}`}
                      onClick={() => handleAnchorClick(item.sectionId)}
                      className="text-sm font-medium transition-colors text-gray-600 hover:text-memopyk-navy cursor-pointer"
                    >
                      {item.name}
                    </button>
                  );
                } else if (item.type === 'external') {
                  return (
                    <a
                      key={`nav-${index}`}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium transition-colors text-gray-600 hover:text-memopyk-navy"
                    >
                      {item.name}
                    </a>
                  );
                }
                return null;
              })}
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
                    className="w-8 h-5 object-cover rounded"
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
                    className="w-8 h-5 object-cover rounded"
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
              {navigation.map((item, index) => {
                if (item.type === 'anchor') {
                  return (
                    <button
                      key={`mobile-nav-${index}`}
                      onClick={() => {
                        handleAnchorClick(item.sectionId);
                        setIsMobileMenuOpen(false);
                      }}
                      className="block w-full text-left px-4 py-3 rounded-md text-base font-medium transition-all duration-200 min-h-[44px] flex items-center text-gray-600 hover:text-memopyk-navy hover:bg-gray-50 hover:border-l-4 hover:border-memopyk-blue-gray"
                    >
                      {item.name}
                    </button>
                  );
                } else if (item.type === 'external') {
                  return (
                    <a
                      key={`mobile-nav-${index}`}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block px-4 py-3 rounded-md text-base font-medium transition-all duration-200 min-h-[44px] flex items-center text-gray-600 hover:text-memopyk-navy hover:bg-gray-50 hover:border-l-4 hover:border-memopyk-blue-gray"
                    >
                      {item.name}
                    </a>
                  );
                }
                return null;
              })}
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
                  ? 'Créateur de films souvenirs pour immortaliser vos moments les plus précieux.'
                  : 'Creator of souvenir films to immortalize your most precious moments.'
                }
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">
                {language === 'fr-FR' ? 'Navigation' : 'Navigation'}
              </h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <button 
                    onClick={() => handleAnchorClick('how-it-works')}
                    className="hover:text-white transition-colors"
                  >
                    {t('nav.how-it-works')}
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => handleAnchorClick('gallery')}
                    className="hover:text-white transition-colors"
                  >
                    {t('nav.gallery')}
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => handleAnchorClick('cta')}
                    className="hover:text-white transition-colors"
                  >
                    {t('nav.quote')}
                  </button>
                </li>

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
              <ul className="space-y-3 text-gray-400">
                <li className="group">
                  <a 
                    href="mailto:contact@memopyk.com"
                    className="flex items-center gap-3 hover:text-white transition-all duration-300 ease-in-out transform hover:translate-x-1 cursor-pointer p-2 -m-2 rounded-lg"
                  >
                    <Mail className="w-4 h-4 group-hover:text-memopyk-orange transition-colors duration-300" />
                    <span className="group-hover:underline">contact@memopyk.com</span>
                  </a>
                </li>
                <li className="group">
                  <a 
                    href="https://wa.me/33745843821"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 hover:text-white transition-all duration-300 ease-in-out transform hover:translate-x-1 cursor-pointer p-2 -m-2 rounded-lg"
                  >
                    <FaWhatsapp className="w-4 h-4 group-hover:text-green-500 transition-colors duration-300" />
                    <span className="group-hover:underline">(+33) 07 45 84 38 21</span>
                  </a>
                </li>
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