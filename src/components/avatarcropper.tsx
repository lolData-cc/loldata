// components/AvatarCropper.tsx
import { useCallback, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import { getCroppedImg } from "@/utils/cropimage";

type Props = {
  file: File;
  onCancel: () => void;
  onCropped: (blob: Blob) => void; // restituisce il blob già pronto per l'upload
};

export function AvatarCropper({ file, onCancel, onCropped }: Props) {
  const [imageUrl, setImageUrl] = useState<string>(() => URL.createObjectURL(file));
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!croppedAreaPixels) return;
    const blob = await getCroppedImg(
      imageUrl,
      crop,
      zoom,
      1, // aspect 1:1 per avatar
      {
        x: croppedAreaPixels.x,
        y: croppedAreaPixels.y,
        width: croppedAreaPixels.width,
        height: croppedAreaPixels.height,
      },
      512, // output size
      "image/webp"
    );
    onCropped(blob);
    URL.revokeObjectURL(imageUrl);
  }, [croppedAreaPixels, crop, zoom, imageUrl, onCropped]);

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-[2px] border border-jade/10 bg-cement overflow-hidden shadow-2xl shadow-black/50">
        {/* Left accent bar */}
        <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-jade/40" />
        {/* Scanlines */}
        <div className="absolute inset-0 pointer-events-none z-[1]" style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.015) 3px, rgba(255,255,255,0.015) 4px)" }} />
        {/* HUD bracket corners */}
        <div className="absolute top-0 left-0 w-3 h-3 z-[3]"><div className="absolute top-0 left-0 w-full h-[1px] bg-jade/25" /><div className="absolute top-0 left-0 w-[1px] h-full bg-jade/25" /></div>
        <div className="absolute top-0 right-0 w-3 h-3 z-[3]"><div className="absolute top-0 right-0 w-full h-[1px] bg-jade/25" /><div className="absolute top-0 right-0 w-[1px] h-full bg-jade/25" /></div>
        <div className="absolute bottom-0 left-0 w-3 h-3 z-[3]"><div className="absolute bottom-0 left-0 w-full h-[1px] bg-jade/25" /><div className="absolute bottom-0 left-0 w-[1px] h-full bg-jade/25" /></div>
        <div className="absolute bottom-0 right-0 w-3 h-3 z-[3]"><div className="absolute bottom-0 right-0 w-full h-[1px] bg-jade/25" /><div className="absolute bottom-0 right-0 w-[1px] h-full bg-jade/25" /></div>
        {/* Bottom gradient line */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-jade/30 via-jade/10 to-transparent z-[3]" />

        {/* Header */}
        <div className="relative z-[2] px-4 py-3 pl-5">
          <p className="text-[11px] font-mono tracking-[0.25em] uppercase text-jade/50">
            :: CROP AVATAR ::
          </p>
        </div>

        {/* Cropper area */}
        <div className="relative z-[2] h-[360px] bg-black/80 border-y border-jade/10">
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={1}
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            objectFit="contain"
            restrictPosition={true}
            minZoom={1}
            maxZoom={3}
          />
        </div>

        {/* Controls */}
        <div className="relative z-[2] px-4 py-3 pl-5">
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-jade h-1 cursor-clicker"
            />
            <span className="text-[10px] font-mono text-flash/30 w-10 text-right">{zoom.toFixed(1)}x</span>
          </div>

          <div className="mt-3 h-[1px] bg-gradient-to-r from-jade/15 via-flash/8 to-transparent" />

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1 rounded-[2px] border border-flash/15 hover:bg-flash/5 text-[11px] tracking-[0.1em] uppercase text-flash/50 cursor-clicker transition-colors"
            >
              CANCEL
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-3 py-1 rounded-[2px] border border-jade/30 text-jade hover:bg-jade/10 text-[11px] tracking-[0.1em] uppercase cursor-clicker transition-colors"
            >
              ◈ SAVE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
