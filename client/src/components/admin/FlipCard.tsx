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
    console.log('🔄 FLIP TEST: Card clicked, flipping from', isFlipped, 'to', !isFlipped);
    console.log('🔄 FLIP TEST: Current transform will be:', !isFlipped ? 'rotateY(-180deg)' : 'rotateY(0deg)');
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
      {/* Static placeholder - maintains layout space */}
      <div 
        className="rounded-lg border-2 border-dashed border-blue-500"
        style={{
          height: '126px',
          backgroundColor: 'lightgray',
          visibility: isFlipped ? 'hidden' : 'visible' // Hide when flipped to avoid double content
        }}
      >
        <div className="p-4">
          {frontContent}
        </div>
      </div>
      
      {/* 3D Flip container - absolutely positioned overlay */}
      <div
        onClick={handleCardClick}
        className="absolute top-0 left-0 w-full cursor-pointer rounded-lg border-2 border-dashed border-blue-500"
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          transition: 'transform 0.6s',
          height: isFlipped ? '600px' : '126px', // Increased height to cover full chart area
          backgroundColor: isFlipped ? 'hotpink' : 'gold',
          zIndex: isFlipped ? 1000 : 1
        }}
      >
        {/* FRONT FACE */}
        <div
          ref={frontRef}
          className="absolute inset-0 rounded-lg"
          style={{ 
            backfaceVisibility: 'hidden',
            backgroundColor: 'lightgreen',
            padding: '1rem'
          }}
        >
          <div ref={frontInnerRef}>
            {frontContent}
          </div>
        </div>

        {/* BACK FACE - FORCED OPACITY FIX */}
        <div
          ref={backRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            zIndex: 9999,
            borderRadius: '8px',
            padding: 0,
            border: 'none',
            margin: 0,
            outline: 'none'
          }}
        >
          {/* SOLID BLUE IMAGE BLOCKER - NOTHING CAN BLEED THROUGH */}
          <img 
            src="data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='100%25' height='100%25' fill='%2389BAD9'/%3E%3C/svg%3E"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              zIndex: 10000,
              borderRadius: '8px',
              border: '2px dashed #3b82f6'
            }}
            alt=""
          />
          
          {/* CONTENT LAYER */}
          <div style={{
            position: 'relative',
            zIndex: 10001,
            padding: '16px',
            backgroundColor: 'transparent'
          }}>
            <div ref={backInnerRef} style={{
            backgroundColor: '#89BAD9',
            opacity: 1,
            width: '100%',
            height: '100%'
          }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '18px',
                fontWeight: '600',
                color: '#111827',
                marginBottom: '8px',
                backgroundColor: '#89BAD9',
                opacity: 1
              }}>
                <Users style={{ height: '20px', width: '20px', color: '#374151' }} />
                Recent Visitors
              </div>
              <div style={{
                fontSize: '14px',
                color: '#374151',
                marginBottom: '16px',
                backgroundColor: '#89BAD9',
                opacity: 1
              }}>
                Last {recentVisitors.length} unique visitors • Total: {uniqueVisitors}
              </div>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                backgroundColor: '#89BAD9',
                opacity: 1
              }}>
                {recentVisitors.length > 0 ? (
                  recentVisitors.map((visitor, index) => (
                    <div
                      key={visitor.ip_address + index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px',
                        borderRadius: '8px',
                        backgroundColor: '#ffffff',
                        border: '2px solid #d1d5db',
                        opacity: 1
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        flex: '1',
                        minWidth: 0,
                        backgroundColor: '#ffffff',
                        opacity: 1
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          flexShrink: 0,
                          backgroundColor: '#ffffff',
                          opacity: 1
                        }}>
                          <span style={{ fontSize: '18px', backgroundColor: '#ffffff', opacity: 1 }}>
                            {getCountryFlag(visitor.country)}
                          </span>
                          <span style={{ fontSize: '14px', backgroundColor: '#ffffff', opacity: 1 }}>
                            {getLanguageFlag(visitor.language)}
                          </span>
                        </div>
                        <div style={{ flex: '1', minWidth: 0, backgroundColor: '#ffffff', opacity: 1 }}>
                          <div style={{
                            fontSize: '14px',
                            fontWeight: '500',
                            color: '#111827',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            backgroundColor: '#ffffff',
                            opacity: 1
                          }}>
                            {visitor.ip_address}
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: '#374151',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            backgroundColor: '#ffffff',
                            opacity: 1
                          }}>
                            {visitor.country} • {visitor.language}
                          </div>
                        </div>
                      </div>
                      <div style={{
                        textAlign: 'right',
                        flexShrink: 0,
                        backgroundColor: '#ffffff',
                        opacity: 1
                      }}>
                        <div style={{
                          fontSize: '12px',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          backgroundColor: '#ffffff',
                          border: '1px solid #9ca3af',
                          color: '#374151',
                          opacity: 1
                        }}>
                          <Clock style={{ height: '12px', width: '12px', marginRight: '4px', display: 'inline' }} />
                          {formatDate(visitor.last_visit)}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{
                    textAlign: 'center',
                    padding: '32px 0',
                    color: '#374151',
                    backgroundColor: '#89BAD9',
                    opacity: 1
                  }}>
                    <Users style={{ height: '32px', width: '32px', margin: '0 auto 8px', color: '#6b7280' }} />
                    <p style={{ backgroundColor: '#89BAD9', opacity: 1 }}>No recent visitors found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}