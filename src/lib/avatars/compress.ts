import { AVATAR_OUTPUT_SIZE, AVATAR_WEBP_QUALITY } from "./constants";
import type { CropSourceRect } from "./crop";

async function blobFromCanvas(
  canvas: OffscreenCanvas | HTMLCanvasElement,
  quality: number
): Promise<Blob> {
  if (canvas instanceof OffscreenCanvas) {
    return canvas.convertToBlob({ type: "image/webp", quality });
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Failed to encode image"))),
      "image/webp",
      quality
    );
  });
}

function drawCroppedSquare(
  canvas: OffscreenCanvas | HTMLCanvasElement,
  image: CanvasImageSource,
  crop: CropSourceRect,
  outputSize: number
): void {
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (!ctx) throw new Error("Canvas context unavailable");
  canvas.width = outputSize;
  canvas.height = outputSize;
  ctx.drawImage(
    image,
    crop.sx,
    crop.sy,
    crop.sWidth,
    crop.sHeight,
    0,
    0,
    outputSize,
    outputSize
  );
}

export async function compressCroppedAvatar(
  image: CanvasImageSource,
  crop: CropSourceRect,
  outputSize = AVATAR_OUTPUT_SIZE
): Promise<Blob> {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(outputSize, outputSize);
    drawCroppedSquare(canvas, image, crop, outputSize);
    return blobFromCanvas(canvas, AVATAR_WEBP_QUALITY);
  }

  const canvas = document.createElement("canvas");
  drawCroppedSquare(canvas, image, crop, outputSize);
  return blobFromCanvas(canvas, AVATAR_WEBP_QUALITY);
}

type WorkerResult = { blob?: Blob; error?: string };

let worker: Worker | null = null;

function getCompressWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("./compress.worker.ts", import.meta.url));
  }
  return worker;
}

/** Off-thread encode when ImageBitmap is available (avoids main-thread stalls on mid-tier phones). */
export async function compressCroppedAvatarInWorker(
  image: CanvasImageSource,
  crop: CropSourceRect,
  outputSize = AVATAR_OUTPUT_SIZE
): Promise<Blob> {
  if (typeof createImageBitmap !== "function" || typeof Worker === "undefined") {
    return compressCroppedAvatar(image, crop, outputSize);
  }

  const scratch = document.createElement("canvas");
  scratch.width = outputSize;
  scratch.height = outputSize;
  const ctx = scratch.getContext("2d");
  if (!ctx) return compressCroppedAvatar(image, crop, outputSize);

  ctx.drawImage(
    image,
    crop.sx,
    crop.sy,
    crop.sWidth,
    crop.sHeight,
    0,
    0,
    outputSize,
    outputSize
  );

  const bitmap = await createImageBitmap(scratch);
  const w = getCompressWorker();

  return new Promise<Blob>((resolve, reject) => {
    const onMessage = (event: MessageEvent<WorkerResult>) => {
      w.removeEventListener("message", onMessage);
      bitmap.close();
      if (event.data.error) reject(new Error(event.data.error));
      else if (event.data.blob) resolve(event.data.blob);
      else reject(new Error("Worker returned no blob"));
    };
    w.addEventListener("message", onMessage);
    w.postMessage({ bitmap, quality: AVATAR_WEBP_QUALITY }, [bitmap]);
  });
}
