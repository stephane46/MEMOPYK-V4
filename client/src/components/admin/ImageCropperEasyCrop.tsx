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
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const croppedAreaPixelsRef = useRef<any>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const onCropCompleteCallback = useCallback((_: any, pixelCrop: any) => {
    // Instead of using library's crop area, use the full 300x200 viewport
    // Calculate what portion of the image is visible in the 300x200 container
    const viewportCrop = {
      x: 0,
      y: 0, 
      width: 300,
      height: 200
    };
    croppedAreaPixelsRef.current = viewportCrop;
    
    // Reset preview when crop changes
    setPreviewUrl(null);
    setPreviewBlob(null);
    setShowPreview(false);
  }, []);

  const generatePreview = useCallback(async () => {
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
          
          // Alternative approach: Use HTML2Canvas-like technique to capture what's actually visible
          // Find the cropper container and get its rendered state
          const cropperContainer = document.querySelector('.reactEasyCrop_Container');
          const imageElement = cropperContainer?.querySelector('img');
          
          if (imageElement) {
            // Get the actual rendered dimensions and position of the image
            const containerRect = cropperContainer.getBoundingClientRect();
            const imageRect = imageElement.getBoundingClientRect();
            
            // Calculate the offset of the image within the 300x200 container
            const offsetX = imageRect.left - containerRect.left;
            const offsetY = imageRect.top - containerRect.top;
            
            // Get the scale factor between natural image and displayed image
            const scaleX = img.naturalWidth / imageElement.naturalWidth;
            const scaleY = img.naturalHeight / imageElement.naturalHeight;
            
            // Calculate which part of the natural image is visible in the 300x200 viewport
            const sourceX = Math.max(0, -offsetX * scaleX);
            const sourceY = Math.max(0, -offsetY * scaleY);
            const sourceWidth = Math.min(300 * scaleX, img.naturalWidth - sourceX);
            const sourceHeight = Math.min(200 * scaleY, img.naturalHeight - sourceY);
            
            console.log('Debug crop calculation:', {
              naturalSize: { width: img.naturalWidth, height: img.naturalHeight },
              displayedSize: { width: imageElement.naturalWidth, height: imageElement.naturalHeight },
              scale: { x: scaleX, y: scaleY },
              offset: { x: offsetX, y: offsetY },
              source: { x: sourceX, y: sourceY, width: sourceWidth, height: sourceHeight }
            });
            
            // Draw the calculated portion
            ctx.drawImage(
              img,
              sourceX,
              sourceY,
              sourceWidth,
              sourceHeight,
              0,
              0,
              300,
              200
            );
          } else {
            // Fallback: scale entire image to 300x200
            console.log('Fallback: no cropper element found');
            ctx.drawImage(img, 0, 0, 300, 200);
          }

          // Generate preview and store blob
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const previewObjectUrl = URL.createObjectURL(blob);
                setPreviewUrl(previewObjectUrl);
                setPreviewBlob(blob);
                setShowPreview(true);
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
  }, [crop, zoom, imageUrl]);

  const handleConfirmSave = useCallback(() => {
    if (!previewBlob || !croppedAreaPixelsRef.current) return;
    
    const cropSettings = {
      crop,
      zoom,
      pixelCrop: croppedAreaPixelsRef.current,
      targetWidth: 300,
      targetHeight: 200,
      timestamp: new Date().toISOString()
    };
    
    onSave(previewBlob, cropSettings);
  }, [previewBlob, crop, zoom, onSave]);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Glissez pour repositionner, utilisez le zoom pour ajuster la taille
        </p>
        
        {/* 300×200 Full Viewport - No Inner Crop Frame */}
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
            restrictPosition={false}
            cropSize={{ width: 300, height: 200 }}
            style={{
              containerStyle: {
                width: '100%',
                height: '100%',
                backgroundColor: 'transparent'
              },
              cropAreaStyle: {
                border: 'none', // Remove inner crop frame
                boxShadow: 'none' // Remove any shadow/outline
              }
            }}
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

      {/* Preview Section */}
      {showPreview && previewUrl && (
        <div className="text-center bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
          <p className="text-sm font-medium mb-3 text-green-800 dark:text-green-200">
            ✓ Aperçu du résultat final (300×200 pixels):
          </p>
          <img 
            src={previewUrl} 
            width={300} 
            height={200} 
            alt="Aperçu recadré" 
            className="mx-auto border-2 border-green-300 dark:border-green-600 rounded shadow-lg"
          />
          <p className="text-xs text-green-600 dark:text-green-400 mt-2">
            Confirmez pour sauvegarder cette image dans la galerie
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center">
        <Button onClick={onCancel} variant="outline">
          Annuler
        </Button>
        
        {!showPreview ? (
          <Button 
            onClick={generatePreview}
            disabled={loading}
            className="min-w-[150px]"
          >
            {loading ? 'Génération...' : 'Aperçu (300×200)'}
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowPreview(false)}
              variant="outline"
            >
              Modifier
            </Button>
            <Button 
              onClick={handleConfirmSave}
              className="min-w-[150px] bg-green-600 hover:bg-green-700"
            >
              ✓ Confirmer & Sauvegarder
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}