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

  // Test image loading - handle both proxy URLs and direct Supabase URLs
  useEffect(() => {
    console.log('🖼️ DraggableCover imageUrl received:', imageUrl);
    
    let finalUrl = imageUrl;
    
    // If it's already a full URL, use it directly with cache-busting
    if (imageUrl.startsWith('http')) {
      const timestamp = Date.now();
      const separator = imageUrl.includes('?') ? '&' : '?';
      finalUrl = `${imageUrl}${separator}cacheBust=${timestamp}&nocache=1`;
      console.log('🖼️ Using direct URL with cache-busting:', finalUrl);
    } else {
      // Extract filename and use proxy
      const filename = imageUrl.split('/').pop()?.split('?')[0] || '';
      finalUrl = `/api/image-proxy?filename=${filename}`;
      console.log('🖼️ Using proxy URL:', finalUrl);
    }
    
    const testImg = new Image();
    testImg.crossOrigin = 'anonymous';
    testImg.onload = () => {
      console.log('✅ DraggableCover image loaded successfully');
      setImageLoaded(true);
    };
    testImg.onerror = (error) => {
      console.error('❌ DraggableCover image failed to load:', error);
      console.error('❌ Original imageUrl:', imageUrl);
      console.error('❌ Final URL:', finalUrl);
    };
    testImg.src = finalUrl;
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

  // Get final URL for background display
  const getFinalUrl = () => {
    if (imageUrl.startsWith('http')) {
      const timestamp = Date.now();
      const separator = imageUrl.includes('?') ? '&' : '?';
      return `${imageUrl}${separator}cacheBust=${timestamp}&nocache=1`;
    } else {
      const filename = imageUrl.split('/').pop()?.split('?')[0] || '';
      return `/api/image-proxy?filename=${filename}`;
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      style={{
        width: 300,
        height: 200,
        overflow: 'hidden',
        cursor: dragging ? 'grabbing' : 'grab',
        backgroundImage: imageLoaded ? `url("${getFinalUrl()}")` : 'none',
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
      // Create a canvas to generate the 300×200 static image with BULLETPROOF white background
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      // Set canvas to high-DPI dimensions for maximum sharpness
      const dpr = window.devicePixelRatio || 1;
      canvas.width = 300 * dpr;
      canvas.height = 200 * dpr;
      canvas.style.backgroundColor = '#FFFFFF'; // Force white in CSS
      canvas.style.width = '300px';
      canvas.style.height = '200px';

      console.log(`🎨 BULLETPROOF WHITE BACKGROUND v1.0.96: DPR=${dpr}, Canvas: ${canvas.width}×${canvas.height}px`);

      // Scale context back to CSS pixels while maintaining high-DPI backing store
      ctx.scale(dpr, dpr);
      
      // IMMEDIATE WHITE BACKGROUND ENFORCEMENT - BEFORE ANY OTHER OPERATIONS
      console.log('🎨 IMMEDIATE WHITE FILL: Before any image operations');
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 300, 200);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 4;
      ctx.strokeRect(0, 0, 300, 200);

      // Load the image - handle both direct URLs and proxy URLs
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      let finalUrl = imageUrl;
      if (imageUrl.startsWith('http')) {
        // Use direct URL with cache-busting for canvas generation
        const timestamp = Date.now();
        const separator = imageUrl.includes('?') ? '&' : '?';
        finalUrl = `${imageUrl}${separator}cacheBust=${timestamp}&nocache=1`;
        console.log(`🖼️ Canvas loading direct URL: ${finalUrl}`);
      } else {
        // Use image proxy for canvas generation
        const filename = imageUrl.split('/').pop()?.split('?')[0] || '';
        finalUrl = `/api/image-proxy?filename=${filename}`;
        console.log(`🖼️ Canvas loading image via proxy: ${finalUrl}`);
      }
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          console.log(`✅ Canvas image loaded successfully: ${img.naturalWidth}×${img.naturalHeight}`);
          resolve();
        };
        img.onerror = (error) => {
          console.error(`❌ Canvas image failed to load:`, error);
          console.error(`❌ Original URL:`, imageUrl);
          console.error(`❌ Final URL:`, finalUrl);
          reject(new Error(`Failed to load image: ${imageUrl}`));
        };
        img.src = finalUrl;
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

      // NUCLEAR WHITE BACKGROUND v1.0.97: PIXEL-LEVEL CONTROL FIRST
      console.log('🎨 NUCLEAR WHITE BACKGROUND v1.0.97 - Creating pure white ImageData FIRST');
      
      // Create ImageData and set every pixel to pure white BEFORE any drawing
      const whiteData = ctx.createImageData(300, 200);
      const pixelArray = whiteData.data;
      
      // Fill every single pixel with pure white (255, 255, 255, 255)
      for (let i = 0; i < pixelArray.length; i += 4) {
        pixelArray[i] = 255;     // Red
        pixelArray[i + 1] = 255; // Green  
        pixelArray[i + 2] = 255; // Blue
        pixelArray[i + 3] = 255; // Alpha (fully opaque)
      }
      
      // Apply white ImageData to canvas - this sets every pixel to white
      ctx.putImageData(whiteData, 0, 0);
      console.log('✅ NUCLEAR WHITE: All 60,000 pixels set to pure white (255,255,255,255)');

      // Calculate position offset based on background-position percentages
      const offsetX = (position.x / 100) * (300 - scaledWidth);
      const offsetY = (position.y / 100) * (200 - scaledHeight);
      
      console.log(`📍 Position: ${position.x}%,${position.y}% → Offset: ${offsetX.toFixed(1)},${offsetY.toFixed(1)}`);

      // Maximum quality settings for sharpest results
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // NOW draw the image on top of the guaranteed white pixels
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
      
      console.log('✅ Image drawn on pixel-level white background');

      // Convert to JPEG (no transparency support) for guaranteed white background
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob!);
        }, 'image/jpeg', 1.0); // JPEG format at maximum quality - no transparency possible
      });

      // Save with position data and high-DPI info
      const cropSettings = {
        method: 'draggable-cover-hd',
        position: position,
        devicePixelRatio: dpr,
        originalDimensions: { width: img.naturalWidth, height: img.naturalHeight },
        outputDimensions: { width: 300, height: 200 },
        format: 'JPEG'
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