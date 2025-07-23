// Official react-easy-crop utility functions
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180;
}

function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = getRadianAngle(rotation);
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

// SIMPLE CROP: Direct pixel extraction with proper coordinate mapping
export default async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  targetWidth: number = 300,
  targetHeight: number = 200
): Promise<Blob | null> {
  const img = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return null;
  }

  // High-DPI support for sharp output
  const dpr = window.devicePixelRatio || 1;
  canvas.width = targetWidth * dpr;
  canvas.height = targetHeight * dpr;
  
  // High-quality canvas settings
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.scale(dpr, dpr);

  // CRITICAL: pixelCrop coordinates from react-easy-crop are ALREADY mapped to natural image coordinates
  // The library handles the viewport-to-natural mapping internally
  // We should use them directly without additional scaling
  const finalSourceX = Math.round(pixelCrop.x);
  const finalSourceY = Math.round(pixelCrop.y);
  const finalSourceW = Math.round(pixelCrop.width);
  const finalSourceH = Math.round(pixelCrop.height);

  // Debug logging to verify coordinates
  console.log('CROP DEBUG - Direct Mapping', {
    'pixelCrop from react-easy-crop': pixelCrop,
    'rounded source coords': { x: finalSourceX, y: finalSourceY, w: finalSourceW, h: finalSourceH },
    'natural image': { w: img.naturalWidth, h: img.naturalHeight },
    'target output': { w: targetWidth, h: targetHeight },
    'crop vs target ratio': { crop: finalSourceW / finalSourceH, target: targetWidth / targetHeight },
    'coords within bounds': {
      xOk: finalSourceX >= 0 && finalSourceX < img.naturalWidth,
      yOk: finalSourceY >= 0 && finalSourceY < img.naturalHeight,
      wOk: finalSourceX + finalSourceW <= img.naturalWidth,
      hOk: finalSourceY + finalSourceH <= img.naturalHeight
    }
  });

  // Validate coordinates are within bounds
  if (finalSourceX < 0 || finalSourceY < 0 || 
      finalSourceX + finalSourceW > img.naturalWidth ||
      finalSourceY + finalSourceH > img.naturalHeight) {
    console.error('❌ Crop coordinates out of bounds:', {
      requested: { x: finalSourceX, y: finalSourceY, w: finalSourceW, h: finalSourceH },
      imageSize: { w: img.naturalWidth, h: img.naturalHeight },
      overflowX: finalSourceX + finalSourceW - img.naturalWidth,
      overflowY: finalSourceY + finalSourceH - img.naturalHeight
    });
    
    // Clamp coordinates to image bounds
    const clampedX = Math.max(0, Math.min(finalSourceX, img.naturalWidth - 1));
    const clampedY = Math.max(0, Math.min(finalSourceY, img.naturalHeight - 1));
    const clampedW = Math.min(finalSourceW, img.naturalWidth - clampedX);
    const clampedH = Math.min(finalSourceH, img.naturalHeight - clampedY);
    
    console.log('🔧 Using clamped coordinates:', { x: clampedX, y: clampedY, w: clampedW, h: clampedH });
    
    ctx.drawImage(img, clampedX, clampedY, clampedW, clampedH, 0, 0, targetWidth, targetHeight);
  } else {
    console.log('✅ Coordinates valid, extracting crop...');
    ctx.drawImage(img, finalSourceX, finalSourceY, finalSourceW, finalSourceH, 0, 0, targetWidth, targetHeight);
  }

  // Return as high-quality JPEG
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/jpeg', 1.0);
  });
}