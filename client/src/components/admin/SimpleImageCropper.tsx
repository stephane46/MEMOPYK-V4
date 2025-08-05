import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';

interface SimpleImageCropperProps {
  imageUrl: string;
  onSave: (blob: Blob, settings: any) => Promise<void>;
  onCancel: () => void;
  onOpen?: () => void;
  onCropChange?: () => void;
  isOpen?: boolean;
}

export default function SimpleImageCropper({
  imageUrl,
  onSave,
  onCancel,
  onOpen,
  onCropChange,
  isOpen
}: SimpleImageCropperProps) {
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const previewRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Auto-open the modal when component mounts
  React.useEffect(() => {
    if (!isOpen && onOpen) {
      onOpen();
    }
  }, [isOpen, onOpen]);

  // Simple click positioning - just click where you want the crop center
  const handleContainerClick = (e: React.MouseEvent) => {
    const container = previewRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    const newPos = {
      x: Math.max(10, Math.min(90, x)), // Keep 10% margin from edges
      y: Math.max(10, Math.min(90, y))
    };
    
    setPosition(newPos);
    onCropChange?.();
    console.log('🎯 New crop position:', newPos);
  };

  // Complete keyboard controls
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Arrow keys for positioning
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        const step = 5; // 5% movement per key press for faster positioning
        let newPos = { ...position };
        
        switch (e.key) {
          case 'ArrowUp':
            newPos.y = Math.max(10, position.y - step);
            break;
          case 'ArrowDown':
            newPos.y = Math.min(90, position.y + step);
            break;
          case 'ArrowLeft':
            newPos.x = Math.max(10, position.x - step);
            break;
          case 'ArrowRight':
            newPos.x = Math.min(90, position.x + step);
            break;
        }
        
        e.preventDefault();
        setPosition(newPos);
        onCropChange?.();
        console.log('⌨️ Keyboard move to:', newPos);
        return;
      }
      
      // Enter key to save
      if (e.key === 'Enter' && imageLoaded && !loading) {
        e.preventDefault();
        console.log('⌨️ Enter pressed - saving crop');
        generateImage();
        return;
      }
      
      // Escape key to cancel
      if (e.key === 'Escape') {
        e.preventDefault();
        console.log('⌨️ Escape pressed - cancelling');
        onCancel();
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [position, onCropChange, imageLoaded, loading, onCancel]);

  const generateImage = async () => {
    console.log('🔥 GENERATE_START: Starting crop generation');
    setLoading(true);

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx || !imageRef.current || !imageDimensions.width) {
        throw new Error('Canvas or image not ready');
      }

      const img = imageRef.current;
      
      // Calculate 1.5 aspect ratio crop (like 300x200 video cards) from the original image
      const targetAspectRatio = 1.5; // Same as 300x200
      const originalWidth = imageDimensions.width;
      const originalHeight = imageDimensions.height;
      
      // Calculate maximum crop size that fits in original image
      let cropWidth, cropHeight;
      
      // Try full width first
      cropWidth = originalWidth;
      cropHeight = cropWidth / targetAspectRatio;
      
      // If height doesn't fit, use full height instead
      if (cropHeight > originalHeight) {
        cropHeight = originalHeight;
        cropWidth = cropHeight * targetAspectRatio;
      }
      
      console.log(`📐 Calculated crop size: ${cropWidth.toFixed(0)}×${cropHeight.toFixed(0)} from ${originalWidth}×${originalHeight}`);
      
      // Calculate crop position (center point to top-left corner)
      const centerX = (position.x / 100) * originalWidth;
      const centerY = (position.y / 100) * originalHeight;
      
      const cropX = Math.max(0, Math.min(originalWidth - cropWidth, centerX - cropWidth/2));
      const cropY = Math.max(0, Math.min(originalHeight - cropHeight, centerY - cropHeight/2));
      
      console.log(`📍 Crop position: (${cropX.toFixed(0)}, ${cropY.toFixed(0)}) from center (${centerX.toFixed(0)}, ${centerY.toFixed(0)})`);
      
      // Set canvas size to crop size (maintains original quality)
      const outputWidth = Math.round(cropWidth);
      const outputHeight = Math.round(cropHeight);
      
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      
      // Fill with white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, outputWidth, outputHeight);
      
      // Draw the cropped image
      ctx.drawImage(
        img,
        cropX, cropY, cropWidth, cropHeight, // Source crop area
        0, 0, outputWidth, outputHeight       // Destination (full canvas)
      );
      
      console.log('✅ Canvas drawing completed');
      
      // Create blob with Promise to fix hanging issue
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => {
          if (result) {
            resolve(result);
          } else {
            reject(new Error('Failed to create image blob'));
          }
        }, 'image/jpeg', 0.95);
      });
      
      console.log(`📸 Created blob: ${blob.size} bytes, type: ${blob.type}`);
      
      const settings = {
        format: 'JPEG',
        method: 'simple-click-crop',
        quality: 0.95,
        position: position,
        dimensions: { width: cropWidth, height: cropHeight },
        outputSize: { width: outputWidth, height: outputHeight }
      };
      
      console.log('🚀 Starting upload...');
      
      // Call onSave and wait for it to complete
      await onSave(blob, settings);
      
      console.log('✅ Upload completed successfully');
      
    } catch (error: any) {
      console.error('❌ Error generating image:', error);
      alert(`Crop Error: ${error?.message || error}`);
    } finally {
      setLoading(false);
      console.log('🏁 Crop function completed');
    }
  };

  return (
    <div className="space-y-4">
      {/* Simple title */}
      <div className="text-center">
        <h3 className="text-xl font-semibold text-[#2A4759] mb-2">
          Recadrage de l'image
        </h3>
        <p className="text-sm text-gray-600">
          Utilisez les flèches du clavier ↑↓←→ pour positionner le recadrage
        </p>
      </div>

      {/* Preview container */}
      <div
        ref={previewRef}
        className="w-[400px] h-[300px] relative overflow-hidden mx-auto border-2 border-[#D67C4A] rounded-lg focus:outline-none focus:ring-4 focus:ring-[#D67C4A]/20"
        tabIndex={0}
        title="Utilisez les flèches ↑↓←→ pour repositionner le recadrage"
      >
        {/* Background image with current position */}
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

        {/* Crop frame for 1.5 aspect ratio (300x200 video card) */}
        <div 
          className="absolute border-4 border-[#D67C4A] pointer-events-none"
          style={{
            width: '300px',  // Matches video card width
            height: '200px', // Matches video card height (1.5 ratio)
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10,
            backgroundColor: '#D67C4A',
            opacity: 0.3
          }}
        />

        {/* Corner indicators for your preferred 360x240 frame */}
        <div 
          className="absolute w-3 h-3 bg-white border-2 border-[#D67C4A] pointer-events-none"
          style={{
            left: 'calc(50% - 180px - 4px)',
            top: 'calc(50% - 120px - 4px)',
            zIndex: 11
          }}
        />
        <div 
          className="absolute w-3 h-3 bg-white border-2 border-[#D67C4A] pointer-events-none"
          style={{
            right: 'calc(50% - 180px - 4px)',
            top: 'calc(50% - 120px - 4px)',
            zIndex: 11
          }}
        />
        <div 
          className="absolute w-3 h-3 bg-white border-2 border-[#D67C4A] pointer-events-none"
          style={{
            left: 'calc(50% - 180px - 4px)',
            bottom: 'calc(50% - 120px - 4px)',
            zIndex: 11
          }}
        />
        <div 
          className="absolute w-3 h-3 bg-white border-2 border-[#D67C4A] pointer-events-none"
          style={{
            right: 'calc(50% - 180px - 4px)',
            bottom: 'calc(50% - 120px - 4px)',
            zIndex: 11
          }}
        />

        {/* Hidden image for loading */}
        <img
          ref={imageRef}
          src={imageUrl}
          crossOrigin="anonymous"
          onLoad={(e) => {
            console.log('✅ Image loaded:', imageUrl);
            const img = e.target as HTMLImageElement;
            setImageDimensions({
              width: img.naturalWidth,
              height: img.naturalHeight
            });
            setImageLoaded(true);
            console.log(`📐 Image dimensions: ${img.naturalWidth}×${img.naturalHeight}`);
          }}
          onError={(e) => {
            console.error('❌ Image failed to load:', imageUrl);
          }}
          className="absolute opacity-0 pointer-events-none"
          alt="Crop source"
        />
      </div>

      {/* Keyboard controls info */}
      <div className="text-center space-y-2">
        <div className="text-sm text-gray-500">
          Position actuelle: {position.x.toFixed(0)}%, {position.y.toFixed(0)}%
        </div>
        <div className="text-xs text-[#D67C4A] font-medium">
          ↑↓←→ Déplacer le recadrage • Entrée = Sauvegarder • Échap = Annuler
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-center gap-4">
        <Button 
          onClick={onCancel}
          variant="outline"
          className="px-8 py-2 text-gray-600 border-gray-300 hover:bg-gray-50"
        >
          ❌ Annuler
        </Button>
        <Button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🚨 SAVE BUTTON CLICKED');
            
            // Immediate feedback
            alert('Démarrage du recadrage...');
            
            try {
              generateImage();
            } catch (error) {
              console.error('❌ Error in generateImage:', error);
              alert('Erreur: ' + error);
            }
          }}
          disabled={loading || !imageLoaded}
          className="bg-[#D67C4A] hover:bg-[#b85d37] text-white px-8 py-2 font-semibold disabled:opacity-50"
        >
          {loading ? '⏳ Traitement...' : '✅ SAUVEGARDER RECADRAGE'}
        </Button>
      </div>
    </div>
  );
}