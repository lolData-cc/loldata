import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Renders a team logo image. If the image is too dark (avg brightness < threshold),
 * it applies CSS invert + brightness to make it visible on dark backgrounds.
 */
export function TeamLogo({ src, alt = "", className = "" }: { src: string; alt?: string; className?: string }) {
  const [isDark, setIsDark] = useState(false);
  const analyzed = useRef(false);

  useEffect(() => {
    if (analyzed.current) return;
    analyzed.current = true;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const size = 32; // sample at small size for speed
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;

        let totalBrightness = 0;
        let opaquePixels = 0;
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          if (a < 30) continue; // skip transparent pixels
          opaquePixels++;
          // perceived brightness formula
          totalBrightness += (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
        }

        if (opaquePixels === 0) return;
        const avgBrightness = totalBrightness / opaquePixels;
        // If average brightness is below 50 (out of 255), it's too dark
        setIsDark(avgBrightness < 50);
      } catch {
        // CORS or canvas errors — skip analysis
      }
    };
    img.src = src;
  }, [src]);

  return (
    <img
      src={src}
      alt={alt}
      className={cn(className, isDark && "invert brightness-90")}
    />
  );
}
