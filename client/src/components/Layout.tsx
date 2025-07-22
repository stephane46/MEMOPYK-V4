import { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useLanguage } from '../contexts/LanguageContext';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { t, language, setLanguage } = useLanguage();
  const [location] = useLocation();

  const navigation = [
    { name: t('nav.home'), href: '/' },
    { name: t('nav.gallery'), href: '/gallery' },
    { name: t('nav.contact'), href: '/contact' },
    { name: t('nav.admin'), href: '/admin' },
  ];

  const toggleLanguage = () => {
    setLanguage(language === 'fr' ? 'en' : 'fr');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/">
              <a className="text-2xl font-bold text-gray-800">
                MEMOPYK
              </a>
            </Link>

            {/* Navigation Links */}
            <div className="hidden md:flex space-x-8">
              {navigation.map((item) => (
                <Link key={item.href} href={item.href}>
                  <a className={`text-sm font-medium transition-colors ${
                    location === item.href
                      ? 'text-blue-600 border-b-2 border-blue-600 pb-1'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}>
                    {item.name}
                  </a>
                </Link>
              ))}
            </div>

            {/* Language Toggle & Mobile Menu */}
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleLanguage}
                className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                <span className="text-lg">
                  {language === 'fr' ? '🇫🇷' : '🇺🇸'}
                </span>
                <span>{language.toUpperCase()}</span>
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
                <Link key={item.href} href={item.href}>
                  <a className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    location === item.href
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}>
                    {item.name}
                  </a>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-2xl font-bold mb-4">MEMOPYK</h3>
              <p className="text-gray-400 mb-4">
                {language === 'fr' 
                  ? 'Créateur de films mémoire pour immortaliser vos moments précieux.'
                  : 'Memory film creator to immortalize your precious moments.'
                }
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">
                {language === 'fr' ? 'Liens Rapides' : 'Quick Links'}
              </h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/"><a className="hover:text-white">{t('nav.home')}</a></Link></li>
                <li><Link href="/gallery"><a className="hover:text-white">{t('nav.gallery')}</a></Link></li>
                <li><Link href="/contact"><a className="hover:text-white">{t('nav.contact')}</a></Link></li>
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
            <p>&copy; 2025 MEMOPYK. {language === 'fr' ? 'Tous droits réservés.' : 'All rights reserved.'}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}