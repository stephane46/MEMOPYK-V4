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

export default async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  targetWidth: number = 300,
  targetHeight: number = 200,
  rotation: number = 0,
  flip = { horizontal: false, vertical: false }
): Promise<Blob | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return null;
  }

  // High-DPI support for crisp output
  const dpr = window.devicePixelRatio || 1;
  const outputWidth = targetWidth * dpr;
  const outputHeight = targetHeight * dpr;

  // Set canvas to high resolution
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  
  // Enable high-quality image smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  // Scale context for high-DPI
  ctx.scale(dpr, dpr);

  // Directly crop and draw from source image at full resolution
  // This avoids double-downsampling by working directly with original pixels
  ctx.drawImage(
    image,
    pixelCrop.x,        // Source X in original image
    pixelCrop.y,        // Source Y in original image  
    pixelCrop.width,    // Source width in original image
    pixelCrop.height,   // Source height in original image
    0,                  // Destination X (top-left of canvas)
    0,                  // Destination Y (top-left of canvas)
    targetWidth,        // Destination width (300)
    targetHeight        // Destination height (200)
  );

  // Return as blob
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/jpeg', 1.0); // Maximum quality
  });
}