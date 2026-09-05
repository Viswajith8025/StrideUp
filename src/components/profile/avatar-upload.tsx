"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { compressCroppedAvatarInWorker } from "@/lib/avatars/compress";
import { computeSquareCropRect, type CropTransform } from "@/lib/avatars/crop";
import { uploadAvatarBlob } from "@/lib/avatars/storage";
import { avatarUploadFileSchema } from "@/lib/validation/schemas";

const VIEWPORT_SIZE = 280;

interface AvatarUploadProps {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  onUploaded: (url: string) => void;
}

export function AvatarUpload({ userId, displayName, avatarUrl, onUploaded }: AvatarUploadProps) {
  const supabase = createClient();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);

  const [cropOpen, setCropOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [transform, setTransform] = useState<CropTransform>({ scale: 1, offsetX: 0, offsetY: 0 });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const resetCrop = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setNaturalSize({ width: 0, height: 0 });
    setTransform({ scale: 1, offsetX: 0, offsetY: 0 });
    setCropOpen(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onFileSelected = (file: File | undefined) => {
    if (!file) return;
    const parsed = avatarUploadFileSchema.safeParse(file);
    if (!parsed.success) {
      toast(parsed.error.issues[0]?.message ?? "Invalid image", "error");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setTransform({ scale: 1, offsetX: 0, offsetY: 0 });
    setCropOpen(true);
  };

  const onImageLoaded = (img: HTMLImageElement) => {
    imageRef.current = img;
    setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      offsetX: transform.offsetX,
      offsetY: transform.offsetY,
    };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const dx = event.clientX - dragRef.current.x;
    const dy = event.clientY - dragRef.current.y;
    setTransform((prev) => ({
      ...prev,
      offsetX: dragRef.current!.offsetX + dx,
      offsetY: dragRef.current!.offsetY + dy,
    }));
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const baseScale =
    naturalSize.width && naturalSize.height
      ? Math.max(VIEWPORT_SIZE / naturalSize.width, VIEWPORT_SIZE / naturalSize.height)
      : 1;

  const displayWidth = naturalSize.width * baseScale * transform.scale;
  const displayHeight = naturalSize.height * baseScale * transform.scale;
  const imageLeft = (VIEWPORT_SIZE - displayWidth) / 2 + transform.offsetX;
  const imageTop = (VIEWPORT_SIZE - displayHeight) / 2 + transform.offsetY;

  const handleUpload = useCallback(async () => {
    const img = imageRef.current;
    if (!img || !naturalSize.width) return;
    setUploading(true);
    try {
      const crop = computeSquareCropRect(
        naturalSize.width,
        naturalSize.height,
        VIEWPORT_SIZE,
        transform
      );
      const blob = await compressCroppedAvatarInWorker(img, crop);
      const publicUrl = await uploadAvatarBlob(supabase, userId, blob, avatarUrl);
      onUploaded(publicUrl);
      toast("Profile photo updated", "success");
      resetCrop();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Upload failed", "error");
    } finally {
      setUploading(false);
    }
  }, [avatarUrl, naturalSize.height, naturalSize.width, onUploaded, supabase, toast, transform, userId]);

  return (
    <>
      <div className="relative">
        <Avatar name={displayName} src={avatarUrl} size="lg" />
        <button
          type="button"
          className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-foreground shadow"
          onClick={() => inputRef.current?.click()}
          aria-label="Change profile photo"
        >
          <Camera size={18} />
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          className="hidden"
          onChange={(e) => onFileSelected(e.target.files?.[0])}
        />
      </div>

      <Sheet open={cropOpen} onClose={resetCrop} title="Crop photo">
        <div
          className="relative mx-auto mb-4 overflow-hidden rounded-2xl bg-black touch-none"
          style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Crop preview"
              draggable={false}
              onLoad={(e) => onImageLoaded(e.currentTarget)}
              className="absolute max-w-none select-none"
              style={{
                width: displayWidth,
                height: displayHeight,
                left: imageLeft,
                top: imageTop,
              }}
            />
          )}
          <div className="pointer-events-none absolute inset-0 ring-2 ring-inset ring-white/80" />
        </div>

        <label className="mb-4 block text-sm text-muted">
          Zoom
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={transform.scale}
            onChange={(e) =>
              setTransform((prev) => ({ ...prev, scale: parseFloat(e.target.value) }))
            }
            className="mt-1 w-full"
          />
        </label>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={resetCrop} disabled={uploading}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleUpload} disabled={uploading || !naturalSize.width}>
            {uploading ? "Saving…" : "Save photo"}
          </Button>
        </div>
      </Sheet>
    </>
  );
}
