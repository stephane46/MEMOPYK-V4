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
  const dragStart = useRef<{ mouseX: number; mouseY: number; posX: number; posY: number } | null>(null);

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

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      style={{
        width: 300,
        height: 200,
        overflow: 'hidden',
        cursor: dragging ? 'grabbing' : 'grab',
        backgroundImage: `url(${imageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: `${pos.x}% ${pos.y}%`,
        borderRadius: 8,
        userSelect: 'none',
      }}
    />
  );
};

export default function ImageCropperEasyCrop({ imageUrl, onSave, onCancel }: ImageCropperEasyCropProps) {
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 50 }); // track position for canvas generation

  const generateStaticImage = async () => {
    setLoading(true);
    try {
      // Create a canvas to generate the 300×200 static image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      // Set canvas to exact output dimensions
      canvas.width = 300;
      canvas.height = 200;

      // Load the image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = imageUrl;
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

      // Calculate position offset based on background-position percentages
      const offsetX = (position.x / 100) * (300 - scaledWidth);
      const offsetY = (position.y / 100) * (200 - scaledHeight);

      // High quality settings
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw the image with position offset
      ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);

      // Convert to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob!);
        }, 'image/jpeg', 1.0);
      });

      // Save with position data
      const cropSettings = {
        method: 'draggable-cover',
        position: position,
        originalDimensions: { width: img.naturalWidth, height: img.naturalHeight },
        outputDimensions: { width: 300, height: 200 }
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

      {/* Action Buttons */}
      <div className="flex justify-center gap-3">
        <Button variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button 
          onClick={generateStaticImage}
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          {loading ? 'Génération...' : 'Générer Image Statique (300×200)'}
        </Button>
      </div>
    </div>
  );
}