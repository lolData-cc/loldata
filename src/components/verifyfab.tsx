// src/components/verifyfab.tsx
//
// Bottom-left rhombus FAB that opens the per-account verify dialog.
// Visible only when the current user has claimed an identity in the
// lobby they're viewing AND that identity is not yet at Grade 2.
//
// Anchored fixed; sits above the page content via z-50 so it doesn't
// disappear under match cards on scroll.

import * as React from "react";
import { ShieldCheck } from "lucide-react";
import { DiamondButton } from "@/components/ui/diamond-button";
import { cn } from "@/lib/utils";

export function VerifyFab({
  onOpen,
  className,
}: {
  onOpen: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "fixed bottom-6 left-6 z-50 flex flex-col items-center",
        className
      )}
    >
      <DiamondButton
        color="blue"
        icon={<ShieldCheck className="w-4 h-4" />}
        label="Verify"
        onClick={onOpen}
        aria-label="Verify accounts"
      />
    </div>
  );
}
