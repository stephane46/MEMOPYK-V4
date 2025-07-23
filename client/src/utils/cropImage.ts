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

// Simplified approach: Direct viewport capture
export default async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  targetWidth: number = 300,
  targetHeight: number = 200
): Promise<Blob | null> {
  // Alternative approach: Use HTML2Canvas to capture exactly what's visible
  const cropperContainer = document.querySelector('.reactEasyCrop_Container');
  
  if (cropperContainer && (window as any).html2canvas) {
    try {
      const canvas = await (window as any).html2canvas(cropperContainer, {
        width: targetWidth,
        height: targetHeight,
        scale: 1,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null
      });
      
      return new Promise((resolve) => {
        canvas.toBlob((blob: Blob | null) => {
          resolve(blob);
        }, 'image/jpeg', 1.0);
      });
    } catch (error) {
      console.log('HTML2Canvas failed, using manual approach');
    }
  }

  // Fallback: Manual cropping with coordinate correction
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return null;
  }

  // High-DPI support for crisp output
  const dpr = window.devicePixelRatio || 1;
  
  // Set canvas to high resolution
  canvas.width = targetWidth * dpr;
  canvas.height = targetHeight * dpr;
  
  // Enable high-quality image smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  // Scale context for high-DPI
  ctx.scale(dpr, dpr);

  // Get the actual cropper element to understand the scaling
  const imageElement = cropperContainer?.querySelector('img') as HTMLImageElement;
  
  if (imageElement) {
    // Calculate the scale factor between natural and displayed image
    const scaleX = image.naturalWidth / imageElement.clientWidth;
    const scaleY = image.naturalHeight / imageElement.clientHeight;
    
    // Apply scale to crop coordinates
    const sourceX = pixelCrop.x * scaleX;
    const sourceY = pixelCrop.y * scaleY;
    const sourceWidth = pixelCrop.width * scaleX;
    const sourceHeight = pixelCrop.height * scaleY;
    
    console.log('Crop debug:', {
      natural: { w: image.naturalWidth, h: image.naturalHeight },
      displayed: { w: imageElement.clientWidth, h: imageElement.clientHeight },
      scale: { x: scaleX, y: scaleY },
      crop: { x: pixelCrop.x, y: pixelCrop.y, w: pixelCrop.width, h: pixelCrop.height },
      source: { x: sourceX, y: sourceY, w: sourceWidth, h: sourceHeight }
    });

    ctx.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      targetWidth,
      targetHeight
    );
  } else {
    // Ultimate fallback
    ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
  }

  // Return as blob
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/jpeg', 1.0);
  });
}