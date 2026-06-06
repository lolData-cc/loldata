// src/components/matchreplay/useReplayPlayback.ts
//
// The playback engine for the replay viewer.
//
// State:
//   timeMs       — current playhead in ms (0..durationMs)
//   isPlaying    — boolean
//   speed        — multiplier (1 = realtime, 4 = 4×, etc.)
//
// Loop:
//   On each requestAnimationFrame, advance timeMs by
//   (wallDeltaMs * speed). At wallDelta ~16ms and speed=8×, we cover
//   128 game-ms per frame — which is well below the 60_000 ms frame
//   interval, so the interpolated positions stay smooth.
//
// We deliberately use rAF rather than setInterval — setInterval drifts
// with tab visibility, and rAF gives us implicit pause when the user
// switches tab (the browser stops firing the callback). On resume, we
// pick up from where we left off without snapping.
import { useCallback, useEffect, useRef, useState } from "react";
export function useReplayPlayback(opts) {
    const { durationMs, initialMs = 0, initialSpeed = 4, loop = false } = opts;
    const [timeMs, setTimeMs] = useState(initialMs);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeedState] = useState(initialSpeed);
    // Refs so the rAF closure stays stable while reading current speed/state.
    const speedRef = useRef(speed);
    const timeRef = useRef(timeMs);
    const playingRef = useRef(isPlaying);
    const durationRef = useRef(durationMs);
    useEffect(() => { speedRef.current = speed; }, [speed]);
    useEffect(() => { timeRef.current = timeMs; }, [timeMs]);
    useEffect(() => { playingRef.current = isPlaying; }, [isPlaying]);
    useEffect(() => { durationRef.current = durationMs; }, [durationMs]);
    // Clamp on duration change (loading completion).
    useEffect(() => {
        if (durationMs > 0 && timeRef.current > durationMs) {
            setTimeMs(durationMs);
        }
    }, [durationMs]);
    // The rAF loop.
    useEffect(() => {
        let last = performance.now();
        let raf = 0;
        const tick = (now) => {
            const dt = now - last;
            last = now;
            if (playingRef.current) {
                const nextRaw = timeRef.current + dt * speedRef.current;
                const dur = durationRef.current;
                if (dur > 0 && nextRaw >= dur) {
                    if (loop) {
                        setTimeMs(0);
                    }
                    else {
                        setTimeMs(dur);
                        playingRef.current = false;
                        setIsPlaying(false);
                    }
                }
                else {
                    setTimeMs(nextRaw);
                }
            }
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [loop]);
    const play = useCallback(() => {
        // If we're at the end, rewind first.
        if (timeRef.current >= durationRef.current && durationRef.current > 0) {
            setTimeMs(0);
        }
        setIsPlaying(true);
    }, []);
    const pause = useCallback(() => setIsPlaying(false), []);
    const toggle = useCallback(() => setIsPlaying((p) => !p), []);
    const setSpeed = useCallback((s) => setSpeedState(s), []);
    const seek = useCallback((ms) => {
        const dur = durationRef.current;
        setTimeMs(Math.max(0, Math.min(dur, ms)));
    }, []);
    const step = useCallback((deltaMs) => {
        const dur = durationRef.current;
        setTimeMs((t) => Math.max(0, Math.min(dur, t + deltaMs)));
    }, []);
    return { timeMs, isPlaying, speed, play, pause, toggle, setSpeed, seek, step };
}
