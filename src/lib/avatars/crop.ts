export interface CropTransform {
  /** Display scale relative to fitting the image inside the viewport. */
  scale: number;
  /** Horizontal pan in viewport pixels from center. */
  offsetX: number;
  /** Vertical pan in viewport pixels from center. */
  offsetY: number;
}

export interface CropSourceRect {
  sx: number;
  sy: number;
  sWidth: number;
  sHeight: number;
}

/** Map viewport pan/zoom to a square source rect on the natural image. */
export function computeSquareCropRect(
  imageWidth: number,
  imageHeight: number,
  viewportSize: number,
  transform: CropTransform
): CropSourceRect {
  const baseScale = Math.max(viewportSize / imageWidth, viewportSize / imageHeight);
  const scale = baseScale * transform.scale;
  const displayWidth = imageWidth * scale;
  const displayHeight = imageHeight * scale;
  const left = (viewportSize - displayWidth) / 2 + transform.offsetX;
  const top = (viewportSize - displayHeight) / 2 + transform.offsetY;

  const sx = clamp((0 - left) / scale, 0, imageWidth);
  const sy = clamp((0 - top) / scale, 0, imageHeight);
  const side = viewportSize / scale;
  const sWidth = Math.min(side, imageWidth - sx);
  const sHeight = Math.min(side, imageHeight - sy);
  const size = Math.min(sWidth, sHeight);

  return { sx, sy, sWidth: size, sHeight: size };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
