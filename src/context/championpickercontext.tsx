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
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { BorderBeam } from "@/components/ui/border-beam";

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion"
// ⚠️ se il file è in src/utils/champion-roles.ts cambia questo path
import {
  TOP_CHAMPIONS,
  JNG_CHAMPIONS,
  MID_CHAMPIONS,
  ADC_CHAMPIONS,
  SUP_CHAMPIONS,
} from "@/utils/champion-roles";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
type Role = "TOP" | "JNG" | "MID" | "ADC" | "SUP";

export type ChampItem = {
  id: string;
  label: string;
  image: string;
};

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

  // fetch champions, senza ruoli – li useremo nello sheet
  useEffect(() => {
    fetch(`https://cdn.loldata.cc/${latestPatch}/data/en_US/champion.json`)
      .then((r) => r.json())
      .then((data) => {
        const champs = Object.values<any>(data?.data ?? {});
        const sorted = champs.sort((a, b) => a.id.localeCompare(b.id));

        const list: ChampItem[] = sorted.map((c: any) => {
          const id = String(c.id);
          return {
            id,
            label: id,
            image: `https://cdn.loldata.cc/${latestPatch}/img/champion/${id}.png`,
          };
        });

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
      void colsVis;
      const kGlobal = ((colOffset % totalCols) + totalCols) % totalCols;
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

  const selectedItem = useMemo(
    () => (selectedId ? items.find((i) => i.id === selectedId) ?? null : null),
    [selectedId, items]
  );

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

        <circle
          cx={cx}
          cy={cy}
          r={baseInnerRadius + ringCount * (ringThickness + ringGap) + 16}
          fill="url(#wheel-bg)"
          opacity={0.95}
        />

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
          className={cn(
            "min-w-[180px] bg-jade/70 text-liquirice font-scifi hover:bg-jade/90",
            !selectedItem && "opacity-50"
          )}
          onClick={() => selectedItem && onConfirm(selectedItem)}
        >
          {selectedItem ? `${selectedItem.label}` : "Confirm"}
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SheetChampionPicker (sidebar a 5 sezioni)
// ─────────────────────────────────────────────────────────────

const ROLES: Role[] = ["TOP", "JNG", "MID", "ADC", "SUP"];

const ROLE_SETS: Record<Role, Set<string>> = {
  TOP: new Set(TOP_CHAMPIONS),
  JNG: new Set(JNG_CHAMPIONS),
  MID: new Set(MID_CHAMPIONS),
  ADC: new Set(ADC_CHAMPIONS),
  SUP: new Set(SUP_CHAMPIONS),
};

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
  const [q, setQ] = React.useState("");

  const term = q.trim().toLowerCase();

  const grouped = React.useMemo(() => {
    const base: Record<Role, ChampItem[]> = {
      TOP: [],
      JNG: [],
      MID: [],
      ADC: [],
      SUP: [],
    };

    for (const role of ROLES) {
      const set = ROLE_SETS[role];
      base[role] = items
        .filter((c) => {
          const inRole = set.has(c.id);
          const matchSearch = !term || c.label.toLowerCase().includes(term);
          return inRole && matchSearch;
        })
        .sort((a, b) => a.label.localeCompare(b.label));
    }

    return base;
  }, [items, term]);

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <SheetContent
        side="right"
        className={cn(
          "w-[420px] sm:w-[460px] lg:w-[520px]",
          "h-full flex flex-col p-0",
          "bg-liquirice/95 border-l border-flash/15 text-flash",
          "[&>button]:hidden" // <-- nasconde la X in alto a destra
        )}
      >
        <div className="relative flex-1 flex flex-col px-6 py-5 overflow-hidden">
          <BorderBeam duration={8} size={110} />

          {/* HEADER */}
          {/* HEADER */}
<div className="flex items-center justify-between mb-4">
  <span className="text-[11px] font-jetbrains text-flash/60 tracking-[0.22em] uppercase">
    CHAMPION PICKER
  </span>

  <button
    type="button"
    className="text-[11px] text-flash/50 hover:text-flash/80 cursor-clicker font-jetbrains"
    onClick={() => setQ("")}
  >
    CLEAR
  </button>
</div>


          {/* SEARCH */}
          <div className="flex items-center gap-2 mb-4">
            <Input
              placeholder="Type a champion name…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="bg-black/20 border border-flash/10 hover:border-flash/20 focus:outline-none focus:ring-1 focus:ring-flash/20 rounded text-flash placeholder:text-flash/20 text-sm"
            />
          </div>

          {/* SEZIONI PER RUOLO – ACCORDION */}
          <div className="flex-1 overflow-y-auto pr-1 scrollbar-hide">
            <Accordion
              type="multiple"
              defaultValue={ROLES} // tutte aperte di default
              className="space-y-3"
            >
              {ROLES.map((role) => {
                const champs = grouped[role];
                if (!champs || champs.length === 0) return null;

                const label = role === "ADC" ? "BOTTOM" : role;

                return (
                  <AccordionItem
                    key={role}
                    value={role}
                    className="border border-flash/10 rounded-sm px-2"
                  >
                    <AccordionTrigger className="flex items-center justify-between py-2 hover:no-underline">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-jetbrains text-flash/60 tracking-[0.18em] uppercase">
                          {label}
                        </span>
                      </div>
                      <span className="text-[10px] text-flash/40">
                        {champs.length} champion{champs.length !== 1 ? "s" : ""}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-3 pt-1">
                      <div className="grid grid-cols-6 gap-3">
                        {champs.map((c) => (
                          <button
                            key={`${role}-${c.id}`}
                            type="button"
                            className="flex flex-col items-center gap-1 group cursor-clicker"
                            onClick={() => {
                              onConfirm(c);
                              onClose();
                            }}
                          >
                            <div className="bg-jade/10 rounded-[3px] p-[2px] border border-flash/10 group-hover:border-jade/50 transition-colors">
                              <img
                                src={c.image}
                                alt={c.label}
                                title={c.label}
                                className="w-10 h-10 rounded-[3px] object-cover transition-transform group-hover:scale-110"
                                loading="lazy"
                                decoding="async"
                              />
                            </div>
                            <span className="text-[10px] text-flash/60 truncate max-w-[64px]">
                              {c.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>

            {/* nessun champ in nessun ruolo (es. search senza match) */}
            {ROLES.every((r) => grouped[r].length === 0) && (
              <div className="text-xs text-flash/40 text-center py-10">
                No champion found for this search.
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
