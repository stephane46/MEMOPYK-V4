import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Plus, Minus, Save, RotateCcw, Crop } from 'lucide-react';

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Crop settings state
  const [cropSettings, setCropSettings] = useState<CropSettings>(
    initialSettings || {
      zoom: 100,
      x: 0,
      y: 0,
      width: 600,
      height: 400
    }
  );

  // Load and display image
  const drawImage = useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to preview window (600x400)
    canvas.width = 600;
    canvas.height = 400;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate scaled dimensions based on zoom
    const scale = cropSettings.zoom / 100;
    const scaledWidth = image.naturalWidth * scale;
    const scaledHeight = image.naturalHeight * scale;

    // Draw image with zoom and position
    ctx.drawImage(
      image,
      cropSettings.x,
      cropSettings.y,
      scaledWidth,
      scaledHeight
    );

    // Draw crop frame overlay
    ctx.strokeStyle = '#D67C4A'; // MEMOPYK orange
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    
    // Calculate crop frame position (centered)
    const frameX = (600 - targetWidth) / 2;
    const frameY = (400 - targetHeight) / 2;
    
    ctx.strokeRect(frameX, frameY, targetWidth, targetHeight);
    
    // Add semi-transparent overlay outside crop area
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    // Top
    ctx.fillRect(0, 0, 600, frameY);
    // Bottom
    ctx.fillRect(0, frameY + targetHeight, 600, 400 - frameY - targetHeight);
    // Left
    ctx.fillRect(0, frameY, frameX, targetHeight);
    // Right
    ctx.fillRect(frameX + targetWidth, frameY, 600 - frameX - targetWidth, targetHeight);
  }, [cropSettings, targetWidth, targetHeight]);

  // Handle image load
  useEffect(() => {
    const image = new Image();
    image.onload = () => {
      imageRef.current = image;
      setIsLoading(false);
      
      // Initial positioning to center the image
      if (!initialSettings) {
        // Calculate initial zoom to fit image nicely in preview
        const widthRatio = 600 / image.naturalWidth;
        const heightRatio = 400 / image.naturalHeight;
        const initialZoom = Math.max(widthRatio, heightRatio) * 100;
        
        setCropSettings(prev => ({
          ...prev,
          zoom: Math.min(initialZoom, 200), // Cap at 200% to avoid too much zoom
          x: -(image.naturalWidth * (Math.min(initialZoom, 200) / 100) - 600) / 2,
          y: -(image.naturalHeight * (Math.min(initialZoom, 200) / 100) - 400) / 2
        }));
      }
    };
    image.onerror = () => {
      console.error('Failed to load image:', imageUrl);
      setIsLoading(false);
    };
    image.src = imageUrl;
  }, [imageUrl, initialSettings]);

  // Redraw when settings change
  useEffect(() => {
    if (!isLoading) {
      drawImage();
    }
  }, [cropSettings, isLoading, drawImage]);

  // Mouse handlers for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    setCropSettings(prev => ({
      ...prev,
      x: prev.x + deltaX,
      y: prev.y + deltaY
    }));

    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Zoom controls
  const handleZoomChange = (value: number[]) => {
    setCropSettings(prev => ({ ...prev, zoom: value[0] }));
  };

  const handleZoomInput = (value: string) => {
    const zoom = Math.max(10, Math.min(500, parseInt(value) || 100));
    setCropSettings(prev => ({ ...prev, zoom }));
  };

  const adjustZoom = (delta: number) => {
    setCropSettings(prev => ({
      ...prev,
      zoom: Math.max(10, Math.min(500, prev.zoom + delta))
    }));
  };

  // Reset to original position
  const handleReset = () => {
    if (imageRef.current) {
      setCropSettings({
        zoom: 100,
        x: -(imageRef.current.naturalWidth - 600) / 2,
        y: -(imageRef.current.naturalHeight - 400) / 2,
        width: 600,
        height: 400
      });
    }
  };

  // Save cropped image
  const handleSave = async () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;

    // Create a new canvas for the final cropped image
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = targetWidth;
    cropCanvas.height = targetHeight;
    const cropCtx = cropCanvas.getContext('2d');
    if (!cropCtx) return;

    // Calculate the source area to crop from the original image
    const scale = cropSettings.zoom / 100;
    const frameX = (600 - targetWidth) / 2;
    const frameY = (400 - targetHeight) / 2;
    
    // Source coordinates on the scaled image
    const sourceX = (frameX - cropSettings.x) / scale;
    const sourceY = (frameY - cropSettings.y) / scale;
    const sourceWidth = targetWidth / scale;
    const sourceHeight = targetHeight / scale;

    // Draw the cropped portion
    cropCtx.drawImage(
      image,
      sourceX, sourceY, sourceWidth, sourceHeight,
      0, 0, targetWidth, targetHeight
    );

    // Convert to blob
    cropCanvas.toBlob(
      (blob) => {
        if (blob) {
          onSave(blob, cropSettings);
        }
      },
      'image/jpeg',
      1.0 // Full quality
    );
  };

  return (
    <div className="space-y-6 bg-white dark:bg-gray-900 p-6 rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Crop className="h-5 w-5 text-memopyk-orange" />
          Recadrage d'Image Statique ({targetWidth}x{targetHeight})
        </h3>
        <div className="text-sm text-gray-500">
          Image finale: {targetWidth} × {targetHeight} px
        </div>
      </div>

      {/* Canvas Preview */}
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
        <div 
          ref={containerRef}
          className="relative mx-auto border-2 border-gray-300 dark:border-gray-600 rounded"
          style={{ width: 600, height: 400 }}
        >
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className={`cursor-${isDragging ? 'grabbing' : 'grab'} block`}
            style={{ width: 600, height: 400 }}
          />
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-700">
              <div className="text-gray-500">Chargement de l'image...</div>
            </div>
          )}
        </div>
        <div className="text-center mt-2 text-sm text-gray-600 dark:text-gray-400">
          Zone de prévisualisation 600×400px - Glissez pour repositionner
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Slider Control */}
          <div className="space-y-2">
            <Label className="text-gray-700 dark:text-gray-300">Zoom (5% par incréments)</Label>
            <div className="space-y-2">
              <Slider
                value={[cropSettings.zoom]}
                onValueChange={handleZoomChange}
                min={10}
                max={500}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>10%</span>
                <span className="font-medium">{cropSettings.zoom}%</span>
                <span>500%</span>
              </div>
            </div>
          </div>

          {/* Zoom Buttons */}
          <div className="space-y-2">
            <Label className="text-gray-700 dark:text-gray-300">Ajustements rapides</Label>
            <div className="flex space-x-2">
              <Button 
                type="button"
                variant="outline" 
                size="sm" 
                onClick={() => adjustZoom(-10)}
                className="flex-1"
              >
                <Minus className="h-4 w-4 mr-1" />
                -10%
              </Button>
              <Input
                type="number"
                value={cropSettings.zoom}
                onChange={(e) => handleZoomInput(e.target.value)}
                min={10}
                max={500}
                className="w-20 text-center"
              />
              <Button 
                type="button"
                variant="outline" 
                size="sm" 
                onClick={() => adjustZoom(10)}
                className="flex-1"
              >
                <Plus className="h-4 w-4 mr-1" />
                +10%
              </Button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-4">
          <Button 
            type="button"
            variant="outline" 
            onClick={handleReset}
            className="flex items-center"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Réinitialiser
          </Button>
          
          <div className="flex space-x-2">
            <Button 
              type="button"
              variant="outline" 
              onClick={onCancel}
            >
              Annuler
            </Button>
            <Button 
              type="button"
              onClick={handleSave}
              className="bg-memopyk-orange hover:bg-memopyk-orange-hover text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              Sauvegarder ({targetWidth}×{targetHeight})
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};