import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '../ui/button';

interface ImageCropperEasyCropProps {
  imageUrl: string;
  onSave: (blob: Blob, cropSettings: any) => void;
  onCancel: () => void;
}

// Draggable cover component for 300×200 display with pan functionality
interface DraggableCoverProps {
  imageUrl: string;
  onPositionChange?: (pos: { x: number; y: number }) => void;
}

const DraggableCover: React.FC<DraggableCoverProps> = ({
  imageUrl,
  onPositionChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 50, y: 50 }); // start centered
  const [dragging, setDragging] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const dragStart = useRef<{ mouseX: number; mouseY: number; posX: number; posY: number } | null>(null);

  // Test image loading
  useEffect(() => {
    // Extract filename from Supabase URL
    const filename = imageUrl.split('/').pop()?.split('?')[0] || '';
    const proxyUrl = `/api/image-proxy?filename=${filename}`;
    console.log('🖼️ DraggableCover attempting to load:', proxyUrl);
    console.log('🖼️ Extracted filename from URL:', filename);
    
    const testImg = new Image();
    testImg.onload = () => {
      console.log('✅ DraggableCover image loaded successfully');
      setImageLoaded(true);
    };
    testImg.onerror = (error) => {
      console.error('❌ DraggableCover image failed to load:', error);
      console.error('❌ Original URL:', imageUrl);
      console.error('❌ Proxy URL:', proxyUrl);
      console.error('❌ Extracted filename:', filename);
    };
    testImg.src = proxyUrl;
  }, [imageUrl]);

  // Mouse down: record start positions
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = containerRef.current!.getBoundingClientRect();
    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: pos.x,
      posY: pos.y,
    };
    setDragging(true);
  };

  // Mouse move: calculate delta and update pos (clamped 0–100)
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging || !dragStart.current) return;
    const rect = containerRef.current!.getBoundingClientRect();
    const dx = e.clientX - dragStart.current.mouseX;
    const dy = e.clientY - dragStart.current.mouseY;
    const deltaX = (dx / rect.width) * 100;
    const deltaY = (dy / rect.height) * 100;
    let newX = dragStart.current.posX + deltaX;
    let newY = dragStart.current.posY + deltaY;
    newX = Math.min(100, Math.max(0, newX));
    newY = Math.min(100, Math.max(0, newY));
    setPos({ x: newX, y: newY });
    onPositionChange?.({ x: newX, y: newY });
  }, [dragging, onPositionChange]);

  // Mouse up: stop dragging
  const handleMouseUp = useCallback(() => {
    if (dragging) setDragging(false);
  }, [dragging]);

  // Attach global listeners when dragging
  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, handleMouseMove, handleMouseUp]);

  // Extract filename from Supabase URL for display
  const filename = imageUrl.split('/').pop()?.split('?')[0] || '';
  const proxyUrl = `/api/image-proxy?filename=${filename}`;

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      style={{
        width: 300,
        height: 200,
        overflow: 'hidden',
        cursor: dragging ? 'grabbing' : 'grab',
        backgroundImage: imageLoaded ? `url("${proxyUrl}")` : 'none',
        backgroundColor: imageLoaded ? 'transparent' : '#f3f4f6',
        backgroundSize: 'cover',
        backgroundPosition: `${pos.x}% ${pos.y}%`,
        borderRadius: 8,
        userSelect: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {!imageLoaded && (
        <div className="text-gray-500 text-sm">
          Chargement de l'image...
        </div>
      )}
    </div>
  );
};

export default function ImageCropperEasyCrop({ imageUrl, onSave, onCancel }: ImageCropperEasyCropProps) {
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 50 }); // track position for canvas generation

  // Debug log the received image URL
  useEffect(() => {
    console.log('🎨 ImageCropperEasyCrop received imageUrl:', imageUrl);
  }, [imageUrl]);

  const generateStaticImage = async () => {
    setLoading(true);
    try {
      // Create a canvas to generate the 300×200 static image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      // Set canvas to high-DPI dimensions for maximum sharpness
      const dpr = window.devicePixelRatio || 1;
      canvas.width = 300 * dpr;
      canvas.height = 200 * dpr;

      console.log(`🎨 Canvas generation: DPR=${dpr}, Canvas backing store: ${canvas.width}×${canvas.height}px`);

      // Scale context back to CSS pixels while maintaining high-DPI backing store
      ctx.scale(dpr, dpr);

      // Load the image using proxy to solve CORS issues
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      // Use image proxy for canvas generation too
      const filename = imageUrl.split('/').pop()?.split('?')[0] || '';
      const proxyUrl = `/api/image-proxy?filename=${filename}`;
      console.log(`🖼️ Canvas loading image via proxy: ${proxyUrl}`);
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          console.log(`✅ Canvas image loaded successfully: ${img.naturalWidth}×${img.naturalHeight}`);
          resolve();
        };
        img.onerror = (error) => {
          console.error(`❌ Canvas image failed to load:`, error);
          console.error(`❌ Original URL:`, imageUrl);
          console.error(`❌ Proxy URL:`, proxyUrl);
          reject(new Error(`Failed to load image: ${imageUrl}`));
        };
        img.src = proxyUrl;
      });

      // Calculate background-size: cover dimensions
      const imgAspect = img.naturalWidth / img.naturalHeight;
      const canvasAspect = 300 / 200;

      let scaledWidth, scaledHeight;
      if (imgAspect > canvasAspect) {
        // Image is wider - fit to height, crop width
        scaledHeight = 200;
        scaledWidth = scaledHeight * imgAspect;
      } else {
        // Image is taller - fit to width, crop height
        scaledWidth = 300;
        scaledHeight = scaledWidth / imgAspect;
      }

      console.log(`📐 Original: ${img.naturalWidth}×${img.naturalHeight} (${imgAspect.toFixed(2)})`);
      console.log(`📐 Scaled: ${scaledWidth}×${scaledHeight} covering 300×200`);

      // Calculate position offset based on background-position percentages
      const offsetX = (position.x / 100) * (300 - scaledWidth);
      const offsetY = (position.y / 100) * (200 - scaledHeight);
      
      console.log(`📍 Position: ${position.x}%,${position.y}% → Offset: ${offsetX.toFixed(1)},${offsetY.toFixed(1)}`);

      // Maximum quality settings for sharpest results
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw the image with position offset
      ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);

      // Convert to PNG blob for lossless quality and maximum sharpness
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob!);
        }, 'image/png');
      });

      // Save with position data and high-DPI info
      const cropSettings = {
        method: 'draggable-cover-hd',
        position: position,
        devicePixelRatio: dpr,
        originalDimensions: { width: img.naturalWidth, height: img.naturalHeight },
        outputDimensions: { width: 300, height: 200 },
        format: 'PNG'
      };
      
      onSave(blob, cropSettings);
      
    } catch (error) {
      console.error('Error generating static image:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Glissez pour repositionner l'image dans le cadre 300×200
        </p>
        
        {/* 300×200 Draggable Preview Box */}
        <div className="mx-auto">
          <DraggableCover 
            imageUrl={imageUrl} 
            onPositionChange={setPosition}
          />
        </div>
        
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Position: {position.x.toFixed(0)}% x {position.y.toFixed(0)}%
        </p>
      </div>

      {/* Action Button */}
      <div className="flex justify-center">
        <Button 
          onClick={generateStaticImage}
          disabled={loading}
          className="bg-[#2A4759] hover:bg-[#1e3340] text-white px-8 py-3"
        >
          {loading ? 'Génération...' : 'Générer Image Statique (300×200)'}
        </Button>
      </div>
    </div>
  );
}