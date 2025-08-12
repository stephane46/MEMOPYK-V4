import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, MapPin, Globe, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecentVisitor {
  ip_address: string;
  country: string;
  language: string;
  last_visit: string;
  user_agent: string;
}

interface FlipCardProps {
  frontContent: React.ReactNode;
  backContent?: React.ReactNode;
  className?: string;
  uniqueVisitors: number;
  recentVisitors?: RecentVisitor[];
}

export function FlipCard({ 
  frontContent, 
  backContent, 
  className, 
  uniqueVisitors, 
  recentVisitors = [] 
}: FlipCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        setIsFlipped(false);
      }
    }

    if (isFlipped) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFlipped]);

  const handleCardClick = () => {
    setIsFlipped(!isFlipped);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  const getLanguageFlag = (language: string) => {
    const langMap: { [key: string]: string } = {
      'fr-FR': '🇫🇷',
      'fr': '🇫🇷',
      'en-US': '🇺🇸',
      'en': '🇬🇧',
      'en-GB': '🇬🇧',
      'es': '🇪🇸',
      'de': '🇩🇪',
      'it': '🇮🇹'
    };
    return langMap[language] || '🌐';
  };

  const getCountryFlag = (country: string) => {
    const countryMap: { [key: string]: string } = {
      'France': '🇫🇷',
      'United States': '🇺🇸',
      'Canada': '🇨🇦',
      'United Kingdom': '🇬🇧',
      'Germany': '🇩🇪',
      'Spain': '🇪🇸',
      'Italy': '🇮🇹',
      'Switzerland': '🇨🇭',
      'Belgium': '🇧🇪',
      'Netherlands': '🇳🇱'
    };
    return countryMap[country] || '🌍';
  };

  return (
    <div 
      ref={cardRef}
      className={cn("flip-card-container", className)}
      style={{ perspective: '1000px' }}
    >
      <div 
        className="w-full h-full relative transition-transform duration-700 cursor-pointer"
        onClick={handleCardClick}
        style={{ 
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
        }}
      >
        {/* Front of card */}
        <div 
          className="absolute inset-0 w-full h-full"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <Card className="h-full hover:shadow-lg transition-shadow duration-300">
            {frontContent}
          </Card>
        </div>

        {/* Back of card */}
        <div 
          className="absolute inset-0 w-full h-full"
          style={{ 
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            backgroundColor: '#ffffff',
            background: '#ffffff',
            backgroundImage: 'none'
          }}
        >
          <div 
            className="h-full rounded-lg border border-gray-200 shadow-sm" 
            style={{ 
              backgroundColor: '#ffffff', 
              background: '#ffffff', 
              backgroundImage: 'none',
              position: 'relative',
              zIndex: 10
            }}
          >
            <div 
              className="pb-4 p-6" 
              style={{ 
                backgroundColor: '#ffffff', 
                background: '#ffffff', 
                backgroundImage: 'none' 
              }}
            >
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Users className="h-5 w-5" />
                Recent Visitors
              </div>
              <div className="text-sm text-gray-600">
                Last {recentVisitors.length} unique visitors
              </div>
            </div>
            <div 
              className="rounded-lg p-4" 
              style={{ 
                backgroundColor: '#ffffff', 
                background: '#ffffff', 
                backgroundImage: 'none',
                gap: '12px',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {recentVisitors.length > 0 ? (
                recentVisitors.map((visitor, index) => (
                  <div 
                    key={visitor.ip_address + index}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
                    style={{ backgroundColor: '#ffffff', background: '#ffffff', backgroundImage: 'none' }}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-lg">{getCountryFlag(visitor.country)}</span>
                        <span className="text-sm">{getLanguageFlag(visitor.language)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {visitor.ip_address}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-300 truncate">
                          {visitor.country} • {visitor.language}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant="outline" 
                        className="text-xs"
                      >
                        <Clock className="h-3 w-3 mr-1" />
                        {formatDate(visitor.last_visit)}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-600 dark:text-gray-300">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-70" />
                  <p>No recent visitors found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>


    </div>
  );
}