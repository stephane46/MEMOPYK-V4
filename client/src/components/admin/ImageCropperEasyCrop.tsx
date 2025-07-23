import React, { useState, useCallback, useRef } from 'react';
import Cropper from 'react-easy-crop';
import { Button } from '../ui/button';
import getCroppedImg from '@/utils/cropImage';

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

  const onCropCompleteCallback = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    // CRITICAL: Use croppedAreaPixels (natural image pixels), NOT croppedArea (percentages)
    croppedAreaPixelsRef.current = croppedAreaPixels;
    
    console.log('onCropComplete - both params:', {
      croppedArea: croppedArea,
      croppedAreaPixels: croppedAreaPixels
    });
    
    // Reset preview when crop changes
    setPreviewUrl(null);
    setPreviewBlob(null);
    setShowPreview(false);
  }, []);

  const generatePreview = useCallback(async () => {
    if (!croppedAreaPixelsRef.current) {
      console.error('Missing crop data');
      return;
    }

    setLoading(true);
    try {
      // Use the official react-easy-crop utility function
      const blob = await getCroppedImg(
        imageUrl,
        croppedAreaPixelsRef.current,
        300,
        200
      );

      if (!blob) {
        throw new Error('Failed to generate cropped image');
      }

      const previewObjectUrl = URL.createObjectURL(blob);
      setPreviewUrl(previewObjectUrl);
      setPreviewBlob(blob);
      setShowPreview(true);
    } catch (error) {
      console.error('Error generating cropped image:', error);
    } finally {
      setLoading(false);
    }
  }, [imageUrl]);

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
        
        {/* 300×200 Full Viewport - Zero padding/border for pixel-perfect mapping */}
        <div className="mx-auto rounded-lg crop-container" 
             style={{ 
               width: 300, 
               height: 200, 
               position: 'relative', 
               overflow: 'hidden',       // 👈 clip the image
               background: '#222',
               padding: 0,
               border: 'none',
               boxSizing: 'content-box'
             }}>
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
            restrictPosition={true}    // 👈 never let the image leave the box
            objectFit="contain"        // 👈 match the library's default math
            cropSize={{ width: 300, height: 200 }}
            style={{
              containerStyle: {
                width: '100%',
                height: '100%',
                backgroundColor: 'transparent'
              },
              cropAreaStyle: {
                border: 'none',        // OK to remove border
                boxShadow: 'none'      // OK to remove shadow
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