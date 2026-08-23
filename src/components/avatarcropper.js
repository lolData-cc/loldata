import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// components/AvatarCropper.tsx
import { useCallback, useState } from "react";
import Cropper from "react-easy-crop";
import { getCroppedImg } from "@/utils/cropimage";
export function AvatarCropper({ file, onCancel, onCropped }) {
    const [imageUrl, setImageUrl] = useState(() => URL.createObjectURL(file));
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const onCropComplete = useCallback((_area, areaPixels) => {
        setCroppedAreaPixels(areaPixels);
    }, []);
    const handleConfirm = useCallback(async () => {
        if (!croppedAreaPixels)
            return;
        const blob = await getCroppedImg(imageUrl, crop, zoom, 1, // aspect 1:1 per avatar
        {
            x: croppedAreaPixels.x,
            y: croppedAreaPixels.y,
            width: croppedAreaPixels.width,
            height: croppedAreaPixels.height,
        }, 512, // output size
        "image/webp");
        onCropped(blob);
        URL.revokeObjectURL(imageUrl);
    }, [croppedAreaPixels, crop, zoom, imageUrl, onCropped]);
    return (_jsx("div", { className: "fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4", children: _jsxs("div", { className: "relative w-full max-w-lg rounded-[2px] border border-jade/10 bg-cement overflow-hidden shadow-2xl shadow-black/50", children: [_jsx("div", { className: "absolute left-0 top-0 bottom-0 w-[2px] bg-jade/40" }), _jsx("div", { className: "absolute inset-0 pointer-events-none z-[1]", style: { background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.015) 3px, rgba(255,255,255,0.015) 4px)" } }), _jsxs("div", { className: "absolute top-0 left-0 w-3 h-3 z-[3]", children: [_jsx("div", { className: "absolute top-0 left-0 w-full h-[1px] bg-jade/25" }), _jsx("div", { className: "absolute top-0 left-0 w-[1px] h-full bg-jade/25" })] }), _jsxs("div", { className: "absolute top-0 right-0 w-3 h-3 z-[3]", children: [_jsx("div", { className: "absolute top-0 right-0 w-full h-[1px] bg-jade/25" }), _jsx("div", { className: "absolute top-0 right-0 w-[1px] h-full bg-jade/25" })] }), _jsxs("div", { className: "absolute bottom-0 left-0 w-3 h-3 z-[3]", children: [_jsx("div", { className: "absolute bottom-0 left-0 w-full h-[1px] bg-jade/25" }), _jsx("div", { className: "absolute bottom-0 left-0 w-[1px] h-full bg-jade/25" })] }), _jsxs("div", { className: "absolute bottom-0 right-0 w-3 h-3 z-[3]", children: [_jsx("div", { className: "absolute bottom-0 right-0 w-full h-[1px] bg-jade/25" }), _jsx("div", { className: "absolute bottom-0 right-0 w-[1px] h-full bg-jade/25" })] }), _jsx("div", { className: "absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-jade/30 via-jade/10 to-transparent z-[3]" }), _jsx("div", { className: "relative z-[2] px-4 py-3 pl-5", children: _jsx("p", { className: "text-[11px] font-mono tracking-[0.25em] uppercase text-jade/50", children: ":: CROP AVATAR ::" }) }), _jsx("div", { className: "relative z-[2] h-[360px] bg-black/80 border-y border-jade/10", children: _jsx(Cropper, { image: imageUrl, crop: crop, zoom: zoom, aspect: 1, showGrid: false, onCropChange: setCrop, onZoomChange: setZoom, onCropComplete: onCropComplete, objectFit: "contain", restrictPosition: true, minZoom: 1, maxZoom: 3 }) }), _jsxs("div", { className: "relative z-[2] px-4 py-3 pl-5", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("input", { type: "range", min: 1, max: 3, step: 0.01, value: zoom, onChange: (e) => setZoom(Number(e.target.value)), className: "flex-1 accent-jade h-1 cursor-clicker" }), _jsxs("span", { className: "text-[10px] font-mono text-flash/30 w-10 text-right", children: [zoom.toFixed(1), "x"] })] }), _jsx("div", { className: "mt-3 h-[1px] bg-gradient-to-r from-jade/15 via-flash/8 to-transparent" }), _jsxs("div", { className: "flex justify-end gap-3 pt-3", children: [_jsx("button", { type: "button", onClick: onCancel, className: "px-3 py-1 rounded-[2px] border border-flash/15 hover:bg-flash/5 text-[11px] tracking-[0.1em] uppercase text-flash/50 cursor-clicker transition-colors", children: "CANCEL" }), _jsx("button", { type: "button", onClick: handleConfirm, className: "px-3 py-1 rounded-[2px] border border-jade/30 text-jade hover:bg-jade/10 text-[11px] tracking-[0.1em] uppercase cursor-clicker transition-colors", children: "\u25C8 SAVE" })] })] })] }) }));
}
