// utils/cropImage.ts
export async function getCroppedImg(
  imageSrc: string,
  crop: { x: number; y: number },
  zoom: number,
  aspect: number,
  pixelCrop: { width: number; height: number; x: number; y: number },
  outSize = 512, // lato finale (quadrato)
  mime = "image/webp"
): Promise<Blob> {
  const img = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  // output quadrato
  canvas.width = outSize;
  canvas.height = outSize;

  // calcola scala in base a zoom e dimensioni originali
  const scaleX = img.naturalWidth / img.width;
  const scaleY = img.naturalHeight / img.height;

  // area ritagliata in pixel originali
  const sx = pixelCrop.x * scaleX;
  const sy = pixelCrop.y * scaleY;
  const sWidth = pixelCrop.width * scaleX;
  const sHeight = pixelCrop.height * scaleY;

  // disegna sul canvas finale
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, outSize, outSize);

  return await new Promise((resolve) =>
    canvas.toBlob((blob) => resolve(blob!), mime, 0.9)
  );
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", (e) => reject(e));
    img.crossOrigin = "anonymous";
    img.src = url;
  });
}
