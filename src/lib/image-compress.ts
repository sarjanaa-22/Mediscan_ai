// Compress an image (data URL or Blob) to JPEG, max width 1200px, quality 0.8.
export async function compressImage(
  source: string | Blob,
  opts: { maxWidth?: number; quality?: number; mime?: string } = {},
): Promise<string> {
  const maxWidth = opts.maxWidth ?? 1200;
  const quality = opts.quality ?? 0.8;
  const mime = opts.mime ?? "image/jpeg";

  const dataUrl =
    typeof source === "string"
      ? source
      : await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result as string);
          r.onerror = reject;
          r.readAsDataURL(source);
        });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });

  const scale = Math.min(1, maxWidth / img.width);
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL(mime, quality);
}
