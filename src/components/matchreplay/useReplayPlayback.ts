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

export type ReplaySpeed = 0.5 | 1 | 2 | 4 | 8 | 16;

export interface ReplayPlayback {
  timeMs: number;
  isPlaying: boolean;
  speed: ReplaySpeed;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  setSpeed: (s: ReplaySpeed) => void;
  seek: (ms: number) => void;
  step: (deltaMs: number) => void;
}

export function useReplayPlayback(opts: {
  durationMs: number;
  initialMs?: number;
  initialSpeed?: ReplaySpeed;
  loop?: boolean;
  /** When set, playback is constrained to this range. The rAF tick
   *  snaps back to range.start every time it crosses range.end, and
   *  play() rewinds to range.start if the head is outside. Manual
   *  seeks (eg. dragging the scrubber) are not clamped — the user
   *  remains free to inspect outside the band; pressing play just
   *  pulls them back in. */
  loopRange?: { start: number; end: number } | null;
}): ReplayPlayback {
  const { durationMs, initialMs = 0, initialSpeed = 4, loop = false, loopRange = null } = opts;

  const [timeMs, setTimeMs] = useState(initialMs);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeedState] = useState<ReplaySpeed>(initialSpeed);

  // Refs so the rAF closure stays stable while reading current speed/state.
  const speedRef = useRef(speed);
  const timeRef = useRef(timeMs);
  const playingRef = useRef(isPlaying);
  const durationRef = useRef(durationMs);
  const loopRangeRef = useRef(loopRange);

  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { timeRef.current = timeMs; }, [timeMs]);
  useEffect(() => { playingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { durationRef.current = durationMs; }, [durationMs]);
  useEffect(() => { loopRangeRef.current = loopRange; }, [loopRange]);

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
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      if (playingRef.current) {
        const nextRaw = timeRef.current + dt * speedRef.current;
        const dur = durationRef.current;
        const range = loopRangeRef.current;
        if (range) {
          // Range-loop mode: bounce back to start when we cross the
          // end marker. If the head is BELOW range.start (user seeked
          // outside while playing), pull it back to start too so the
          // loop hook always re-enters at the band's leading edge.
          if (nextRaw >= range.end || timeRef.current < range.start) {
            setTimeMs(range.start);
          } else {
            setTimeMs(nextRaw);
          }
        } else if (dur > 0 && nextRaw >= dur) {
          if (loop) {
            setTimeMs(0);
          } else {
            setTimeMs(dur);
            playingRef.current = false;
            setIsPlaying(false);
          }
        } else {
          setTimeMs(nextRaw);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [loop]);

  const play = useCallback(() => {
    const range = loopRangeRef.current;
    const dur = durationRef.current;
    if (range) {
      // Pull the head back into the band on play so pressing play
      // after an out-of-range seek does what the user expects.
      if (timeRef.current < range.start || timeRef.current >= range.end) {
        setTimeMs(range.start);
      }
    } else if (timeRef.current >= dur && dur > 0) {
      // No range — wrap from end-of-match.
      setTimeMs(0);
    }
    setIsPlaying(true);
  }, []);
  const pause = useCallback(() => setIsPlaying(false), []);
  const toggle = useCallback(() => setIsPlaying((p) => !p), []);
  const setSpeed = useCallback((s: ReplaySpeed) => setSpeedState(s), []);
  const seek = useCallback((ms: number) => {
    const dur = durationRef.current;
    setTimeMs(Math.max(0, Math.min(dur, ms)));
  }, []);
  const step = useCallback((deltaMs: number) => {
    const dur = durationRef.current;
    setTimeMs((t) => Math.max(0, Math.min(dur, t + deltaMs)));
  }, []);

  return { timeMs, isPlaying, speed, play, pause, toggle, setSpeed, seek, step };
}
