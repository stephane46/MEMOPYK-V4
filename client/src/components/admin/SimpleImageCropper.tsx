import React from "react";

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
  onCropChange?: () => void;
}

const SimpleImageCropper: React.FC<SimpleImageCropperProps> = ({
  imageUrl,
  onSave,
  onCancel,
  onCropChange,
}) => {
  // Vertical position only (0-100% of image height)
  const [verticalPosition, setVerticalPosition] = React.useState(50);
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [imageDimensions, setImageDimensions] = React.useState<{
    width: number;
    height: number;
  } | null>(null);
  const imageRef = React.useRef<HTMLImageElement>(null);

  const handleImageLoad = () => {
    console.log("🖼️ Image loaded successfully");
    if (imageRef.current) {
      const { naturalWidth, naturalHeight } = imageRef.current;
      console.log(`📏 Natural dimensions: ${naturalWidth}×${naturalHeight}`);
      setImageDimensions({ width: naturalWidth, height: naturalHeight });
      setImageLoaded(true);
      onCropChange?.();
    }
  };

  // Keyboard controls for vertical movement
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Up/Down arrow keys for vertical movement in 1% increments
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setVerticalPosition((prev) => Math.max(0, prev - 1));
        onCropChange?.();
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setVerticalPosition((prev) => Math.min(100, prev + 1));
        onCropChange?.();
        return;
      }

      // Enter key to save
      if (e.key === "Enter" && imageLoaded && !loading) {
        e.preventDefault();
        console.log("⌨️ Enter pressed - saving crop");
        generateImage();
        return;
      }

      // Escape key to cancel
      if (e.key === "Escape") {
        e.preventDefault();
        console.log("⌨️ Escape pressed - cancelling");
        onCancel();
        return;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [verticalPosition, onCropChange, imageLoaded, loading, onCancel]);

  const generateImage = async () => {
    console.log("🔥 GENERATE_START: Starting crop generation");
    setLoading(true);

    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx || !imageRef.current || !imageDimensions?.width) {
        throw new Error("Canvas or image not ready");
      }

      const img = imageRef.current;

      // Calculate 3:2 aspect ratio crop (width:height = 1:0.66)
      const targetAspectRatio = 1 / 0.66; // 1.515... (3:2 ratio)
      const originalWidth = imageDimensions.width;
      const originalHeight = imageDimensions.height;

      // Crop always spans full width, height determined by 3:2 ratio
      const cropWidth = originalWidth;
      const cropHeight = cropWidth * 0.66; // height = width * 0.66

      console.log(
        `📐 Calculated crop size: ${cropWidth.toFixed(0)}×${cropHeight.toFixed(0)} from ${originalWidth}×${originalHeight}`,
      );

      // Calculate vertical position (0-100% converted to pixels)
      const cropY = Math.max(
        0,
        Math.min(
          originalHeight - cropHeight,
          (verticalPosition / 100) * (originalHeight - cropHeight),
        ),
      );
      const cropX = 0; // Always starts at left edge (full width)

      console.log(
        `📍 Crop position: (${cropX.toFixed(0)}, ${cropY.toFixed(0)}) from vertical position ${verticalPosition}%`,
      );

      // Set canvas size to crop size (maintains original quality)
      const outputWidth = Math.round(cropWidth);
      const outputHeight = Math.round(cropHeight);

      canvas.width = outputWidth;
      canvas.height = outputHeight;

      // Fill with white background
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, outputWidth, outputHeight);

      // Draw the cropped image
      ctx.drawImage(
        img,
        cropX,
        cropY,
        cropWidth,
        cropHeight, // Source crop area
        0,
        0,
        outputWidth,
        outputHeight, // Destination (full canvas)
      );

      console.log("✅ Canvas drawing completed");

      // Create blob with Promise to fix hanging issue
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) => {
            if (result) {
              resolve(result);
            } else {
              reject(new Error("Failed to create image blob"));
            }
          },
          "image/jpeg",
          0.95,
        );
      });

      console.log(`📸 Created blob: ${blob.size} bytes, type: ${blob.type}`);

      const settings = {
        format: "JPEG",
        method: "fixed-width-3-2-crop",
        quality: 0.95,
        position: { x: 0, y: verticalPosition }, // x always 0 (full width), y is vertical position
        dimensions: { width: cropWidth, height: cropHeight },
        outputSize: { width: outputWidth, height: outputHeight },
      };

      console.log("🚀 Starting upload...");

      // Call onSave and wait for it to complete
      await onSave(blob, settings);

      console.log("✅ Upload completed successfully");
    } catch (error: any) {
      console.error("❌ Error generating image:", error);
      alert(`Crop Error: ${error?.message || error}`);
    } finally {
      setLoading(false);
      console.log("🏁 Crop function completed");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg max-w-4xl w-full">
        <h3 className="text-xl font-semibold mb-4">Crop Image</h3>

        <div
          className="cropper-container"
          style={{
            width: "800px",
            aspectRatio: "3 / 2",
            position: "relative",
            overflow: "hidden",
            border: "2px solid #ccc",
            borderRadius: "4px",
          }}
        >
          {/* Image that moves up/down */}
          <img
            ref={imageRef}
            src={imageUrl}
            alt="Image to crop"
            onLoad={handleImageLoad}
            className="select-none"
            style={{
              position: "absolute",
              left: 0,
              width: "100%",
              height: "auto",
              top: imageDimensions && imageRef.current 
                ? (() => {
                    const rect = imageRef.current.getBoundingClientRect();
                    const containerHeight = 800 / 1.5; // 3:2 ratio = 533px
                    const imageHeight = rect.height;
                    const maxOffset = Math.max(0, imageHeight - containerHeight);
                    const offset = (verticalPosition / 100) * maxOffset;
                    console.log("🔧 IMAGE POSITION:", {
                      containerHeight,
                      imageHeight,
                      maxOffset,
                      verticalPosition,
                      offset: -offset
                    });
                    return `${-offset}px`;
                  })()
                : "0px"
            }}
          />

          {/* Static orange frame that fills the container */}
          <div
            className="crop-frame"
            style={{
              position: "absolute",
              inset: 0,
              border: "4px solid #D67C4A",
              pointerEvents: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div className="mt-6 space-y-4">
          <div className="text-sm text-gray-600">
            <p>
              <strong>Instructions:</strong>
            </p>
            <p>
              • Use ↑↓ arrow keys to move the crop frame vertically (1%
              increments)
            </p>
            <p>
              • Press <strong>Enter</strong> to confirm and save
            </p>
            <p>
              • Press <strong>Escape</strong> to cancel
            </p>
            <p>• Current position: {verticalPosition}%</p>
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
              disabled={!imageLoaded || loading}
              className="px-4 py-2 bg-[#D67C4A] text-white rounded hover:bg-[#C06B3F] disabled:opacity-50"
            >
              {loading ? "Processing..." : "Save Crop"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleImageCropper;
