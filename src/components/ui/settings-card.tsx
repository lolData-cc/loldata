// The single reusable card for every dashboard settings section (Avatar,
// Discord, League, Security, Danger, and the Preferences rows). It uses the
// site's signature "glassDark" glass surface — dark translucent bg + blur + a
// hairline inset — so the dashboard reads native to the rest of the app
// (summoner / scout / billing) instead of the old cyber-HUD look.
//
// Usage:
//   <SettingsCard title="League profile" hint="◈ LINKED">…</SettingsCard>
//   <SettingsCard title="Danger zone" variant="danger">…</SettingsCard>

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "danger";

export function SettingsCard({
  title,
  hint,
  variant = "default",
  className,
  contentClassName,
  children,
}: {
  title?: string;
  /** small muted text on the right of the header (status, meta…) */
  hint?: ReactNode;
  variant?: Variant;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
}) {
  const danger = variant === "danger";

  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden rounded-md",
        "backdrop-blur-lg saturate-150",
        // Theme-aware glass: dark keeps the historic light-film-on-near-black
        // look; light becomes a crisp elevated paper card. Both recipes live in
        // .glass-surface (index.css) so the surface flips with the theme.
        danger
          ? "bg-error/[0.06] shadow-[0_10px_30px_rgb(var(--c-filmdark)/0.30),inset_0_0_0_1px_rgb(var(--c-error)/0.30),inset_0_1px_0_rgb(var(--c-error)/0.14)]"
          : "glass-surface",
        className
      )}
    >
      <div className="relative z-[1] flex flex-1 flex-col px-4 py-3.5">
        {(title || hint) && (
          <div className="mb-3 flex items-center justify-between gap-3">
            {title && (
              <p
                className={cn(
                  "font-mono text-[11px] uppercase tracking-[0.25em]",
                  danger ? "text-[#ff6286]/75" : "text-jade/55"
                )}
              >
                {title}
              </p>
            )}
            {hint && <span className="shrink-0 font-mono text-[10px] tracking-[0.08em] text-flash/30">{hint}</span>}
          </div>
        )}
        <div className={cn("flex-1", contentClassName)}>{children}</div>
      </div>
    </div>
  );
}
