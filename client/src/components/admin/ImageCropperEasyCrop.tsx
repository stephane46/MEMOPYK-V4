import React, { useState, useCallback, useRef } from 'react';
import Cropper from 'react-easy-crop';
import { Button } from '../ui/button';

interface ImageCropperEasyCropProps {
  imageUrl: string;
  onSave: (blob: Blob, cropSettings: any) => void;
  onCancel: () => void;
}

export default function ImageCropperEasyCrop({ imageUrl, onSave, onCancel }: ImageCropperEasyCropProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const croppedAreaPixelsRef = useRef<any>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const onCropCompleteCallback = useCallback((_: any, pixelCrop: any) => {
    croppedAreaPixelsRef.current = pixelCrop;
  }, []);

  const handleCropAndSave = useCallback(async () => {
    const pixelCrop = croppedAreaPixelsRef.current;
    if (!pixelCrop) {
      console.error('Missing crop data');
      return;
    }

    // Create image element to load the source
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    return new Promise<void>((resolve, reject) => {
      img.onload = () => {

        setLoading(true);
        try {
          // Create 300×200 canvas
          const canvas = document.createElement('canvas');
          canvas.width = 300;
          canvas.height = 200;
          const ctx = canvas.getContext('2d')!;
          
          // Draw cropped area onto canvas at exact 300×200 size
          ctx.drawImage(
            img,
            pixelCrop.x,
            pixelCrop.y,
            pixelCrop.width,
            pixelCrop.height,
            0,
            0,
            300,
            200
          );

          // Show preview
          canvas.toBlob((previewBlob) => {
            if (previewBlob) {
              const previewObjectUrl = URL.createObjectURL(previewBlob);
              setPreviewUrl(previewObjectUrl);
            }
          }, 'image/jpeg', 1.0);

          // Convert to blob and pass to parent
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const cropSettings = {
                  crop,
                  zoom,
                  pixelCrop,
                  targetWidth: 300,
                  targetHeight: 200,
                  timestamp: new Date().toISOString()
                };
                onSave(blob, cropSettings);
                resolve();
              } else {
                console.error('Canvas toBlob returned null');
                reject(new Error('Canvas toBlob returned null'));
              }
              setLoading(false);
            },
            'image/jpeg',
            1.0 // Maximum quality
          );
        } catch (error) {
          console.error('Error generating cropped image:', error);
          setLoading(false);
          reject(error);
        }
      };
      
      img.onerror = () => {
        setLoading(false);
        reject(new Error('Failed to load image'));
      };
      
      img.src = imageUrl;
    });
  }, [crop, zoom, onSave]);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Glissez pour repositionner, utilisez le zoom pour ajuster la taille
        </p>
        
        {/* 300×200 Cropper Viewport */}
        <div className="mx-auto border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden" 
             style={{ width: 300, height: 200, position: 'relative', background: '#222' }}>
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={3 / 2}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropCompleteCallback}
            cropShape="rect"
            showGrid={false}
            onMediaLoaded={(mediaSize) => {
              // react-easy-crop provides mediaSize object, not HTMLImageElement
              // We'll get the image reference differently
            }}
          />
        </div>

        {/* Zoom Control */}
        <div className="mt-4 flex items-center justify-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            Zoom:
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={e => setZoom(Number(e.target.value))}
              className="w-32"
            />
            <span className="text-xs text-gray-500">{zoom.toFixed(2)}x</span>
          </label>
        </div>
      </div>

      {/* Preview */}
      {previewUrl && (
        <div className="text-center">
          <p className="text-sm font-medium mb-2">Aperçu (300×200):</p>
          <img 
            src={previewUrl} 
            width={300} 
            height={200} 
            alt="Aperçu recadré" 
            className="mx-auto border rounded shadow-sm"
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center">
        <Button onClick={onCancel} variant="outline">
          Annuler
        </Button>
        <Button 
          onClick={handleCropAndSave}
          disabled={loading}
          className="min-w-[150px]"
        >
          {loading ? 'Génération...' : 'Recadrer & Sauvegarder'}
        </Button>
      </div>
    </div>
  );
}