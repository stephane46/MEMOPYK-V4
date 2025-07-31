import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

interface SimpleImageCropperProps {
  imageUrl: string;
  onSave: (blob: Blob, settings: any) => void;
  onCancel: () => void;
}

const DraggableCover = ({ imageUrl, onPositionChange }: { imageUrl: string; onPositionChange: (pos: { x: number; y: number }) => void }) => {
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

  const generateImage = async () => {
    setLoading(true);
    
    try {
      console.log('🚀 SIMPLE IMAGE CROPPER: Starting basic canvas generation');
      
      // Create simple canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = 300;
      canvas.height = 200;
      
      // Fill with white background (this should be all we need!)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 300, 200);
      console.log('✅ White background applied');
      
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
      
      // Draw image on white background
      ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
      console.log('✅ Image drawn on canvas');
      
      // Convert to JPEG
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          console.log('✅ JPEG blob created:', blob?.size, 'bytes');
          resolve(blob!);
        }, 'image/jpeg', 0.95);
      });

      const settings = {
        method: 'simple',
        position: position,
        dimensions: { width: 300, height: 200 },
        format: 'JPEG'
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
        <div className="mb-2 p-2 bg-blue-100 border border-blue-300 rounded">
          <span className="text-blue-800 font-bold">🔧 SIMPLE IMAGE CROPPER - No Nuclear Complexity!</span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Glissez pour repositionner l'image dans le cadre 300×200
        </p>
        
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