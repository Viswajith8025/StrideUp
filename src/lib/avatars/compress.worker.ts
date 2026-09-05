/// <reference lib="webworker" />

type WorkerRequest = {
  bitmap: ImageBitmap;
  quality: number;
};

type WorkerResponse = {
  blob?: Blob;
  error?: string;
};

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { bitmap, quality } = event.data;
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      postMessage({ error: "Canvas context unavailable" } satisfies WorkerResponse);
      return;
    }
    ctx.drawImage(bitmap, 0, 0);
    const blob = await canvas.convertToBlob({ type: "image/webp", quality });
    bitmap.close();
    postMessage({ blob } satisfies WorkerResponse);
  } catch (err) {
    bitmap.close();
    postMessage({
      error: err instanceof Error ? err.message : "Compression failed",
    } satisfies WorkerResponse);
  }
};
