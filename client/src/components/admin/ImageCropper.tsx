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
    e.preventDefault();
    setIsDragging(true);
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setDragStart({ 
        x: e.clientX - rect.left - cropSettings.x, 
        y: e.clientY - rect.top - cropSettings.y 
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const newX = e.clientX - rect.left - dragStart.x;
    const newY = e.clientY - rect.top - dragStart.y;
    
    // Allow more generous movement range
    setCropSettings(prev => ({
      ...prev,
      x: Math.max(-400, Math.min(400, newX)),
      y: Math.max(-300, Math.min(300, newY))
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add global mouse event listeners for better drag experience
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const newX = e.clientX - rect.left - dragStart.x;
      const newY = e.clientY - rect.top - dragStart.y;
      
      setCropSettings(prev => ({
        ...prev,
        x: Math.max(-400, Math.min(400, newX)),
        y: Math.max(-300, Math.min(300, newY))
      }));
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, dragStart]);

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
      // Load the original image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image for processing'));
        img.src = proxyImageUrl;
      });

      // Debug info - send to server for persistent logging
      const debugInfo = {
        imageSize: { w: img.naturalWidth, h: img.naturalHeight },
        cropSettings: cropSettings,
        targetSize: { w: targetWidth, h: targetHeight },
        proxyUrl: proxyImageUrl
      };
      
      // Log to server for debugging (fire and forget)
      fetch('/api/debug-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'crop-debug', data: debugInfo })
      }).catch(() => {}); // Ignore errors

      // Create canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Cannot get canvas context');

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      // FIXED COORDINATE TRANSFORMATION BASED ON USER'S CROP SELECTION
      // The preview shows a 600x400 container with the image positioned/scaled via CSS
      // We need to calculate what part of the original image corresponds to the crop frame
      
      // Preview container dimensions
      const previewWidth = 600;
      const previewHeight = 400;
      
      // Calculate the crop frame position (center of preview container)
      const cropFrameX = (previewWidth - targetWidth) / 2;   // 150px
      const cropFrameY = (previewHeight - targetHeight) / 2; // 100px
      
      // The CSS shows the image at cropSettings.x, cropSettings.y position
      // and scaled to cropSettings.zoom%. We need to reverse this transformation.
      
      // First, calculate how the original image appears in the preview
      // When zoom = 100%, the image fills based on aspect ratio
      // When zoom > 100%, the image is larger and positioned with x,y offsets
      
      // Calculate the displayed image dimensions in the preview at current zoom
      const displayScale = cropSettings.zoom / 100;
      
      // SIMPLE APPROACH: Create a high-resolution preview and crop from it
      // Instead of complex coordinate calculations, draw the image as it appears 
      // in the preview at a much higher resolution, then crop directly
      
      // Create a high-resolution version of what's shown in the preview
      const hiResScale = 4; // 4x resolution for quality
      const hiResPreviewW = previewWidth * hiResScale;   // 600 * 4 = 2400
      const hiResPreviewH = previewHeight * hiResScale;  // 400 * 4 = 1600
      
      // Create temporary high-res canvas 
      const hiResCanvas = document.createElement('canvas');
      hiResCanvas.width = hiResPreviewW;
      hiResCanvas.height = hiResPreviewH;
      const hiResCtx = hiResCanvas.getContext('2d');
      
      if (!hiResCtx) throw new Error('Could not get hi-res canvas context');
      
      // Draw the image exactly as it appears in the preview, but at high resolution
      // CRITICAL FIX: At higher zoom (60%), image should be LARGER, not smaller
      // displayScale should make image bigger when zoom > 100%, smaller when zoom < 100%
      const actualDisplayScale = displayScale; // Keep as is - this represents how much of the image is visible
      
      // Calculate how the image actually fits in the preview container
      const imageAspect = img.naturalWidth / img.naturalHeight;
      const containerAspect = previewWidth / previewHeight;
      
      let baseImageW, baseImageH;
      if (imageAspect > containerAspect) {
        baseImageH = previewHeight;
        baseImageW = baseImageH * imageAspect;
      } else {
        baseImageW = previewWidth;
        baseImageH = baseImageW / imageAspect;
      }
      
      // Apply zoom: lower zoom means image appears smaller (showing more of the image)
      const zoomedImageW = baseImageW / actualDisplayScale;  // At 60% zoom, image is 1.67x larger
      const zoomedImageH = baseImageH / actualDisplayScale;
      
      const hiResImageX = cropSettings.x * hiResScale;
      const hiResImageY = cropSettings.y * hiResScale;
      const hiResImageW = zoomedImageW * hiResScale;
      const hiResImageH = zoomedImageH * hiResScale;
      
      hiResCtx.drawImage(
        img,
        0, 0, img.naturalWidth, img.naturalHeight,  // source: full original image
        hiResImageX, hiResImageY, hiResImageW, hiResImageH  // destination: scaled preview position
      );
      
      // Now crop from the high-res preview at the exact crop frame location
      const hiResCropX = cropFrameX * hiResScale;
      const hiResCropY = cropFrameY * hiResScale;
      const hiResCropW = targetWidth * hiResScale;
      const hiResCropH = targetHeight * hiResScale;
      
      const finalSourceX = hiResCropX;
      const finalSourceY = hiResCropY;
      const finalSourceW = hiResCropW;
      const finalSourceH = hiResCropH;
      
      // Map to original image coordinates
      // VERIFICATION: Check if we're using correct image dimensions
      console.log({
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        displayWidth: img.width,
        displayHeight: img.height,
        previewSize: { width: previewWidth, height: previewHeight },
        cropFrame: { x: cropFrameX, y: cropFrameY, w: targetWidth, h: targetHeight }
      });
      
      // Source is now the high-res preview canvas, not the original image
      
      const correctDebug = {
        transform: 'high-res-preview-v11-zoom-fix',
        preview: { w: previewWidth, h: previewHeight },
        cropFrame: { x: cropFrameX, y: cropFrameY, w: targetWidth, h: targetHeight },
        cropSettings: cropSettings,
        original: { w: img.naturalWidth, h: img.naturalHeight },
        hiResScale: hiResScale,
        hiResPreview: { w: hiResPreviewW, h: hiResPreviewH },
        baseImage: { w: baseImageW, h: baseImageH },
        zoomedImage: { w: zoomedImageW, h: zoomedImageH },
        hiResImage: { x: hiResImageX, y: hiResImageY, w: hiResImageW, h: hiResImageH },
        hiResCrop: { x: hiResCropX, y: hiResCropY, w: hiResCropW, h: hiResCropH },
        source: { x: finalSourceX, y: finalSourceY, w: finalSourceW, h: finalSourceH },
        destination: { x: 0, y: 0, w: targetWidth, h: targetHeight }
      };
      
      // Log to server for debugging (fire and forget)
      fetch('/api/debug-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'crop-coordinates', data: correctDebug })
      }).catch(() => {}); // Ignore errors

      // White background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      // Draw from the high-resolution preview canvas
      ctx.drawImage(
        hiResCanvas,
        finalSourceX, finalSourceY, finalSourceW, finalSourceH,
        0, 0, targetWidth, targetHeight
      );

      console.log('Canvas drawn successfully');

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            console.log('Blob created, size:', blob.size);
            onSave(blob, cropSettings);
          } else {
            throw new Error('Failed to create blob from canvas');
          }
          setIsSaving(false);
        },
        'image/jpeg',
        1.0
      );
    } catch (error) {
      console.error('Cropping failed:', error);
      alert('Error: ' + (error instanceof Error ? error.message : String(error)));
      setIsSaving(false);
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
            className={`absolute inset-0 bg-cover bg-no-repeat ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            style={{
              backgroundImage: `url(${proxyImageUrl})`,
              backgroundPosition: `${cropSettings.x}px ${cropSettings.y}px`,
              backgroundSize: `${cropSettings.zoom}%`
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