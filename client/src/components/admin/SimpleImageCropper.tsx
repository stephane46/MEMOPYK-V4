import React, { useState, useRef, useEffect, useCallback } from "react";

interface CropSettings {
  format: string;
  method: string;
  quality: number;
  position: { x: number; y: number };
  dimensions: { width: number; height: number };
  devicePixelRatio?: number;
  outputSize?: { width: number; height: number };
}

interface SimpleImageCropperProps {
  imageUrl: string;
  onSave: (blob: Blob, settings: CropSettings) => Promise<void>;
  onCancel: () => void;
}

export default function SimpleImageCropper({
  imageUrl,
  onSave,
  onCancel,
}: SimpleImageCropperProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgHeight, setImgHeight] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [loading, setLoading] = useState(false);
  // Use 50% of viewport width with reasonable limits
  const containerWidth = Math.min(window.innerWidth * 0.5, 800); // 50% viewport, max 800px

  // When the image loads, measure its displayed height
  const handleImageLoad = () => {
    if (!imgRef.current) return;
    const displayedHeight = imgRef.current.getBoundingClientRect().height;
    setImgHeight(displayedHeight);
    // center the crop overlay initially
    const centerOffset = Math.max(0, (displayedHeight - containerWidth / 1.5) / 2);
    setOffsetY(centerOffset);
    console.log("🖼️ Image loaded:", { displayedHeight, centerOffset });
  };

  // Generate the cropped image - memoized to prevent unnecessary re-renders
  const generateImage = useCallback(async () => {
    if (!imgRef.current || loading) return;

    setLoading(true);
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not create canvas context");

      // Calculate crop dimensions in natural pixels
      const naturalWidth = imgRef.current.naturalWidth;
      const naturalHeight = imgRef.current.naturalHeight;
      const displayedWidth = imgRef.current.getBoundingClientRect().width;
      const displayedHeight = imgRef.current.getBoundingClientRect().height;

      // Scale factors
      const scaleX = naturalWidth / displayedWidth;
      const scaleY = naturalHeight / displayedHeight;

      // Crop rectangle in natural coordinates - overlay position determines crop
      const cropY = (offsetY / displayedHeight) * naturalHeight;
      const cropHeight = (containerWidth / 1.5 / displayedHeight) * naturalHeight;
      const cropWidth = naturalWidth; // Full width

      canvas.width = cropWidth;
      canvas.height = cropHeight;

      // Draw the cropped portion from where the overlay is positioned
      ctx.drawImage(
        imgRef.current,
        0, cropY, cropWidth, cropHeight, // source rectangle
        0, 0, cropWidth, cropHeight       // destination rectangle
      );

      // Convert to blob
      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error("Failed to generate image blob");
        }

        const settings: CropSettings = {
          format: "JPEG",
          method: "triple-layer-white-bg",
          quality: 1,
          position: { x: 50, y: (offsetY / imgHeight) * 100 },
          dimensions: { width: cropWidth, height: cropHeight },
          devicePixelRatio: window.devicePixelRatio || 1,
          outputSize: { width: cropWidth, height: cropHeight },
        };

        onSave(blob, settings);
      }, "image/jpeg", 1.0);

    } catch (error: any) {
      console.error("❌ Error generating image:", error);
      alert(`Crop Error: ${error?.message || error}`);
    } finally {
      setLoading(false);
    }
  }, [offsetY, imgHeight, containerWidth, loading, onSave]);

  // Key handlers for panning and confirm/cancel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setOffsetY((y) => Math.max(0, y - imgHeight * 0.01));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        const maxOffset = Math.max(0, imgHeight - containerWidth / 1.5);
        setOffsetY((y) => Math.min(y + imgHeight * 0.01, maxOffset));
      } else if (e.key === "Enter") {
        e.preventDefault();
        generateImage(); // now always uses latest offsetY
      } else if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [imgHeight, offsetY, onCancel, generateImage]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-auto">
      <div className="bg-white p-6 rounded-lg w-full max-w-none mx-auto" style={{ maxHeight: 'none' }}>
        <h3 className="text-xl font-semibold mb-4">Crop Image</h3>

        <div className="flex justify-center">
          <div
            style={{
              width: containerWidth,
              margin: "0 auto",
              position: "relative",
              // NO overflow:hidden here - show full image!
            }}
          >
            <img
              ref={imgRef}
              src={imageUrl}
              alt="To crop"
              onLoad={handleImageLoad}
              crossOrigin="anonymous"
              style={{
                display: "block",
                width: "100%",
                height: "auto",
                userSelect: "none",
              }}
            />

            {/* Orange overlay rectangle that moves up/down */}
            <div
              style={{
                position: "absolute",
                top: offsetY,
                left: 0,
                width: "100%",
                height: containerWidth / 1.5, // 3:2 crop box
                border: "4px solid #D67C4A",
                boxSizing: "border-box",
                pointerEvents: "none",
              }}
            />
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="text-sm text-gray-600">
            <p><strong>Instructions:</strong></p>
            <p>• Use ↑↓ arrow keys to move the image vertically (1% increments)</p>
            <p>• Press <strong>Enter</strong> to confirm and save</p>
            <p>• Press <strong>Escape</strong> to cancel</p>
            <p>• Crop vertical position: {((offsetY / imgHeight) * 100).toFixed(1)}% from top</p>
          </div>

          <div className="flex gap-4 justify-end">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={generateImage}
              disabled={loading}
              className="px-4 py-2 bg-[#D67C4A] text-white rounded hover:bg-[#C06B3F] disabled:opacity-50"
            >
              {loading ? "Processing..." : "Save Crop"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}