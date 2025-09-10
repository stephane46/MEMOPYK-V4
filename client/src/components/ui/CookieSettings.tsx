import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X } from 'lucide-react';

export interface CookieConsent {
  essential: boolean;
  analytics: boolean;
  timestamp: number;
}

interface CookieSettingsProps {
  isOpen: boolean;
  onSave: (consent: CookieConsent) => void;
  onCancel: () => void;
  currentConsent: CookieConsent | null;
}

export function CookieSettings({ isOpen, onSave, onCancel, currentConsent }: CookieSettingsProps) {
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);

  // Initialize state from current consent
  useEffect(() => {
    if (currentConsent) {
      setAnalyticsEnabled(currentConsent.analytics);
    }
  }, [currentConsent]);

  const handleSave = () => {
    const consent: CookieConsent = {
      essential: true, // Always true
      analytics: analyticsEnabled,
      timestamp: Date.now()
    };
    onSave(consent);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent 
        className="sm:max-w-lg w-full mx-4 bg-white"
        onKeyDown={handleKeyDown}
        aria-labelledby="cookie-settings-title"
        data-testid="cookie-settings-modal"
      >
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle id="cookie-settings-title" className="text-xl font-semibold text-gray-900">
            Cookie Settings
          </DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-8 w-8 p-0 hover:bg-gray-100"
            aria-label="Close cookie settings"
            data-testid="cookie-settings-close"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Essential Cookies */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-base font-medium text-gray-900">
                  Essential
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Needed for core features (language, navigation, security)
                </p>
              </div>
              <div className="flex items-center ml-4">
                <Switch 
                  checked={true} 
                  disabled={true}
                  aria-label="Essential cookies (always enabled)"
                  data-testid="essential-switch"
                />
                <span className="ml-2 text-xs text-gray-500">Always on</span>
              </div>
            </div>
          </div>

          {/* Analytics Cookies */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-base font-medium text-gray-900">
                  Analytics
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  GA4, Clarity, OpenReplay, and our own tools for engagement metrics. 
                  No ads, no remarketing, no cross-site tracking.
                </p>
              </div>
              <div className="flex items-center ml-4">
                <Switch 
                  checked={analyticsEnabled}
                  onCheckedChange={setAnalyticsEnabled}
                  aria-label="Analytics cookies"
                  data-testid="analytics-switch"
                />
              </div>
            </div>
          </div>

          {/* Demo Notice */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <p className="text-xs text-orange-800">
              <strong>Demo mode:</strong> This is a UI prototype. All tracking continues running regardless of your choice here.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
          <Button
            onClick={handleSave}
            className="bg-orange-500 hover:bg-orange-600 text-white flex-1"
            data-testid="cookie-settings-save"
          >
            Save preferences
          </Button>
          <Button
            onClick={onCancel}
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-50 flex-1"
            data-testid="cookie-settings-cancel"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}