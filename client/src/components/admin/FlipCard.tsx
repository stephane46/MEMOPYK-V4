import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Clock } from 'lucide-react';
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

  // Refs
  const hostRef = useRef<HTMLDivElement>(null);        // outer host (with perspective)
  const heightShellRef = useRef<HTMLDivElement>(null); // animates height
  const rotatorRef = useRef<HTMLDivElement>(null);     // the 3D-rotating element
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const frontInnerRef = useRef<HTMLDivElement>(null);
  const backInnerRef = useRef<HTMLDivElement>(null);

  const [containerHeight, setContainerHeight] = useState<number>(0);
  
  // Debug: Log when containerHeight changes
  useEffect(() => {
    console.log('DEBUG: containerHeight changed to:', containerHeight);
  }, [containerHeight]);

  // ---- Step 1: SOLID WHITE, CLIPPED, SEAM-FREE FLIP WRAPPER ----
  // (Handled by classes/inline styles on rotator + faces below.)

  // ---- Step 2: AUTO-RESIZE CONTAINER TO VISIBLE FACE ----
  const measure = () => {
    const el = isFlipped ? backInnerRef.current : frontInnerRef.current;
    if (!el) {
      console.log('DEBUG: No element found for measurement', { isFlipped, frontInnerRef: frontInnerRef.current, backInnerRef: backInnerRef.current });
      return;
    }
    const h = el.getBoundingClientRect().height;
    console.log('DEBUG: Measured height', { element: el, height: h, isFlipped });
    setContainerHeight(Math.max(Math.ceil(h), 120)); // Minimum 120px
  };

  // Measure on mount/flip/content change
  useLayoutEffect(() => {
    console.log('DEBUG: useLayoutEffect triggered', { isFlipped, recentVisitorsLength: recentVisitors?.length });
    measure();
    // re-measure next frame for font reflow
    const id = requestAnimationFrame(() => {
      console.log('DEBUG: requestAnimationFrame measure');
      measure();
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFlipped, recentVisitors?.length]);

  // ResizeObserver + window resize + font load
  useEffect(() => {
    const roFront = frontInnerRef.current ? new ResizeObserver(measure) : null;
    const roBack = backInnerRef.current ? new ResizeObserver(measure) : null;
    if (frontInnerRef.current && roFront) roFront.observe(frontInnerRef.current);
    if (backInnerRef.current && roBack) roBack.observe(backInnerRef.current);

    const onResize = () => measure();
    window.addEventListener('resize', onResize);

    // If custom web fonts load later, re-measure
    if ((document as any).fonts?.ready) {
      (document as any).fonts.ready.then(() => measure()).catch(() => {});
    }

    return () => {
      window.removeEventListener('resize', onResize);
      roFront?.disconnect();
      roBack?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Click outside to close
  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      if (!hostRef.current) return;
      if (!hostRef.current.contains(e.target as Node)) {
        setIsFlipped(false);
      }
    };
    if (isFlipped) document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [isFlipped]);

  const handleCardClick = () => {
    console.log('DEBUG: Card clicked, flipping from', isFlipped, 'to', !isFlipped);
    setIsFlipped(v => !v);
  };

  // Utilities for the sample back content
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
    const map: Record<string, string> = {
      'fr-FR': '🇫🇷', 'fr': '🇫🇷',
      'en-US': '🇺🇸', 'en-GB': '🇬🇧', 'en': '🇬🇧',
      'es': '🇪🇸', 'de': '🇩🇪', 'it': '🇮🇹'
    };
    return map[language] ?? '🌐';
  };

  const getCountryFlag = (country: string) => {
    const map: Record<string, string> = {
      'France': '🇫🇷', 'United States': '🇺🇸', 'Canada': '🇨🇦',
      'United Kingdom': '🇬🇧', 'Germany': '🇩🇪', 'Spain': '🇪🇸',
      'Italy': '🇮🇹', 'Switzerland': '🇨🇭', 'Belgium': '🇧🇪', 'Netherlands': '🇳🇱'
    };
    return map[country] ?? '🌍';
  };

  return (
    <div
      ref={hostRef}
      className={cn('flip-card-container', className)}
      style={{ perspective: '1000px' }}
    >
      {/* Height shell: grows/shrinks to match visible face */}
      <div
        ref={heightShellRef}
        style={{
          height: containerHeight ? `${containerHeight}px` : 'auto',
          minHeight: '120px',
          transition: 'height 300ms ease',
          backgroundColor: 'transparent'
        }}
      >
        {/* Rotator: unified white surface, rounded, clipped; avoids seams */}
        <div
          ref={rotatorRef}
          className="relative w-full cursor-pointer transition-transform duration-500 rounded-lg overflow-hidden bg-white dark:bg-gray-800"
          onClick={(e) => {
            handleCardClick();
          }}
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(-180deg)' : 'rotateY(0deg)',
            willChange: 'transform',
            translate: '0',                 // promote to its own layer (helps against hairline gaps)
            isolation: 'isolate',
            minHeight: '120px'
            // Optional polish to erase rare sub-pixel gaps on some GPUs:
            // outline: '1px solid white'
          }}
          role="button"
          aria-pressed={isFlipped}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleCardClick();
            }
          }}
        >
          {/* FRONT FACE */}
          <div
            ref={frontRef}
            className="absolute inset-0 w-full bg-white dark:bg-gray-800 pointer-events-none"
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(0deg) translateZ(0)' }}
          >
            <div 
              ref={frontInnerRef} 
              className="relative pointer-events-auto cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCardClick();
              }}
            >
              {frontContent}
            </div>
          </div>

          {/* BACK FACE */}
          <div
            ref={backRef}
            className="absolute inset-0 w-full bg-white dark:bg-gray-800 pointer-events-none"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg) translateZ(0)'
            }}
          >
            <div 
              ref={backInnerRef} 
              className="relative pointer-events-auto cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCardClick();
              }}
            >
              <div 
                className="h-full w-full p-6 bg-white dark:bg-gray-800"
              >
              <div className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-2">
                <Users className="h-5 w-5 text-gray-700" />
                Recent Visitors
              </div>
              <div className="text-sm text-gray-700 mb-4">
                Last {recentVisitors.length} unique visitors • Total: {uniqueVisitors}
              </div>

              <div className="flex flex-col gap-3">
                {recentVisitors.length > 0 ? (
                  recentVisitors.map((visitor, index) => (
                    <div
                      key={visitor.ip_address + index}
                      className="flex items-center justify-between p-3 rounded-lg border-2 border-gray-300 bg-gray-50"
                      style={{
                        backgroundColor: '#f9fafb',
                        border: '2px solid #d1d5db'
                      }}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-lg">
                            {getCountryFlag(visitor.country)}
                          </span>
                          <span className="text-sm">
                            {getLanguageFlag(visitor.language)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {visitor.ip_address}
                          </div>
                          <div className="text-xs text-gray-700 truncate">
                            {visitor.country} • {visitor.language}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div 
                          className="text-xs px-2 py-1 rounded border bg-white text-gray-700"
                          style={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #9ca3af'
                          }}
                        >
                          <Clock className="h-3 w-3 mr-1 inline" />
                          {formatDate(visitor.last_visit)}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-700">
                    <Users className="h-8 w-8 mx-auto mb-2 text-gray-500" />
                    <p>No recent visitors found</p>
                  </div>
                )}
              </div>
              </div>
            </div>
          </div>
        </div>
        {/* /rotator */}
      </div>
      {/* /height shell */}
    </div>
  );
}