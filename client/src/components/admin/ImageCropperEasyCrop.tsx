import React, { useState } from 'react';
import { Button } from '../ui/button';

interface ImageCropperEasyCropProps {
  imageUrl: string;
  onSave: (blob: Blob, cropSettings: any) => void;
  onCancel: () => void;
}

// Simple preview box component for 300×200 display
const PreviewBox: React.FC<{ imageUrl: string }> = ({ imageUrl }) => (
  <div
    style={{
      width: 300,
      height: 200,
      overflow: 'hidden',
      borderRadius: 8,
      background: '#222',
    }}
  >
    <img
      src={imageUrl}
      alt="Preview"
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',      // fills 300×200 by cropping the overflow
        objectPosition: 'center' // centers the focal point
      }}
    />
  </div>
);

export default function ImageCropperEasyCrop({ imageUrl, onSave, onCancel }: ImageCropperEasyCropProps) {
  const [loading, setLoading] = useState(false);

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
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      // Draw image to fill 300×200 with object-fit: cover behavior
      const imgAspect = img.naturalWidth / img.naturalHeight;
      const canvasAspect = 300 / 200;

      let drawWidth, drawHeight, offsetX = 0, offsetY = 0;

      if (imgAspect > canvasAspect) {
        // Image is wider - fit to height, crop width
        drawHeight = 200;
        drawWidth = drawHeight * imgAspect;
        offsetX = (300 - drawWidth) / 2;
      } else {
        // Image is taller - fit to width, crop height
        drawWidth = 300;
        drawHeight = drawWidth / imgAspect;
        offsetY = (200 - drawHeight) / 2;
      }

      // High quality settings
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw the image
      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

      // Convert to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob!);
        }, 'image/jpeg', 1.0);
      });

      // Automatically save since there's no manual cropping
      const cropSettings = {
        method: 'auto-fit-cover',
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
          L'image sera automatiquement ajustée pour remplir le cadre 300×200
        </p>
        
        {/* 300×200 Preview Box */}
        <div className="mx-auto">
          <PreviewBox imageUrl={imageUrl} />
        </div>
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