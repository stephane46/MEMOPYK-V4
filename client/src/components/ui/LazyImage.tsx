import { useState } from 'react';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { cn } from '@/lib/utils';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholderClassName?: string;
  fallbackSrc?: string;
  onLoad?: (e?: React.SyntheticEvent<HTMLImageElement>) => void;
  onError?: () => void;
}

export function LazyImage({
  src,
  alt,
  className,
  placeholderClassName,
  fallbackSrc,
  onLoad,
  onError
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const { elementRef, hasIntersected } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '100px',
    triggerOnce: true
  });

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setIsLoaded(true);
    onLoad?.(e);
  };

  const handleError = (e?: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e?.currentTarget;
    console.log(`🚨 LAZY IMAGE ERROR for ${src}:`, {
      originalSrc: src,
      failedSrc: img?.src,
      fallbackSrc,
      hasError: true,
      willUseFallback: !!fallbackSrc,
      errorDetails: img ? {
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        complete: img.complete
      } : 'No image element'
    });
    setHasError(true);
    onError?.();
  };

  const currentSrc = hasError && fallbackSrc ? fallbackSrc : src;
  
  // Debug current src selection
  if (src.includes('AAA_002_0000014')) {
    console.log(`🔍 LAZY IMAGE SRC SELECTION for ${alt}:`, {
      originalSrc: src,
      fallbackSrc,
      hasError,
      currentSrc,
      isUsingFallback: hasError && !!fallbackSrc
    });
  }

  return (
    <div
      ref={elementRef as React.RefObject<HTMLDivElement>}
      className={cn(
        'relative overflow-hidden bg-gray-100',
        className
      )}
    >
      {/* Loading Placeholder */}
      {!isLoaded && (
        <div
          className={cn(
            'absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse',
            'bg-[length:200%_100%] animate-[shimmer_2s_infinite]',
            placeholderClassName
          )}
        />
      )}

      {/* Actual Image */}
      {hasIntersected && (
        <img
          src={currentSrc}
          alt={alt}
          onLoad={(e) => {
            console.log(`✅ ACTUAL IMAGE LOADED for ${alt}:`, {
              actualBrowserSrc: e.currentTarget.src,
              expectedReactSrc: currentSrc,
              srcMatches: e.currentTarget.src === currentSrc,
              browserLoadedCropped: e.currentTarget.src.includes('-C.jpg'),
              reactExpectedCropped: currentSrc.includes('-C.jpg'),
              PROBLEM: e.currentTarget.src.includes('-C.jpg') ? 'NONE - CROPPED LOADED' : 'BROWSER LOADING ORIGINAL INSTEAD OF CROPPED'
            });
            handleLoad(e);
          }}
          onError={handleError}
          className={cn(
            'transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0',
            className
          )}
          loading="lazy"
        />
      )}
    </div>
  );
}

// Add shimmer animation to global CSS if not already present
export const shimmerStyles = `
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
`;