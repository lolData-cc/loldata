import { jsx as _jsx } from "react/jsx-runtime";
// src/components/update.tsx
// Profile-card UPDATE action. Chrome comes from ActionButton so it stays in
// lockstep with ANALYZE next to it; this file only owns the cooldown wording
// and the drain bar.
import { useEffect, useState } from "react";
import { ActionButton } from "@/components/ui/actionbutton";
const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
export function UpdateButton({ loading, cooldown, cooldownSeconds, children, ...props }) {
    // The API hands us the seconds left, never the window it was cut from, so the
    // longest value seen this cycle IS the window — good enough to draw against,
    // and it resets when the cooldown ends.
    const [window, setWindow] = useState(0);
    useEffect(() => {
        if (!cooldown) {
            setWindow(0);
            return;
        }
        setWindow(w => Math.max(w, cooldownSeconds ?? 0));
    }, [cooldown, cooldownSeconds]);
    const label = cooldown && cooldownSeconds
        ? formatTime(cooldownSeconds)
        : cooldown
            ? "UPDATED"
            : (children || "UPDATE");
    return (_jsx(ActionButton, { ...props, accent: "citrine", label: label, loading: loading, muted: cooldown, disabled: cooldown, progress: cooldown && window > 0 ? (cooldownSeconds ?? 0) / window : undefined }));
}
