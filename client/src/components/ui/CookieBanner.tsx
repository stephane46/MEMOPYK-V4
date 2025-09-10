import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CookieSettings } from './CookieSettings';
import { useToast } from '@/hooks/use-toast';

export interface CookieConsent {
  essential: boolean;
  analytics: boolean;
  timestamp: number;
}

interface CookieBannerProps {
  onFooterSettingsClick?: () => void;
}

export function CookieBanner({ onFooterSettingsClick }: CookieBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { toast } = useToast();

  // Check if banner should be shown on mount
  useEffect(() => {
    const consent = getStoredConsent();
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  // Handle footer settings click
  useEffect(() => {
    if (onFooterSettingsClick) {
      // This will be called from footer
      const handleFooterClick = () => setShowSettings(true);
      window.addEventListener('memopyk-cookie-settings', handleFooterClick);
      return () => window.removeEventListener('memopyk-cookie-settings', handleFooterClick);
    }
  }, [onFooterSettingsClick]);

  const getStoredConsent = (): CookieConsent | null => {
    try {
      const stored = localStorage.getItem('memopyk-consent-demo');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  };

  const saveConsent = (consent: CookieConsent) => {
    try {
      localStorage.setItem('memopyk-consent-demo', JSON.stringify(consent));
    } catch {
      // Ignore localStorage errors in demo
    }
  };

  const handleAcceptAll = () => {
    const consent: CookieConsent = {
      essential: true,
      analytics: true,
      timestamp: Date.now()
    };
    saveConsent(consent);
    setIsVisible(false);
    
    toast({
      title: "Preference saved: analytics ON",
      description: "We'll use analytics to improve your experience.",
      duration: 2000,
    });
  };

  const handleReject = () => {
    const consent: CookieConsent = {
      essential: true,
      analytics: false,
      timestamp: Date.now()
    };
    saveConsent(consent);
    setIsVisible(false);
    
    toast({
      title: "Preference saved: analytics OFF",
      description: "Only essential cookies will be used.",
      duration: 2000,
    });
  };

  const handleSettings = () => {
    setShowSettings(true);
  };

  const handleSettingsSave = (consent: CookieConsent) => {
    saveConsent(consent);
    setIsVisible(false);
    setShowSettings(false);
    
    const analyticsStatus = consent.analytics ? "ON" : "OFF";
    toast({
      title: `Preference saved: analytics ${analyticsStatus}`,
      description: consent.analytics 
        ? "We'll use analytics to improve your experience."
        : "Only essential cookies will be used.",
      duration: 2000,
    });
  };

  const handleSettingsCancel = () => {
    setShowSettings(false);
  };

  if (!isVisible && !showSettings) {
    return null;
  }

  return (
    <>
      {/* Cookie Banner */}
      {isVisible && (
        <div 
          className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg"
          role="banner"
          aria-label="Cookie consent banner"
        >
          <div className="max-w-7xl mx-auto p-4 sm:p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Banner Content */}
              <div className="flex-1 text-sm text-gray-700 leading-relaxed">
                <p className="mb-3 font-medium text-gray-900">
                  At MEMOPYK, your memories are private.
                </p>
                <p>
                  We only use essential cookies to run the site, and optional analytics to learn things like 
                  "Do people watch our sample films?" so we can keep making them better. 
                  We never use cookies for advertising, remarketing, or tracking you beyond MEMOPYK.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 lg:flex-shrink-0">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={handleAcceptAll}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2"
                    data-testid="cookie-accept-all"
                  >
                    Accept all
                  </Button>
                  <Button
                    onClick={handleReject}
                    variant="outline"
                    className="border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-2"
                    data-testid="cookie-reject"
                  >
                    Reject
                  </Button>
                  <Button
                    onClick={handleSettings}
                    variant="ghost"
                    className="text-gray-600 hover:bg-gray-100 px-6 py-2"
                    data-testid="cookie-settings"
                  >
                    Settings
                  </Button>
                </div>
                
                {/* Policy Links */}
                <div className="flex justify-end sm:justify-start lg:justify-end gap-4 text-xs text-gray-500 mt-2 sm:mt-0 lg:ml-4">
                  <a 
                    href="/cookie-policy" 
                    className="hover:text-gray-700 underline"
                    data-testid="cookie-policy-link"
                  >
                    Cookie Policy
                  </a>
                  <a 
                    href="/privacy-policy" 
                    className="hover:text-gray-700 underline"
                    data-testid="privacy-policy-link"
                  >
                    Privacy Policy
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <CookieSettings
          isOpen={showSettings}
          onSave={handleSettingsSave}
          onCancel={handleSettingsCancel}
          currentConsent={getStoredConsent()}
        />
      )}
    </>
  );
}

// Export utility functions for footer integration
export const openCookieSettings = () => {
  window.dispatchEvent(new CustomEvent('memopyk-cookie-settings'));
};

export const getCookieConsent = (): CookieConsent | null => {
  try {
    const stored = localStorage.getItem('memopyk-consent-demo');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};