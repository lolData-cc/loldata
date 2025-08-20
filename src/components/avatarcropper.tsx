// components/AvatarCropper.tsx
import { useCallback, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import { getCroppedImg } from "@/utils/cropImage";

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
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-md border border-flash/20 bg-liquirice shadow-lg">
        <div className="p-3 border-b border-flash/10 text-sm text-flash/70">Crop your avatar</div>

              <div className="relative h-[360px] bg-black">
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

              <div className="flex items-center gap-3 p-3">
                  <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full"
          />
          <button
            className="px-3 py-2 rounded-sm border border-flash/20 hover:bg-flash/10"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="px-3 py-2 rounded-sm border border-jade/30 text-jade hover:bg-jade/10"
            onClick={handleConfirm}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
