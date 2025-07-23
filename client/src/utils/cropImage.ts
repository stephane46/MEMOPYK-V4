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

// SIMPLE CROP: Direct pixel extraction with debug logging
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

  // Use the pixelCrop coordinates directly - they're already in natural image pixels
  const finalSourceX = pixelCrop.x;
  const finalSourceY = pixelCrop.y;
  const finalSourceW = pixelCrop.width;
  const finalSourceH = pixelCrop.height;

  // Debug logging to verify coordinates
  console.log('CROP DEBUG', {
    finalSourceX, finalSourceY, finalSourceW, finalSourceH,
    naturalW: img.naturalWidth, naturalH: img.naturalHeight,
    targetW: targetWidth, targetH: targetHeight,
    cropRatio: finalSourceW / finalSourceH,
    targetRatio: targetWidth / targetHeight
  });

  // Validate coordinates are within bounds
  if (finalSourceX < 0 || finalSourceY < 0 || 
      finalSourceX + finalSourceW > img.naturalWidth ||
      finalSourceY + finalSourceH > img.naturalHeight) {
    console.error('Crop coordinates out of bounds:', {
      source: { x: finalSourceX, y: finalSourceY, w: finalSourceW, h: finalSourceH },
      image: { w: img.naturalWidth, h: img.naturalHeight }
    });
  }

  // Direct crop extraction from natural image
  ctx.drawImage(
    img,
    finalSourceX, finalSourceY, finalSourceW, finalSourceH,
    0, 0, targetWidth, targetHeight
  );

  // Return as high-quality JPEG
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/jpeg', 1.0);
  });
}