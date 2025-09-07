// src/context/championPickerContext.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// shadcn sheet picker
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
export type ChampItem = { id: string; label: string; image: string };
type PickerMode = "radial" | "sheet";

type Ctx = {
  openPicker: () => void;
  closePicker: () => void;
  pickerMode: PickerMode;
  setPickerMode: (m: PickerMode) => void;
};

const ChampionPickerCtx = createContext<Ctx | null>(null);

export function useChampionPicker() {
  const ctx = useContext(ChampionPickerCtx);
  if (!ctx) throw new Error("useChampionPicker must be used within ChampionPickerProvider");
  return ctx;
}

// ─────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────
export function ChampionPickerProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ChampItem[]>([]);
  const [latestPatch, setLatestPatch] = useState("15.13.1");

  const [pickerMode, setPickerMode] = useState<PickerMode>(() => {
    if (typeof window === "undefined") return "sheet";
    try {
      const saved = localStorage.getItem("pickerMode");
      return saved === "sheet" || saved === "radial" ? (saved as PickerMode) : "sheet";
    } catch {
      return "sheet";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("pickerMode", pickerMode);
    } catch {}
  }, [pickerMode]);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    fetch("https://ddragon.leagueoflegends.com/api/versions.json")
      .then((r) => r.json())
      .then((versions: string[]) => {
        if (Array.isArray(versions) && versions.length > 0) setLatestPatch(versions[0]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`https://cdn.loldata.cc/${latestPatch}/data/en_US/champion.json`)
      .then((r) => r.json())
      .then((data) => {
        const champs = Object.values<any>(data?.data ?? {});
        const sorted = champs.sort((a, b) => a.id.localeCompare(b.id));
        const list: ChampItem[] = sorted.map((c: any) => ({
          id: String(c.id),
          label: c.id,
          image: `https://cdn.loldata.cc/${latestPatch}/img/champion/${c.id}.png`,
        }));
        setItems(list);
      })
      .catch(console.error);
  }, [latestPatch]);

  const openPicker = useCallback(() => setOpen(true), []);
  const closePicker = useCallback(() => setOpen(false), []);

  const onConfirm = useCallback(
    (it: ChampItem) => {
      setOpen(false);
      navigate(`/champions/${it.id}`);
    },
    [navigate]
  );

  const ctxValue = useMemo(
    () => ({ openPicker, closePicker, pickerMode, setPickerMode }),
    [openPicker, closePicker, pickerMode]
  );

  return (
    <ChampionPickerCtx.Provider value={ctxValue}>
      {children}

      {/* Portal: il picker è renderizzato in cima a tutto, ovunque tu sia */}
      {typeof document !== "undefined" &&
        createPortal(
          pickerMode === "radial" ? (
            <RadialChampionDock open={open} items={items} onClose={closePicker} onConfirm={onConfirm} />
          ) : (
            <SheetChampionPicker open={open} items={items} onClose={closePicker} onConfirm={onConfirm} />
          ),
          document.body
        )}
    </ChampionPickerCtx.Provider>
  );
}

// ─────────────────────────────────────────────────────────────
// Radial Champion Dock (TUO COMPONENTE ORIGINALE)
// ─────────────────────────────────────────────────────────────

type Pt = { x: number; y: number };
const degToRad = (d: number) => (d * Math.PI) / 180;
const polar = (cx: number, cy: number, r: number, angleDeg: number): Pt => {
  const a = degToRad(angleDeg);
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
};

type LaidOut = {
  item: ChampItem;
  ringIndex: number;
  startAngleBase: number;
  endAngleBase: number;
};

function layoutWindowedPerRing(
  items: ChampItem[],
  ringCount: number,
  ringCols: number[],
  colOffset: number
): LaidOut[] {
  if (!items.length) return [];
  const totalCols = Math.ceil(items.length / ringCount);
  const result: LaidOut[] = [];
  for (let r = 0; r < ringCount; r++) {
    const colsVis = ringCols[r] ?? ringCols[ringCols.length - 1];
    const span = 360 / colsVis;
    for (let k = 0; k < colsVis; k++) {
      const col = (colOffset + k + totalCols) % totalCols;
      const idx = col * ringCount + r;
      if (idx >= items.length) continue;
      const item = items[idx];
      const start = k * span;
      const end = start + span;
      result.push({ item, ringIndex: r, startAngleBase: start, endAngleBase: end });
    }
  }
  return result;
}

function RadialChampionDock({
  open,
  items,
  onClose,
  onConfirm,
}: {
  open: boolean;
  items: ChampItem[];
  onClose: () => void;
  onConfirm: (item: ChampItem) => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/0" onClick={onClose} />

      {/* Dock */}
      <div
        className="absolute inset-x-0 bottom-0 h-[320px] md:h-[380px]
                   bg-gradient-to-t from-neutral-950/95 via-neutral-950/80 to-neutral-950/20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative h-full w-full overflow-hidden">
          {/* BLUR GRADIENTE: forte in basso -> nullo in alto */}
          <div
            className="pointer-events-none absolute inset-0
                       backdrop-blur-xl
                       [mask-image:linear-gradient(to_top,rgba(0,0,0,1)_0%,rgba(0,0,0,.75)_35%,rgba(0,0,0,.35)_65%,rgba(0,0,0,0)_100%)]
                       [-webkit-mask-image:linear-gradient(to_top,rgba(0,0,0,1)_0%,rgba(0,0,0,.75)_35%,rgba(0,0,0,.35)_65%,rgba(0,0,0,0)_100%)]"
          />

          <RadialWheel items={items} onConfirm={onConfirm} />

          {/* piccolo fade di chiusura sul bordo basso */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-neutral-950/90 to-transparent" />
        </div>
      </div>
    </div>
  );
}

function RadialWheel({ items, onConfirm }: { items: ChampItem[]; onConfirm: (item: ChampItem) => void }) {
  const width = 820,
    height = 820,
    cx = width / 2,
    cy = height / 2;
  const ringCount = 3,
    baseInnerRadius = 126,
    ringGap = 6,
    ringThickness = 72;
  const ringCols = [12, 18, 24];

  const [colOffset, setColOffset] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Pre-calcola gli slot (posizioni fisse)
  const slots = useMemo(() => {
    const out: { r: number; k: number; cx: number; cy: number; avatarSize: number; clipId: string }[] = [];
    for (let r = 0; r < ringCount; r++) {
      const cols = ringCols[r] ?? ringCols[ringCols.length - 1];
      const span = 360 / cols;
      const innerR = baseInnerRadius + r * (ringThickness + ringGap);
      for (let k = 0; k < cols; k++) {
        const mid = (k + 0.5) * span;
        const outwardBias = (ringCount - 1 - r) * 10;
        const tileR = innerR + ringThickness / 2 + outwardBias;
        const { x, y } = polar(cx, cy, tileR, mid);
        const basePad = 4,
          extraPad = (ringCount - 1 - r) * 6;
        const pad = basePad + extraPad;
        const avatarSize = Math.max(22, ringThickness - pad * 2);
        out.push({ r, k, cx: x, cy: y, avatarSize, clipId: `clip-r${r}-k${k}` });
      }
    }
    return out;
  }, []);

  // Mappa slot → item index (dipende dal colOffset)
  const slotItems = useMemo(() => {
    const result: (ChampItem | null)[] = [];
    if (!items.length) return result;
    const totalCols = Math.ceil(items.length / ringCount);

    for (const s of slots) {
      const colsVis = ringCols[s.r] ?? ringCols[ringCols.length - 1];
      void colsVis; // kept for clarity; no direct usage below
      const kGlobal = ((colOffset % totalCols) + totalCols) % totalCols; // normalizza
      // k visibile nello slot s.k diventa una "colonna" globale
      const col = (kGlobal + s.k) % totalCols;
      const idx = col * ringCount + s.r;
      result.push(items[idx] ?? null);
    }
    return result;
  }, [slots, items, colOffset, ringCols, ringCount]);

  // Preload delle immagini della prossima finestra
  useEffect(() => {
    const preload = (list: (ChampItem | null)[]) => {
      for (const it of list) {
        if (!it) continue;
        const img = new Image();
        img.decoding = "async";
        (img as any).loading = "eager";
        img.src = it.image;
      }
    };
    preload(slotItems); // visibili ora

    if (items.length) {
      const totalCols = Math.ceil(items.length / ringCount);
      const nextOffset = colOffset + 1;
      const tmp: (ChampItem | null)[] = [];
      for (const s of slots) {
        const col = ((nextOffset % totalCols) + totalCols) % totalCols;
        const idx = ((col + s.k) % totalCols) * ringCount + s.r;
        tmp.push(items[idx] ?? null);
      }
      preload(tmp);
    }
  }, [slotItems, colOffset, items, ringCount, slots]);

  const selectedItem = useMemo(() => (selectedId ? items.find((i) => i.id === selectedId) ?? null : null), [selectedId, items]);

  return (
    <div className="pointer-events-none absolute inset-0 flex items-end justify-center">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="pointer-events-auto h-[640px] w-[1100px] max-w-none translate-y-[40%] transform md:h-[760px] md:translate-y-[45%] "
        role="group"
        aria-label="Circular radial selection grid"
      >
        <defs>
          <radialGradient id="wheel-bg" cx="50%" cy="50%" r="65%">
            <stop offset="0%" stopColor="#0d0d0d" />
            <stop offset="100%" stopColor="#171717" />
          </radialGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* clipPath stabili per slot */}
          {slots.map((s) => (
            <clipPath id={s.clipId} key={s.clipId}>
              <circle cx={s.cx} cy={s.cy} r={s.avatarSize / 2} />
            </clipPath>
          ))}
        </defs>

        <circle cx={cx} cy={cy} r={baseInnerRadius + ringCount * (ringThickness + ringGap) + 16} fill="url(#wheel-bg)" opacity={0.95} />

        {/* ring outlines */}
        {Array.from({ length: ringCount }).map((_, r) => {
          const rInner = baseInnerRadius + r * (ringThickness + ringGap);
          const rOuter = rInner + ringThickness;
          return (
            <circle
              key={`ring-outline-${r}`}
              cx={cx}
              cy={cy}
              r={rOuter}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={1}
              style={{ pointerEvents: "none" }}
            />
          );
        })}

        {/* SLOT STABILI: key per slot, non per item */}
        {slots.map((s, i) => {
          const it = slotItems[i];
          const isSelected = it && it.id === selectedId;

          return (
            <g
              key={`slot-${s.r}-${s.k}`}
              role="button"
              tabIndex={0}
              aria-label={it?.label ?? "empty"}
              aria-pressed={!!isSelected}
              onClick={() => it && setSelectedId(it.id)}
              onKeyDown={(e) => {
                if (it && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  setSelectedId(it.id);
                }
              }}
              className="cursor-clicker outline-none"
            >
              {/* immagine nello slot (solo src cambia) */}
              {it && (
                <image
                  href={it.image}
                  x={s.cx - s.avatarSize / 2}
                  y={s.cy - s.avatarSize / 2}
                  width={s.avatarSize}
                  height={s.avatarSize}
                  preserveAspectRatio="xMidYMid meet"
                  clipPath={`url(#${s.clipId})`}
                  style={{ transition: "opacity 120ms linear" }}
                />
              )}

              <circle
                cx={s.cx}
                cy={s.cy}
                r={s.avatarSize / 2 + (isSelected ? 2 : 0)}
                fill="none"
                stroke={isSelected ? "#00d992" : "rgba(255,255,255,0.18)"}
                strokeWidth={isSelected ? 3 : 1.5}
                className={cn("transition-[stroke,stroke-width] duration-150", !isSelected && "hover:jade/20")}
                filter={isSelected ? "url(#glow)" : undefined}
              />
            </g>
          );
        })}
      </svg>

      {/* Controls & confirm */}
      <div className="pointer-events-auto absolute bottom-4 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          <Button
            aria-label="Scroll left"
            size="icon"
            className="h-10 w-10 rounded-full bg-neutral-800/80 hover:bg-neutral-700"
            onClick={() => setColOffset((o) => o - 1)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            aria-label="Scroll right"
            size="icon"
            className="h-10 w-10 rounded-full bg-neutral-800/80 hover:bg-neutral-700"
            onClick={() => setColOffset((o) => o + 1)}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <Button
          disabled={!selectedItem}
          className={cn("min-w-[180px] bg-jade/70 text-liquirice font-scifi hover:bg-jade/90", !selectedItem && "opacity-50")}
          onClick={() => selectedItem && onConfirm(selectedItem)}
        >
          {selectedItem ? `${selectedItem.label}` : "Confirm"}
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SheetChampionPicker (shadcn ui): alternativa semplice
// ─────────────────────────────────────────────────────────────
function SheetChampionPicker({
  open,
  items,
  onClose,
  onConfirm,
}: {
  open: boolean;
  items: ChampItem[];
  onClose: () => void;
  onConfirm: (item: ChampItem) => void;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter((i) => i.label.toLowerCase().includes(term));
  }, [q, items]);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="h-[70vh] bg-neutral-950 text-flash border-t border-flash/10">
        <SheetHeader>
          <SheetTitle className="text-flash">Choose a champion</SheetTitle>
        </SheetHeader>

        <div className="mt-4 flex items-center gap-2">
          <Input
            placeholder="Search champion…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="bg-neutral-900 border-neutral-800"
          />
          <Button variant="secondary" onClick={() => setQ("")}>
            Clear
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-6 gap-3 overflow-y-auto max-h-[52vh] pr-1">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => onConfirm(c)}
              className="group rounded-md border border-neutral-800 hover:border-jade/50 p-2 text-left"
            >
              <img
                src={c.image}
                alt={c.label}
                className="h-12 w-12 rounded-md object-cover"
                loading="lazy"
                decoding="async"
              />
              <div className="mt-2 text-xs text-flash/70 group-hover:text-flash">{c.label}</div>
            </button>
          ))}
          {!filtered.length && (
            <div className="col-span-6 text-center text-sm text-flash/50 py-8">No results</div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
