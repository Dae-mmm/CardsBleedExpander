export function expandBleedFromImage(
  image: HTMLImageElement | ImageBitmap,
  bleed: number,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const width = image.width;
  const height = image.height;
  canvas.width = width + bleed * 2;
  canvas.height = height + bleed * 2;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return Promise.reject(new Error("Canvas non disponibile."));
  }

  if (bleed > 0) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, 0, 0, 1, 1, 0, 0, bleed, bleed);
    ctx.drawImage(image, width - 1, 0, 1, 1, width + bleed, 0, bleed, bleed);
    ctx.drawImage(image, 0, height - 1, 1, 1, 0, height + bleed, bleed, bleed);
    ctx.drawImage(
      image,
      width - 1,
      height - 1,
      1,
      1,
      width + bleed,
      height + bleed,
      bleed,
      bleed,
    );
    ctx.drawImage(image, 0, 0, width, 1, bleed, 0, width, bleed);
    ctx.drawImage(
      image,
      0,
      height - 1,
      width,
      1,
      bleed,
      height + bleed,
      width,
      bleed,
    );
    ctx.drawImage(image, 0, 0, 1, height, 0, bleed, bleed, height);
    ctx.drawImage(
      image,
      width - 1,
      0,
      1,
      height,
      width + bleed,
      bleed,
      bleed,
      height,
    );
  }

  ctx.drawImage(image, bleed, bleed);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Export PNG fallito."));
    }, "image/png");
  });
}
