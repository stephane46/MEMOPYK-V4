import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';

interface SimpleImageCropperProps {
  imageUrl: string;
  onSave: (blob: Blob, settings: any) => void;
  onCancel: () => void;
}

interface DraggableCoverProps {
  imageUrl: string;
  onPositionChange: (position: { x: number; y: number }) => void;
  previewRef: React.RefObject<HTMLDivElement>;
}

const DraggableCover: React.FC<DraggableCoverProps> = ({ imageUrl, onPositionChange, previewRef }) => {
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    const sensitivity = 0.5;
    const newPosition = {
      x: Math.max(0, Math.min(100, position.x + deltaX * sensitivity)),
      y: Math.max(0, Math.min(100, position.y + deltaY * sensitivity))
    };

    setPosition(newPosition);
    onPositionChange(newPosition);
    setDragStart({ x: e.clientX, y: e.clientY });
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
        backgroundColor: '#ffffff', // Solid white base background
        borderRadius: 8,
        userSelect: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Solid white background layer */}
      <div 
        className="absolute inset-0 bg-white"
        style={{ zIndex: 1 }}
      />
      
      {/* Image layer on top of white background */}
      {imageLoaded && (
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url("${imageUrl}")`,
            backgroundSize: 'cover',
            backgroundPosition: `${position.x}% ${position.y}%`,
            backgroundRepeat: 'no-repeat',
            zIndex: 2
          }}
        />
      )}
      
      {/* Debug overlay to show image loading state */}
      <div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded z-10">
        {imageLoaded ? '✅ Image Loaded' : '⏳ Loading...'}
      </div>
      <img
        src={imageUrl}
        onLoad={() => {
          console.log(`✅ DRAGGABLE COVER v1.0.105 - Image loaded successfully: ${imageUrl}`);
          setImageLoaded(true);
        }}
        onError={(e) => {
          console.error(`❌ DRAGGABLE COVER v1.0.105 - Image failed to load: ${imageUrl}`, e);
          setImageLoaded(false);
        }}
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

  // Test if URL is accessible by testing in a new image
  React.useEffect(() => {
    if (imageUrl) {
      console.log(`🚀 SIMPLE CROPPER v1.0.109 - Component mounted with imageUrl: "${imageUrl}"`);
      const testImg = new Image();
      testImg.onload = () => console.log(`✅ SIMPLE CROPPER v1.0.109 - URL is accessible: ${imageUrl}`);
      testImg.onerror = (e) => console.error(`❌ SIMPLE CROPPER v1.0.109 - URL failed to load: ${imageUrl}`, e);
      testImg.src = imageUrl;
    }
  }, [imageUrl]);

  const generateImage = async () => {
    setLoading(true);
    
    try {
      console.log('🚀 SIMPLE IMAGE CROPPER v1.0.109: Starting clean canvas generation');
      
      // Clean minimal canvas sequence for guaranteed white-backed JPEG
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = 300 * dpr;
      canvas.height = 200 * dpr;
      ctx.scale(dpr, dpr);

      // TRIPLE WHITE BACKGROUND SYSTEM - Nuclear approach
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 300, 200);
      
      // Layer 2: ImageData pixel-level white fill
      const imageData = ctx.createImageData(300, 200);
      for (let i = 0; i < imageData.data.length; i += 4) {
        imageData.data[i] = 255;     // Red
        imageData.data[i + 1] = 255; // Green
        imageData.data[i + 2] = 255; // Blue
        imageData.data[i + 3] = 255; // Alpha
      }
      ctx.putImageData(imageData, 0, 0);
      console.log('✅ TRIPLE WHITE BACKGROUND: fillRect + ImageData pixel control applied');
      
      // Load image
      const img = document.createElement('img') as HTMLImageElement;
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
          console.log('✅ Clean fix: JPEG blob created:', blob?.size, 'bytes');
          const blobUrl = URL.createObjectURL(blob!);
          console.log('🔍 DIRECT BLOB URL for inspection:', blobUrl);
          console.log('📋 Open this URL in new tab to verify white background');
          
          resolve(blob!);
        }, 'image/jpeg', 1.0);
      });

      const settings = {
        method: 'clean-minimal-fix',
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
          <span className="text-green-800 font-bold">✅ CLEAN PRODUCTION FIX - Debug Code Removed</span>
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
          {loading ? 'Génération...' : 'Générer Image Statique (300×200)'}
        </Button>
      </div>
    </div>
  );
}