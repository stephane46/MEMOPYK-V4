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
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [cropDimensions, setCropDimensions] = useState({ width: 360, height: 240 });
  const [cropPosition, setCropPosition] = useState({ x: 50, y: 50 }); // Position of the crop frame itself

  // Update position when parent position changes
  React.useEffect(() => {
    setPosition(initialPosition);
  }, [initialPosition.x, initialPosition.y]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
    e.stopPropagation();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const container = previewRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    const newPos = {
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y))
    };
    
    setPosition(newPos);
    onPositionChange(newPos);
    onCropChange?.();
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Keyboard controls for precise positioning of crop frame
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const step = 1; // 1% movement per key press for precise control
      let newCropPosition = { ...cropPosition };
      
      // Calculate boundaries based on crop size to prevent empty areas
      const cropWidthPercent = (cropDimensions.width / 400) * 100; // Crop width as % of container
      const cropHeightPercent = (cropDimensions.height / 300) * 100; // Crop height as % of container  
      
      const minX = cropWidthPercent / 2;   // Half crop width from left edge
      const maxX = 100 - cropWidthPercent / 2; // Half crop width from right edge
      const minY = cropHeightPercent / 2;  // Half crop height from top edge
      const maxY = 100 - cropHeightPercent / 2; // Half crop height from bottom edge
      
      switch (e.key) {
        case 'ArrowUp':
          newCropPosition.y = Math.max(minY, cropPosition.y - step); // Can't go beyond top image edge
          break;
        case 'ArrowDown':
          newCropPosition.y = Math.min(maxY, cropPosition.y + step); // Can't go beyond bottom image edge
          break;
        case 'ArrowLeft':
          newCropPosition.x = Math.max(minX, cropPosition.x - step); // Can't go beyond left image edge
          break;
        case 'ArrowRight':
          newCropPosition.x = Math.min(maxX, cropPosition.x + step); // Can't go beyond right image edge
          break;
        default:
          return; // Don't prevent default for other keys
      }
      
      e.preventDefault();
      setCropPosition(newCropPosition);
      onCropChange?.();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [cropPosition, onCropChange]);

  // Click to position the crop frame
  const handleContainerClick = (e: React.MouseEvent) => {
    const container = previewRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    // Calculate click boundaries to prevent empty areas
    const cropWidthPercent = (cropDimensions.width / 400) * 100;
    const cropHeightPercent = (cropDimensions.height / 300) * 100;
    
    const minX = cropWidthPercent / 2;
    const maxX = 100 - cropWidthPercent / 2;
    const minY = cropHeightPercent / 2;
    const maxY = 100 - cropHeightPercent / 2;
    
    const newCropPos = {
      x: Math.max(minX, Math.min(maxX, x)), // Keep crop within image bounds
      y: Math.max(minY, Math.min(maxY, y))  // Keep crop within image bounds
    };
    
    setCropPosition(newCropPos);
    onCropChange?.();
  };

  return (
    <div className="space-y-3">
      {/* Clear instructions */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-[#2A4759] mb-2">
          🖼️ Recadrage de l'image
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Cliquez ou utilisez les flèches ↑↓←→ pour positionner la zone où vous voulez
        </p>
      </div>

      <div
        ref={previewRef}
        className="w-[400px] h-[300px] relative overflow-hidden mx-auto cursor-crosshair focus:outline-none"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 12,
          userSelect: 'none',
        }}
        onClick={handleContainerClick}
        tabIndex={0}
        title="Cliquez pour repositionner ou utilisez les flèches du clavier"
      >
        {/* Background image */}
        {imageLoaded && (
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `url("${imageUrl}")`,
              backgroundSize: 'cover',
              backgroundPosition: `${position.x}% ${position.y}%`,
              backgroundRepeat: 'no-repeat'
            }}
          />
        )}

        {/* Simple orange crop rectangle */}
        <div 
          className="absolute border-4 border-[#D67C4A] pointer-events-none"
          style={{
            width: `${cropDimensions.width}px`,
            height: `${cropDimensions.height}px`,
            left: `${cropPosition.x}%`,
            top: `${cropPosition.y}%`,
            transform: 'translate(-50%, -50%)',
            zIndex: 10
          }}
        />

        <img
          src={imageUrl}
          onLoad={(e) => {
            const img = e.target as HTMLImageElement;
            const naturalWidth = img.naturalWidth;
            const naturalHeight = img.naturalHeight;
            
            setImageDimensions({ width: naturalWidth, height: naturalHeight });
            
            // Calculate maximum possible crop dimensions for 1.5 ratio
            const targetAspectRatio = 1.5; // 3:2 ratio
            const imageAspectRatio = naturalWidth / naturalHeight;
            
            // Scale to preview size (400x300 container) first
            const containerWidth = 400;
            const containerHeight = 300;
            const scale = Math.min(containerWidth / naturalWidth, containerHeight / naturalHeight);
            
            const scaledImageWidth = naturalWidth * scale;
            const scaledImageHeight = naturalHeight * scale;
            
            // Give user the maximum possible crop area - use the larger dimension approach
            let maxCropWidth, maxCropHeight;
            
            // Try using full height first
            const fullHeightCrop = {
              height: Math.min(scaledImageHeight, containerHeight * 0.95),
              width: Math.min(scaledImageHeight * targetAspectRatio, containerWidth * 0.95)
            };
            
            // Try using full width  
            const fullWidthCrop = {
              width: Math.min(scaledImageWidth, containerWidth * 0.95),
              height: Math.min(scaledImageWidth / targetAspectRatio, containerHeight * 0.95)
            };
            
            // Use whichever gives the bigger crop area
            const fullHeightArea = fullHeightCrop.width * fullHeightCrop.height;
            const fullWidthArea = fullWidthCrop.width * fullWidthCrop.height;
            
            if (fullHeightArea >= fullWidthArea) {
              maxCropWidth = fullHeightCrop.width;
              maxCropHeight = fullHeightCrop.height;
            } else {
              maxCropWidth = fullWidthCrop.width;
              maxCropHeight = fullWidthCrop.height;
            }
            
            setCropDimensions({ 
              width: maxCropWidth, 
              height: maxCropHeight
            });
            
            console.log(`📐 Image: ${naturalWidth}x${naturalHeight} (ratio: ${imageAspectRatio.toFixed(2)})`);
            console.log(`📐 Scaled image: ${scaledImageWidth.toFixed(0)}x${scaledImageHeight.toFixed(0)}`);
            console.log(`📐 Max crop: ${maxCropWidth.toFixed(0)}x${maxCropHeight.toFixed(0)} pixels`);
            console.log(`📐 Crop area: ${(maxCropWidth * maxCropHeight).toFixed(0)} pixels² available`);
            
            setImageLoaded(true);
          }}
          onError={() => setImageLoaded(false)}
          style={{ display: 'none' }}
          alt=""
        />
        
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-gray-500 text-sm">
              Chargement de l'image...
            </div>
          </div>
        )}
      </div>

      {/* Status indicator with dimensions */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#D67C4A]/10 rounded-full text-sm">
          <div className={`w-2 h-2 rounded-full ${isDragging ? 'bg-green-500 animate-pulse' : 'bg-[#D67C4A]'}`}></div>
          <span className="text-[#2A4759] font-medium">
            {isDragging ? 'En cours de positionnement...' : 'Prêt à recadrer'}
          </span>
        </div>
        
        {imageLoaded && imageDimensions.width > 0 && (
          <div className="text-xs text-gray-500 space-y-1">
            <div>Image originale: {imageDimensions.width}x{imageDimensions.height}</div>
            <div>Zone de recadrage: {cropDimensions.width.toFixed(0)}x{cropDimensions.height.toFixed(0)} (aperçu)</div>
            <div className="text-[#D67C4A] font-medium">
              Zone: {cropDimensions.width.toFixed(0)}×{cropDimensions.height.toFixed(0)}px - Positionnez où vous voulez!
            </div>
            <div className="text-blue-600 font-medium mt-2">
              ↑ Vers le haut ↓ Vers le bas ← Vers la gauche → Vers la droite
            </div>
            <div className="text-xs text-green-600 mt-1">
              Position: {cropPosition.x.toFixed(0)}%, {cropPosition.y.toFixed(0)}% | Limité aux bords de l'image (pas de zones vides)
            </div>
          </div>
        )}
      </div>
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
            
            // Alert removed - cropping system confirmed working
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
    <div className="space-y-6">
      <DraggableCover 
        imageUrl={imageUrl} 
        onPositionChange={(pos) => {
          setPosition(pos);
        }}
        onCropChange={onCropChange}
        previewRef={previewRef}
        initialPosition={position}
      />

      {/* Action buttons */}
      <div className="flex justify-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button 
          onClick={onCancel}
          variant="outline"
          className="px-8 py-2 text-gray-600 border-gray-300 hover:bg-gray-50"
        >
          ❌ Annuler
        </Button>
        <Button 
          onClick={generateImage}
          disabled={loading}
          className="bg-[#D67C4A] hover:bg-[#b85d37] text-white px-8 py-2 font-semibold"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Génération...
            </>
          ) : (
            '✅ Sauvegarder Recadrage'
          )}
        </Button>
      </div>
    </div>
  );
}