import React, { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
  currentLanguage: 'en' | 'fr';
  onLanguageSwitch: (lang: 'en' | 'fr') => void;
}

export function Layout({ children, currentLanguage, onLanguageSwitch }: LayoutProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Simple header for now */}
      <header className="bg-blue-600 text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">MEMOPYK</h1>
          <div className="flex gap-2">
            <button 
              onClick={() => onLanguageSwitch('en')}
              className={`px-3 py-1 rounded ${currentLanguage === 'en' ? 'bg-blue-800' : 'bg-blue-500'}`}
            >
              EN
            </button>
            <button 
              onClick={() => onLanguageSwitch('fr')}
              className={`px-3 py-1 rounded ${currentLanguage === 'fr' ? 'bg-blue-800' : 'bg-blue-500'}`}
            >
              FR
            </button>
          </div>
        </div>
      </header>
      
      {/* Content */}
      <main className="pt-4">{children}</main>
    </div>
  );
}