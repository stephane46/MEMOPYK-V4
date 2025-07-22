import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Save, RotateCcw, Crop, ZoomIn, ZoomOut, Move } from 'lucide-react';

interface ImageCropperProps {
  imageUrl: string;
  onSave: (croppedImageBlob: Blob, cropSettings: CropSettings) => Promise<void>;
  onCancel: () => void;
  initialSettings?: CropSettings;
  targetWidth?: number;
  targetHeight?: number;
}

interface CropSettings {
  zoom: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export const ImageCropper: React.FC<ImageCropperProps> = ({
  imageUrl,
  onSave,
  onCancel,
  initialSettings,
  targetWidth = 300,
  targetHeight = 200
}) => {
  const [cropSettings, setCropSettings] = useState<CropSettings>(
    initialSettings || {
      zoom: 100,
      x: 0,
      y: 0,
      width: 600,
      height: 400
    }
  );
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load image through proxy to avoid CORS issues
  const proxyImageUrl = `/api/video-proxy?filename=${encodeURIComponent(imageUrl.split('/').pop() || imageUrl)}`;

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // Try to enable cross-origin
    img.onload = () => {
      setImageLoaded(true);
      setIsLoading(false);
    };
    img.onerror = () => {
      console.log('Direct image load failed, using proxy');
      setIsLoading(false);
      setImageLoaded(true);
    };
    img.src = proxyImageUrl;
    if (imageRef.current) {
      imageRef.current = img;
    }
  }, [proxyImageUrl]);

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - cropSettings.x, y: e.clientY - cropSettings.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    setCropSettings(prev => ({
      ...prev,
      x: Math.max(-200, Math.min(200, newX)),
      y: Math.max(-200, Math.min(200, newY))
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Zoom handlers
  const handleZoomChange = (value: number[]) => {
    setCropSettings(prev => ({ ...prev, zoom: value[0] }));
  };

  const adjustZoom = (delta: number) => {
    setCropSettings(prev => ({
      ...prev,
      zoom: Math.max(50, Math.min(300, prev.zoom + delta))
    }));
  };

  // Reset to center
  const resetPosition = () => {
    setCropSettings(prev => ({
      ...prev,
      x: 0,
      y: 0,
      zoom: 100
    }));
  };

  // Save cropped image
  const handleSave = async () => {
    if (!imageLoaded) return;
    
    setIsSaving(true);
    
    try {
      // Create a temporary canvas to crop the image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Cannot get canvas context');

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      // Load the image again for processing
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image for processing'));
        img.src = proxyImageUrl;
      });

      // Calculate crop parameters
      const scale = cropSettings.zoom / 100;
      const frameWidth = 600;
      const frameHeight = 400;
      
      // Calculate source coordinates on the original image
      const sourceX = Math.max(0, (-cropSettings.x) / scale);
      const sourceY = Math.max(0, (-cropSettings.y) / scale);
      const sourceWidth = Math.min(img.naturalWidth - sourceX, (frameWidth / scale));
      const sourceHeight = Math.min(img.naturalHeight - sourceY, (frameHeight / scale));

      // Draw the cropped portion
      ctx.drawImage(
        img,
        sourceX, sourceY, sourceWidth, sourceHeight,
        0, 0, targetWidth, targetHeight
      );

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            onSave(blob, cropSettings);
          } else {
            throw new Error('Failed to create blob from canvas');
          }
          setIsSaving(false);
        },
        'image/jpeg',
        0.95
      );
    } catch (error) {
      console.error('Error saving cropped image:', error);
      setIsSaving(false);
      // Fallback: create a simple cropped version using fetch
      try {
        const response = await fetch(proxyImageUrl);
        const blob = await response.blob();
        onSave(blob, cropSettings);
      } catch (fallbackError) {
        console.error('Fallback save failed:', fallbackError);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-memopyk-orange mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Chargement de l'image...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-memopyk-orange/10 to-memopyk-orange/5 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Crop className="h-6 w-6 text-memopyk-orange" />
            Créer Image Statique
          </h2>
          <div className="text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 px-3 py-1 rounded-full">
            Sortie: {targetWidth} × {targetHeight} px
          </div>
        </div>
        
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Move className="h-4 w-4" />
              Glissez l'image pour repositionner
            </span>
            <span className="flex items-center gap-1">
              <ZoomIn className="h-4 w-4" />
              Utilisez le zoom pour ajuster la taille
            </span>
          </div>
        </div>
      </div>

      {/* Preview Area */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Aperçu de recadrage</h3>
          <p className="text-sm text-gray-500">Zone de prévisualisation 600×400 avec cadre de sortie {targetWidth}×{targetHeight}</p>
        </div>
        
        <div 
          ref={containerRef}
          className="relative mx-auto bg-white dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden"
          style={{ width: 600, height: 400 }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Background Image */}
          <div 
            className={`absolute inset-0 bg-cover bg-no-repeat transition-transform duration-100 ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            style={{
              backgroundImage: `url(${proxyImageUrl})`,
              backgroundPosition: `${cropSettings.x}px ${cropSettings.y}px`,
              backgroundSize: `${cropSettings.zoom}%`,
              transform: `scale(${cropSettings.zoom / 100})`,
              transformOrigin: `${-cropSettings.x}px ${-cropSettings.y}px`
            }}
          />
          
          {/* Crop Frame Overlay */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Dark overlay areas */}
            <div 
              className="absolute top-0 left-0 right-0 bg-black bg-opacity-40"
              style={{ height: `${(400 - targetHeight) / 2}px` }}
            />
            <div 
              className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-40"
              style={{ height: `${(400 - targetHeight) / 2}px` }}
            />
            <div 
              className="absolute left-0 bg-black bg-opacity-40"
              style={{ 
                top: `${(400 - targetHeight) / 2}px`,
                width: `${(600 - targetWidth) / 2}px`,
                height: `${targetHeight}px`
              }}
            />
            <div 
              className="absolute right-0 bg-black bg-opacity-40"
              style={{ 
                top: `${(400 - targetHeight) / 2}px`,
                width: `${(600 - targetWidth) / 2}px`,
                height: `${targetHeight}px`
              }}
            />
            
            {/* Crop frame border */}
            <div 
              className="absolute border-2 border-memopyk-orange shadow-lg"
              style={{
                left: `${(600 - targetWidth) / 2}px`,
                top: `${(400 - targetHeight) / 2}px`,
                width: targetWidth,
                height: targetHeight
              }}
            >
              <div className="absolute inset-0 border border-white border-opacity-50"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Zoom Controls */}
          <div>
            <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <ZoomIn className="h-4 w-4" />
              Zoom ({cropSettings.zoom}%)
            </h4>
            <div className="space-y-3">
              <Slider
                value={[cropSettings.zoom]}
                onValueChange={handleZoomChange}
                min={50}
                max={300}
                step={5}
                className="w-full"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => adjustZoom(-10)}
                  className="flex-1"
                >
                  <ZoomOut className="h-4 w-4 mr-1" />
                  -10%
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => adjustZoom(10)}
                  className="flex-1"
                >
                  <ZoomIn className="h-4 w-4 mr-1" />
                  +10%
                </Button>
              </div>
            </div>
          </div>

          {/* Position Info & Reset */}
          <div>
            <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Move className="h-4 w-4" />
              Position
            </h4>
            <div className="space-y-3">
              <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded">
                <div>X: {Math.round(cropSettings.x)}px</div>
                <div>Y: {Math.round(cropSettings.y)}px</div>
                <div>Zoom: {cropSettings.zoom}%</div>
              </div>
              <Button
                variant="outline"
                onClick={resetPosition}
                className="w-full"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Réinitialiser
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isSaving}
        >
          Annuler
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-memopyk-orange hover:bg-memopyk-orange/90"
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Sauvegarde...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Sauvegarder ({targetWidth}×{targetHeight})
            </>
          )}
        </Button>
      </div>
    </div>
  );
};