// src/components/home-shortcuts/storage.ts
//
// Persistent storage for the homepage shortcut slots. Three slots
// (indices 0..2), each either a ShortcutSlot or null (empty).
// Backing store is plain localStorage — per-device, no cross-device
// sync. A same-tab CustomEvent lets multiple instances of the slot
// bar (e.g. nav + homepage) stay in sync without forcing a remount.

import type { ShortcutSlot } from "./types"

const KEY = "loldata:home-shortcuts"
const UPDATED_EVENT = "loldata:home-shortcuts:updated"

export const SLOT_COUNT = 3

export type SlotsState = (ShortcutSlot | null)[]

const EMPTY: SlotsState = Array.from({ length: SLOT_COUNT }, () => null)

/** Read the slot trio from localStorage. Returns a fresh array of
 *  length SLOT_COUNT — corrupt blobs reset to empty. */
export function readSlots(): SlotsState {
  if (typeof window === "undefined") return [...EMPTY]
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return [...EMPTY]
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return [...EMPTY]
    // Normalise length & shape: keep first SLOT_COUNT entries, pad
    // with null if shorter, drop any garbage entries.
    const out: SlotsState = []
    for (let i = 0; i < SLOT_COUNT; i++) {
      const v = parsed[i]
      out.push(isValidSlot(v) ? v : null)
    }
    return out
  } catch {
    return [...EMPTY]
  }
}

/** Write the slot trio to localStorage and broadcast the update event. */
export function writeSlots(slots: SlotsState): void {
  if (typeof window === "undefined") return
  const trimmed = slots.slice(0, SLOT_COUNT)
  // Pad to length SLOT_COUNT just in case the caller passed fewer.
  while (trimmed.length < SLOT_COUNT) trimmed.push(null)
  try {
    localStorage.setItem(KEY, JSON.stringify(trimmed))
    window.dispatchEvent(new CustomEvent(UPDATED_EVENT))
  } catch {
    /* quota — silent fail, caller still gets the in-memory state */
  }
}

/** Replace one slot in the trio. Index outside [0, SLOT_COUNT) is a
 *  no-op so callers never need to range-check. */
export function setSlot(index: number, value: ShortcutSlot | null): void {
  if (index < 0 || index >= SLOT_COUNT) return
  const current = readSlots()
  current[index] = value
  writeSlots(current)
}

/** Convenience: clear one slot (sets to null). */
export function clearSlot(index: number): void {
  setSlot(index, null)
}

/** Subscribe to same-tab updates. Returns unsubscribe. */
export function subscribeSlots(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {}
  window.addEventListener(UPDATED_EVENT, handler)
  return () => window.removeEventListener(UPDATED_EVENT, handler)
}

// ─── helpers ────────────────────────────────────────────────────────

function isValidSlot(v: unknown): v is ShortcutSlot {
  if (!v || typeof v !== "object") return false
  const kind = (v as { kind?: unknown }).kind
  return (
    kind === "champion" ||
    kind === "summoner" ||
    kind === "scout" ||
    kind === "learn" ||
    kind === "loldle" ||
    kind === "leaderboard"
  )
}
