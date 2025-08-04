import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';

// Minimal diagnostic helper
function logBasicDiagnostics(success: boolean) {
  if (success) {
    console.log('✅ Image generation completed');
  } else {
    console.warn('⚠️ Image generation failed');
  }
}

interface SimpleImageCropperProps {
  imageUrl: string;
  onSave: (blob: Blob, settings: any) => void;
  onCancel: () => void;
  onOpen?: () => void;
  onCropChange?: () => void;
  isOpen?: boolean;
}

const DraggableCover = ({ imageUrl, onPositionChange, previewRef, onCropChange, initialPosition }: { imageUrl: string; onPositionChange: (pos: { x: number; y: number }) => void; previewRef: React.RefObject<HTMLDivElement>; onCropChange?: () => void; initialPosition: { x: number; y: number } }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(initialPosition);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Update position when parent position changes
  React.useEffect(() => {
    setPosition(initialPosition);
  }, [initialPosition.x, initialPosition.y]);
  


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
    onCropChange?.(); // Trigger crop change callback for real-time preview updates
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
      

      <img
        src={imageUrl}
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageLoaded(false)}
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

export default function SimpleImageCropper({ imageUrl, onSave, onCancel, onOpen, onCropChange, isOpen }: SimpleImageCropperProps) {
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const previewRef = useRef<HTMLDivElement>(null);

  // Trigger onOpen when component becomes visible
  React.useEffect(() => {
    if (isOpen && onOpen) {
      onOpen();
    }
  }, [isOpen, onOpen]);

  const generateImage = async () => {
    setLoading(true);
    
    try {
      // SMART HIGH-QUALITY CROP GENERATION v1.0.122: Preserve original dimensions for maximum quality
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const dpr = window.devicePixelRatio || 1;
      
      // Load image first to get actual dimensions
      const img = document.createElement('img') as HTMLImageElement;
      img.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = imageUrl;
      });

      // PRESERVE ORIGINAL QUALITY: Crop from original dimensions with 1.5 aspect ratio
      const targetAspectRatio = 1.5; // 3:2 ratio
      let cropWidth: number;
      let cropHeight: number;
      
      // Calculate crop size based on original image dimensions to preserve quality
      if (img.naturalWidth / img.naturalHeight > targetAspectRatio) {
        // Image is wider than target - limit by height
        cropHeight = img.naturalHeight;
        cropWidth = Math.round(cropHeight * targetAspectRatio);
      } else {
        // Image is taller than target - limit by width  
        cropWidth = img.naturalWidth;
        cropHeight = Math.round(cropWidth / targetAspectRatio);
      }
      
      console.log(`🎯 WEB-OPTIMIZED CROP: Original ${img.naturalWidth}x${img.naturalHeight} → Crop ${cropWidth}x${cropHeight}`);
      
      canvas.width = cropWidth * dpr;
      canvas.height = cropHeight * dpr;
      ctx.scale(dpr, dpr);

      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, cropWidth, cropHeight);
      
      // Pixel-level white fill for JPEG export
      const imageData = ctx.createImageData(cropWidth, cropHeight);
      for (let i = 0; i < imageData.data.length; i += 4) {
        imageData.data[i] = 255;     // Red
        imageData.data[i + 1] = 255; // Green
        imageData.data[i + 2] = 255; // Blue
        imageData.data[i + 3] = 255; // Alpha
      }
      ctx.putImageData(imageData, 0, 0);
      
      // Calculate positioning for cover effect (using smart high-quality dimensions)
      const scale = Math.max(cropWidth / img.naturalWidth, cropHeight / img.naturalHeight);
      const scaledWidth = img.naturalWidth * scale;
      const scaledHeight = img.naturalHeight * scale;
      
      const offsetX = (scaledWidth - cropWidth) * (-position.x / 100);
      const offsetY = (scaledHeight - cropHeight) * (-position.y / 100);
      
      // Draw the image with proper composite operation
      ctx.globalCompositeOperation = 'source-over';
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
      
      // Export as JPEG with maximum quality
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          logBasicDiagnostics(!!blob);
          
          // 🎯 FILE SIZE CHECK: Log the cropped file size
          if (blob) {
            const sizeInMB = (blob.size / (1024 * 1024)).toFixed(2);
            const sizeInKB = (blob.size / 1024).toFixed(0);
            console.log(`%c🎯 CROPPED FILE SIZE: ${sizeInMB}MB (${sizeInKB}KB)`, 'background: #4CAF50; color: white; padding: 5px; font-weight: bold;');
            console.log(`%c🎯 DIMENSIONS: ${cropWidth}x${cropHeight} (smart high-quality)`, 'background: #2196F3; color: white; padding: 5px; font-weight: bold;');
            console.log(`%c🎯 QUALITY: 90% JPEG (preserving original quality)`, 'background: #FF9800; color: white; padding: 5px; font-weight: bold;');
            
            // Additional alert for testing
            alert(`✅ CROPPING SUCCESS!\n\nFile Size: ${sizeInMB}MB (${sizeInKB}KB)\nDimensions: ${cropWidth}x${cropHeight}\nQuality: 90% JPEG\n\nThis preserves your original image quality!`);
          }
          
          resolve(blob!);
        }, 'image/jpeg', 0.9);  // High quality to preserve your original file quality
      });

      const settings = {
        method: 'triple-layer-white-bg',
        position: position,
        dimensions: { width: cropWidth, height: cropHeight },
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

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Glissez pour repositionner l'image dans le cadre haute qualité (dimensions originales préservées)
        </p>
        
        <div className="mx-auto">
          <DraggableCover 
            imageUrl={imageUrl} 
            onPositionChange={(pos) => {
              setPosition(pos);
            }}
            onCropChange={onCropChange}
            previewRef={previewRef}
            initialPosition={position}
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
          {loading ? 'Génération...' : 'Sauvegarder Recadrage'}
        </Button>
      </div>
    </div>
  );
}