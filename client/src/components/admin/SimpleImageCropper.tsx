import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';

// Diagnostic helper: compares the previewed element vs the exported blob
async function logDisplayDiagnostics(previewEl: HTMLElement | null, blobUrl: string) {
  if (!previewEl) {
    console.warn('[Diag] preview element is null');
    return;
  }

  const cs = getComputedStyle(previewEl);
  console.group('[Diag] Image Display Diagnostics');

  // Basic computed style checks
  console.log('mix-blend-mode:', cs.mixBlendMode);
  console.log('opacity:', cs.opacity);
  console.log('filter:', cs.filter);
  console.log('background:', cs.background);
  console.log('has ::before content:', getComputedStyle(previewEl, '::before').content);
  console.log('has ::after content:', getComputedStyle(previewEl, '::after').content);

  // Determine what image the preview is actually showing
  let displayedUrl: string | null = null;
  if (previewEl.tagName === 'IMG') {
    displayedUrl = (previewEl as HTMLImageElement).src;
  } else {
    const bg = cs.backgroundImage;
    if (bg && bg.startsWith('url(')) {
      displayedUrl = bg.slice(4, -1).replace(/["']/g, '');
    }
  }
  console.log('Displayed image URL:', displayedUrl);
  console.log('Exported blob URL:', blobUrl);
  if (displayedUrl === blobUrl) {
    console.log('✅ Preview is using the exported blob.');
  } else {
    console.warn('⚠️ Preview is NOT using the exported blob (might be showing original source or something else).');
  }

  // Optional: compare average color of displayed vs blob image to detect visual alteration
  const loadImage = (url: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(`Failed to load image: ${url}`);
      img.src = url;
    });

  try {
    if (displayedUrl) {
      const [displayedImg, blobImg] = await Promise.all([loadImage(displayedUrl), loadImage(blobUrl)]);
      const avgColor = (img: HTMLImageElement) => {
        const c = document.createElement('canvas');
        c.width = Math.min(50, img.naturalWidth);
        c.height = Math.min(50, img.naturalHeight);
        const ctx = c.getContext('2d')!;
        ctx.drawImage(img, 0, 0, c.width, c.height);
        const data = ctx.getImageData(0, 0, c.width, c.height).data;
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }
        return { r: r / count, g: g / count, b: b / count };
      };
      const avgDisplayed = avgColor(displayedImg);
      const avgBlob = avgColor(blobImg);
      console.log('Average RGB of displayed image:', avgDisplayed);
      console.log('Average RGB of blob image:', avgBlob);
      const diff = {
        dr: Math.abs(avgDisplayed.r - avgBlob.r),
        dg: Math.abs(avgDisplayed.g - avgBlob.g),
        db: Math.abs(avgDisplayed.b - avgBlob.b),
      };
      console.log('Average color difference:', diff);
      if (diff.dr > 5 || diff.dg > 5 || diff.db > 5) {
        console.warn('[Diag] Significant average color difference; display may be altered or a different image is shown.');
      } else {
        console.log('[Diag] Displayed image and blob are similar in average color.');
      }
    }
  } catch (e) {
    console.warn('[Diag] Image comparison failed:', e);
  }

  console.groupEnd();
}

interface SimpleImageCropperProps {
  imageUrl: string;
  onSave: (blob: Blob, settings: any) => void;
  onCancel: () => void;
}

const DraggableCover = ({ imageUrl, onPositionChange, previewRef }: { imageUrl: string; onPositionChange: (pos: { x: number; y: number }) => void; previewRef: React.RefObject<HTMLDivElement> }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    const newPos = {
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y))
    };
    
    setPosition(newPos);
    onPositionChange(newPos);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div
      ref={previewRef}
      className={`w-[300px] h-[200px] border-2 border-gray-300 relative overflow-hidden ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        backgroundImage: imageLoaded ? `url(${imageUrl})` : undefined,
        backgroundColor: imageLoaded ? 'transparent' : '#f3f4f6',
        backgroundSize: 'cover',
        backgroundPosition: `${position.x}% ${position.y}%`,
        borderRadius: 8,
        userSelect: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <img
        src={imageUrl}
        onLoad={() => setImageLoaded(true)}
        style={{ display: 'none' }}
        alt=""
      />
      {!imageLoaded && (
        <div className="text-gray-500 text-sm">
          Chargement de l'image...
        </div>
      )}
    </div>
  );
};

export default function SimpleImageCropper({ imageUrl, onSave, onCancel }: SimpleImageCropperProps) {
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const previewRef = useRef<HTMLDivElement>(null);

  const generateImage = async () => {
    setLoading(true);
    
    try {
      console.log('🚀 SIMPLE IMAGE CROPPER: Starting basic canvas generation');
      
      // EXPERT FIX: Minimal canvas sequence for guaranteed white-backed JPEG
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = 300 * dpr;
      canvas.height = 200 * dpr;
      ctx.scale(dpr, dpr);

      // Base white background
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, 300, 200);
      console.log('✅ Expert fix: White base background applied');
      
      // Load image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = imageUrl;
      });
      
      console.log('✅ Image loaded successfully');
      
      // Calculate positioning for cover effect
      const scale = Math.max(300 / img.naturalWidth, 200 / img.naturalHeight);
      const scaledWidth = img.naturalWidth * scale;
      const scaledHeight = img.naturalHeight * scale;
      
      const offsetX = (scaledWidth - 300) * (-position.x / 100);
      const offsetY = (scaledHeight - 200) * (-position.y / 100);
      
      // Draw the image with proper composite operation
      ctx.globalCompositeOperation = 'source-over';
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
      console.log('✅ Image drawn on canvas');
      
      // Export as JPEG with maximum quality
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          console.log('✅ Expert fix: JPEG blob created:', blob?.size, 'bytes');
          // Create blob URL for direct inspection
          const blobUrl = URL.createObjectURL(blob!);
          console.log('🔍 DIRECT BLOB URL for inspection:', blobUrl);
          console.log('📋 Open this URL in new tab to verify white background');
          
          // Run diagnostic helper after a short delay to allow any DOM updates
          setTimeout(() => {
            if (previewRef.current) {
              previewRef.current.style.outline = '2px solid magenta';
              logDisplayDiagnostics(previewRef.current, blobUrl);
            }
          }, 100);
          
          resolve(blob!);
        }, 'image/jpeg', 1.0);
      });

      const settings = {
        method: 'expert-minimal-fix',
        position: position,
        dimensions: { width: 300, height: 200 },
        format: 'JPEG',
        quality: 1.0,
        devicePixelRatio: dpr
      };
      
      onSave(blob, settings);
      
    } catch (error) {
      console.error('Error generating image:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="mb-2 p-2 bg-green-100 border border-green-300 rounded">
          <span className="text-green-800 font-bold">✅ EXPERT FIX APPLIED - Minimal Canvas Sequence</span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Glissez pour repositionner l'image dans le cadre 300×200
        </p>
        
        <div className="mx-auto">
          <DraggableCover 
            imageUrl={imageUrl} 
            onPositionChange={setPosition}
            previewRef={previewRef}
          />
        </div>
        
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Position: {position.x.toFixed(0)}% x {position.y.toFixed(0)}%
        </p>
      </div>

      <div className="flex justify-center gap-4">
        <Button 
          onClick={onCancel}
          variant="outline"
          className="px-6"
        >
          Annuler
        </Button>
        <Button 
          onClick={generateImage}
          disabled={loading}
          className="bg-[#2A4759] hover:bg-[#1e3340] text-white px-8"
        >
          {loading ? 'Génération...' : 'Générer Image Simple (300×200)'}
        </Button>
      </div>
    </div>
  );
}