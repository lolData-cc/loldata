"use client"

import type React from "react"
import { useEffect, useMemo, useRef, useState } from "react"

type Champ = {
  id: string
  key: string
  name: string
  spells?: Array<{ id: string; name: string }>
}

type GameMode = "champion" | "icon"

const DATA_URL = "https://cdn.loldata.cc/15.13.1/data/en_US/champion.json"
const IMG_BASE = "https://cdn.loldata.cc/15.13.1/img/champion"
const SPELL_IMG_BASE = "https://cdn.loldata.cc/15.13.1/img/spell"

const START_PIXEL_SIZE = 40
const PIXEL_STEP = 6
const MIN_PIXEL_SIZE = 1
const REVEAL_FADE_MS = 800

function normalizeName(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
}

// ==== DAILY HELPERS =========================================================
const TZ = "Europe/Rome";
const ROLLOVER_HOUR = 2; // 02:00 locali
const DAILY_SEED_BASE = "loldata-dle-v1"; // cambia se vuoi “ruotare” la sequenza

type DailyKey = {
  dateKey: string;  // es: "2025-10-18" riferita al "giorno effettivo" dopo il cutoff 02:00
  modeKey: string;  // "champion" | "icon"
};

// data/ora locale di TZ come numeri, senza dipendenze
function getTzParts(d: Date, timeZone = TZ) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value || 0);
  return {
    y: get("year"),
    m: get("month"),
    d: get("day"),
    hh: get("hour"),
    mm: get("minute"),
    ss: get("second"),
  };
}

// calcola la "data effettiva" del puzzle (prima delle 02:00 è ancora il giorno prima)
function getEffectiveDateKey(now = new Date(), timeZone = TZ, cutoffHour = ROLLOVER_HOUR) {
  const { y, m, d, hh } = getTzParts(now, timeZone);
  // costruiamo una data semplice come (y,m,d) ma “se hh<cutoff, -1 giorno”
  const base = new Date(Date.UTC(y, m - 1, d)); // usiamo UTC per evitare DST shuffle
  if (hh < cutoffHour) base.setUTCDate(base.getUTCDate() - 1);
  const yy = base.getUTCFullYear();
  const mm = String(base.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(base.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

// PRNG deterministico: xmur3 + mulberry32 (piccolo, affidabile)
function xmur3(str: string) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// indice deterministico del giorno
function dailyIndex(len: number, mode: GameMode, dateKey: string) {
  const seedStr = `${DAILY_SEED_BASE}::${mode}::${dateKey}`;
  const seed = xmur3(seedStr)();
  const rng = mulberry32(seed);
  return Math.floor(rng() * len);
}

// chiavi e storage
function makeDailyKey(mode: GameMode, dateKey: string): DailyKey {
  return { dateKey, modeKey: mode };
}
function storageKey(state: "done" | "progress", k: DailyKey) {
  return `loldata_daily_${k.modeKey}_${k.dateKey}_${state}`;
}
function readDailyDone(k: DailyKey) {
  return localStorage.getItem(storageKey("done", k)) === "1";
}

type DailyProgress = {
  status: "playing" | "won" | "revealed";
  attempts: number;
};

function readDailyProgress(k: DailyKey): DailyProgress | null {
  try {
    const raw = localStorage.getItem(storageKey("progress", k));
    return raw ? (JSON.parse(raw) as DailyProgress) : null;
  } catch {
    return null;
  }
}
function writeDailyProgress(k: DailyKey, p: DailyProgress) {
  localStorage.setItem(storageKey("progress", k), JSON.stringify(p));
  if (p.status !== "playing") {
    writeDailyDone(k);
  }
}

function writeDailyDone(k: DailyKey) {
  localStorage.setItem(storageKey("done", k), "1");
}

// timer fino al prossimo reset 02:00
function msUntilNextReset(now = new Date(), timeZone = TZ, cutoffHour = ROLLOVER_HOUR) {
  const { y, m, d, hh, mm, ss } = getTzParts(now, timeZone);
  // target = oggi 02:00 o domani 02:00 se già passate
  const target = new Date(Date.UTC(y, m - 1, d, cutoffHour, 0, 0));
  // se ora >= cutoff, puntiamo a domani cutoff
  if (hh >= cutoffHour || (hh === cutoffHour && (mm > 0 || ss > 0))) {
    target.setUTCDate(target.getUTCDate() + 1);
  }
  return target.getTime() - Date.UTC(y, m - 1, d, hh, mm, ss);
}
// ==== END DAILY HELPERS =====================================================



export default function PlaygroundPage() {
  const [gameMode, setGameMode] = useState<GameMode>("champion")
  const [champs, setChamps] = useState<Champ[]>([])

  // Load champions data
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(DATA_URL, {
          mode: "cors",
          headers: { accept: "application/json" },
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()

        const list: Champ[] = Object.values<any>(data.data)
          .map((c) => ({
            id: c.id,
            key: c.key,
            name: c.name,
            spells: c.spells?.map((s: any) => ({ id: s.id, name: s.name })) || [],
          }))
          .sort((a, b) => a.id.localeCompare(b.id)); // <— stabilizza

        setChamps(list)
      } catch (e: any) {
        console.error("Failed to load champions:", e)
      }
    }
    load()
  }, [])

  return (
    <div
      className="min-h-screen relative overflow-hidden flex"
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,217,146,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,217,146,0.03) 1px, transparent 1px)",
          backgroundSize: "50px 50px",
          maskImage: "radial-gradient(ellipse 80% 50% at 50% 50%, black, transparent)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 50% at 50% 50%, black, transparent)",
        }}
      />

      <div className="relative z-10 w-64 p-6 flex flex-col gap-4">
        <div className="mb-2">
          <h2
            className="text-sm font-bold tracking-widest uppercase mb-1"
            style={{
              color: "#00d992",
              textShadow: "0 0 5px #00d992cc",
            }}
          >
            GAME MODE
          </h2>
          <div className="h-px" style={{ background: "linear-gradient(90deg, #00d99280, transparent)" }} />
        </div>

        <div className="relative flex flex-col gap-3">
          {/* Sliding indicator */}
          <div
            className="absolute left-0 w-full h-14 transition-all duration-500 ease-out pointer-events-none"
            style={{
              top: gameMode === "champion" ? "0px" : "68px",
              background: "linear-gradient(90deg, rgba(0, 217, 146, 0.15), rgba(0, 217, 146, 0.05))",
              border: "1px solid #00d992",
              boxShadow: "0 0 15px #00d99250, inset 0 0 15px #00d99220",
            }}
          />

          <button
            onClick={() => setGameMode("champion")}
            className="relative px-5 py-4 font-mono text-sm uppercase tracking-wider text-left transition-all duration-300 group h-14"
            style={{
              backgroundColor: gameMode === "champion" ? "transparent" : "rgba(10, 20, 25, 0.3)",
              border: gameMode === "champion" ? "1px solid transparent" : "1px solid #00d99220",
              color: gameMode === "champion" ? "#00d992" : "#6b8a99",
            }}
            onMouseEnter={(e) => {
              if (gameMode !== "champion") {
                e.currentTarget.style.backgroundColor = "rgba(0, 217, 146, 0.08)"
                e.currentTarget.style.borderColor = "#00d99240"
              }
            }}
            onMouseLeave={(e) => {
              if (gameMode !== "champion") {
                e.currentTarget.style.backgroundColor = "rgba(10, 20, 25, 0.3)"
                e.currentTarget.style.borderColor = "#00d99220"
              }
            }}
          >
            <div className="flex items-center gap-3">
              <span
                className={`w-2 h-2 rounded-full transition-all duration-300 ${gameMode === "champion" ? "animate-pulse" : ""}`}
                style={{
                  backgroundColor: gameMode === "champion" ? "#00d992" : "#148460",
                  boxShadow: gameMode === "champion" ? "0 0 8px #00d992" : "none",
                }}
              />
              <span className="font-semibold">Champion</span>
            </div>
            {gameMode === "champion" && (
              <div
                className="absolute left-0 top-0 bottom-0 w-1 transition-all duration-300"
                style={{
                  backgroundColor: "#00d992",
                  boxShadow: "0 0 10px #00d992",
                }}
              />
            )}
          </button>

          <button
            onClick={() => setGameMode("icon")}
            className="relative px-5 py-4 font-mono text-sm uppercase tracking-wider text-left transition-all duration-300 group h-14"
            style={{
              backgroundColor: gameMode === "icon" ? "transparent" : "rgba(10, 20, 25, 0.3)",
              border: gameMode === "icon" ? "1px solid transparent" : "1px solid #00d99220",
              color: gameMode === "icon" ? "#00d992" : "#6b8a99",
            }}
            onMouseEnter={(e) => {
              if (gameMode !== "icon") {
                e.currentTarget.style.backgroundColor = "rgba(0, 217, 146, 0.08)"
                e.currentTarget.style.borderColor = "#00d99240"
              }
            }}
            onMouseLeave={(e) => {
              if (gameMode !== "icon") {
                e.currentTarget.style.backgroundColor = "rgba(10, 20, 25, 0.3)"
                e.currentTarget.style.borderColor = "#00d99220"
              }
            }}
          >
            <div className="flex items-center gap-3">
              <span
                className={`w-2 h-2 rounded-full transition-all duration-300 ${gameMode === "icon" ? "animate-pulse" : ""}`}
                style={{
                  backgroundColor: gameMode === "icon" ? "#00d992" : "#148460",
                  boxShadow: gameMode === "icon" ? "0 0 8px #00d992" : "none",
                }}
              />
              <span className="font-semibold">Ability Icon</span>
            </div>
            {gameMode === "icon" && (
              <div
                className="absolute left-0 top-0 bottom-0 w-1 transition-all duration-300"
                style={{
                  backgroundColor: "#00d992",
                  boxShadow: "0 0 10px #00d992",
                }}
              />
            )}
          </button>
        </div>

        <div className="mt-auto pt-6">
          <div className="text-[10px] font-mono tracking-wider" style={{ color: "#6b8a99" }}>
            LOLDATADLE_v2.077
          </div>
        </div>
      </div>

      <div className="flex-1 pl-4 pr-8 py-8 relative z-10">
        {gameMode === "champion" && <ChampionGame champs={champs} />}
        {gameMode === "icon" && <IconGame champs={champs} />}
      </div>
    </div>
  )
}

function ChampionGame({ champs }: { champs: Champ[] }) {
  const [answer, setAnswer] = useState<Champ | null>(null)
  const [guess, setGuess] = useState("")
  const [attempts, setAttempts] = useState(0)
  const [status, setStatus] = useState<"idle" | "playing" | "won" | "revealed">("idle")
  const [err, setErr] = useState<string | null>(null)
  const [pixelSize, setPixelSize] = useState(START_PIXEL_SIZE)

  const pixelCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const crispCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const [imgReady, setImgReady] = useState(false)
  const imgObjRef = useRef<HTMLImageElement | null>(null)

  const [crispMounted, setCrispMounted] = useState(false)
  const [crispVisible, setCrispVisible] = useState(false)
  const [isRevealing, setIsRevealing] = useState(false)

  const animationFrameRef = useRef<number | null>(null)
  const morphStartTimeRef = useRef<number | null>(null)
  const morphStartPixelRef = useRef<number>(START_PIXEL_SIZE)

  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!imgReady) return;
    if (status !== "playing") return;
    drawPixelOnCanvas();
  }, [pixelSize, imgReady, status]);

  // 2) GESTISCE LA RIVELAZIONE/MORPH (sostituisce il tuo effetto [imgReady, status, isRevealing])
  useEffect(() => {
    if (!imgReady) return;

    if (status === "playing") {
      // qui non serve ridisegnare: ci pensa l'effetto sopra quando cambia pixelSize
      return;
    }

    if (isRevealing) {
      // transizione in-session: morph dal pixelato al crisp
      drawCrispOnCanvas(crispCanvasRef.current);
      setCrispMounted(true);
      setCrispVisible(false);
      startMorphAnimation();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setCrispVisible(true));
      });
    } else {
      // pagina ricaricata con daily già chiuso: mostra subito il crisp
      setPixelSize(MIN_PIXEL_SIZE);
      drawCrispOnCanvas(crispCanvasRef.current);
      setCrispMounted(true);
      setCrispVisible(true);
    }
  }, [imgReady, status, isRevealing]);

  useEffect(() => {
    if (champs.length === 0) return;

    const dateKey = getEffectiveDateKey();
    const k = makeDailyKey("champion", dateKey);

    const idx = dailyIndex(champs.length, "champion", dateKey);
    const today = champs[idx];

    setAnswer(today);

    // ripristina progress se esiste
    const prog = readDailyProgress(k);
    if (prog) {
      setAttempts(prog.attempts);
      setStatus(prog.status);
      // ricostruisci pixelSize in base ai tentativi, oppure full reveal se chiuso
      const px = prog.status === "playing"
        ? Math.max(MIN_PIXEL_SIZE, START_PIXEL_SIZE - prog.attempts * PIXEL_STEP)
        : MIN_PIXEL_SIZE;
      setPixelSize(px);
    } else {
      setAttempts(0);
      setStatus("playing");
      setPixelSize(START_PIXEL_SIZE);
    }
    setGuess("");
    setImgReady(false);
    setCrispMounted(false);
    setCrispVisible(false);
    setIsRevealing(false);
    setErr(null);

    // reset alle 02:00 Europe/Rome
    const t = setTimeout(() => {
      setAnswer(null);
      setStatus("idle");
      // ricalcola subito il daily nuovo
      const dk = getEffectiveDateKey();
      const k2 = makeDailyKey("champion", dk);
      const idx2 = dailyIndex(champs.length, "champion", dk);
      setAnswer(champs[idx2]);
      setStatus(readDailyDone(k2) ? "revealed" : "playing");
    }, msUntilNextReset());

    return () => clearTimeout(t);
  }, [champs]);

  const nameIndex = useMemo(() => {
    const map = new Map<string, Champ>()
    for (const c of champs) {
      map.set(normalizeName(c.id), c)
      map.set(normalizeName(c.name), c)
    }
    const wukong = champs.find((c) => c.name === "Wukong" || c.id === "MonkeyKing")
    if (wukong) map.set(normalizeName("wukong"), wukong)
    return map
  }, [champs])

  useEffect(() => {
    if (!answer) return
    setImgReady(false)

    const img = new Image()
    img.crossOrigin = "anonymous"
    img.decoding = "async"
    img.loading = "eager"
    img.src = `${IMG_BASE}/${answer.id}.png`

    img.onload = () => {
      imgObjRef.current = img
      requestAnimationFrame(() => {
        setImgReady(true)
        drawPixelOnCanvas()
      })
    }
    img.onerror = () => setErr("Image unavailable")

    return () => {
      img.onload = null
      img.onerror = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answer])

  const startMorphAnimation = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    morphStartTimeRef.current = performance.now()
    morphStartPixelRef.current = pixelSize

    const animate = (currentTime: number) => {
      if (!morphStartTimeRef.current) return

      const elapsed = currentTime - morphStartTimeRef.current
      const progress = Math.min(elapsed / REVEAL_FADE_MS, 1)
      const easeOutCubic = 1 - Math.pow(1 - progress, 3)

      const newPixelSize = Math.max(
        MIN_PIXEL_SIZE,
        morphStartPixelRef.current - (morphStartPixelRef.current - MIN_PIXEL_SIZE) * easeOutCubic,
      )

      setPixelSize(newPixelSize)

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate)
      } else {
        setPixelSize(MIN_PIXEL_SIZE)
        setIsRevealing(false)
        animationFrameRef.current = null
      }
    }

    animationFrameRef.current = requestAnimationFrame(animate)
  }

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!imgReady) return;

    if (status === "playing") {
      // normale: resta pixelato
      drawPixelOnCanvas();
      return;
    }

    if (isRevealing) {
      // transizione in-session: fai il morph
      drawCrispOnCanvas(crispCanvasRef.current);
      setCrispMounted(true);
      setCrispVisible(false);

      // parti dal pixelSize corrente e anima verso MIN_PIXEL_SIZE
      startMorphAnimation();

      // fade del layer crisp sopra
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setCrispVisible(true));
      });
    } else {
      // reload con daily già chiuso: niente morph
      setPixelSize(MIN_PIXEL_SIZE);
      drawCrispOnCanvas(crispCanvasRef.current);
      setCrispMounted(true);
      setCrispVisible(true);
    }
  }, [imgReady, status, isRevealing]); // eslint-disable-line react-hooks/exhaustive-deps

  function setupCanvas(canvas: HTMLCanvasElement | null) {
    if (!canvas)
      return { canvas: null as HTMLCanvasElement | null, ctx: null as CanvasRenderingContext2D | null, dpr: 1 }
    const cssW = 176
    const cssH = 176
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
    canvas.width = Math.round(cssW * dpr)
    canvas.height = Math.round(cssH * dpr)
    canvas.style.width = `${cssW}px`
    canvas.style.height = `${cssH}px`
    const ctx = canvas.getContext("2d")
    return { canvas, ctx, dpr }
  }

  function drawCrispOnCanvas(canvas: HTMLCanvasElement | null) {
    const img = imgObjRef.current
    const { ctx, canvas: c } = setupCanvas(canvas)
    if (!img || !ctx || !c) return

    const minSide = Math.min(img.naturalWidth, img.naturalHeight)
    const sx = Math.floor((img.naturalWidth - minSide) / 2)
    const sy = Math.floor((img.naturalHeight - minSide) / 2)

    ctx.clearRect(0, 0, c.width, c.height)
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, c.width, c.height)
  }

  function drawPixelOnCanvas() {
    const img = imgObjRef.current
    const { ctx, canvas } = setupCanvas(pixelCanvasRef.current)
    if (!img || !ctx || !canvas) return

    const minSide = Math.min(img.naturalWidth, img.naturalHeight)
    const sx = Math.floor((img.naturalWidth - minSide) / 2)
    const sy = Math.floor((img.naturalHeight - minSide) / 2)

    const block = Math.max(MIN_PIXEL_SIZE, pixelSize)
    const lowW = Math.max(1, Math.floor(canvas.width / block))
    const lowH = Math.max(1, Math.floor(canvas.height / block))

    const off = document.createElement("canvas")
    off.width = lowW
    off.height = lowH
    const offCtx = off.getContext("2d")
    if (!offCtx) return

    offCtx.imageSmoothingEnabled = false
    ctx.imageSmoothingEnabled = false

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    offCtx.drawImage(img, sx, sy, minSide, minSide, 0, 0, lowW, lowH)
    ctx.drawImage(off, 0, 0, lowW, lowH, 0, 0, canvas.width, canvas.height)
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer || status !== "playing") return;

    // se non è un nome valido di champ, ignora l'invio
    if (!isValidGuess) {
      return;
    }

    const user = normalizeName(guess);
    const isCorrect =
      user.length > 0 &&
      (user === normalizeName(answer.id) ||
        user === normalizeName(answer.name) ||
        nameIndex.get(user)?.id === answer.id);

    if (isCorrect) {
      const total = attempts + 1;
      setAttempts(total);
      setStatus("won");
      const dk = getEffectiveDateKey();
      writeDailyProgress(makeDailyKey("champion", dk), { status: "won", attempts: total });
    } else {
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      setPixelSize((p) => Math.max(MIN_PIXEL_SIZE, p - PIXEL_STEP));
      const dk = getEffectiveDateKey();
      writeDailyProgress(makeDailyKey("champion", dk), { status: "playing", attempts: nextAttempts });
    }
    setGuess("");
    inputRef.current?.focus();
  };

  const giveUp = () => {
    if (!answer) return;
    setStatus("revealed");
    setIsRevealing(true); // <— anche qui se vuoi il morph su abort

    const dk = getEffectiveDateKey();
    writeDailyProgress(makeDailyKey("champion", dk), { status: "revealed", attempts });
  };

  const toKey = (s: string) => normalizeName(s);

  // è valido se mappa a un champ esistente
  const isValidGuess = useMemo(() => {
    const k = toKey(guess);
    if (!k) return false;
    const found = nameIndex.get(k);
    return Boolean(found);
  }, [guess, nameIndex]);

  // suggerimenti: inizia per quello che digiti (da 1 lettera)
  const [hoverIdx, setHoverIdx] = useState(-1);
  const suggestions = useMemo(() => {
    const q = toKey(guess);
    if (q.length < 1) return [];
    // prendi lista unica per id, ordinata
    const uniq: Record<string, Champ> = {};
    for (const c of champs) {
      const keyName = toKey(c.name);
      const keyId = toKey(c.id);
      if (keyName.startsWith(q) || keyId.startsWith(q)) {
        uniq[c.id] = c;
      }
    }
    return Object.values(uniq).sort((a, b) => a.name.localeCompare(b.name)).slice(0, 10);
  }, [guess, champs]);

  function pickSuggestion(c: Champ) {
    setGuess(c.name);
    setHoverIdx(-1);
    // invia direttamente se stai giocando
    if (status === "playing") {
      // fingi un submit valido
      const user = toKey(c.name);
      const answerKey = answer ? toKey(answer.id) : "";
      const isCorrect =
        user.length > 0 &&
        (user === toKey(answer!.id) ||
          user === toKey(answer!.name) ||
          nameIndex.get(user)?.id === answer!.id);

      if (isCorrect) {
        const total = attempts + 1;
        setAttempts(total);
        setStatus("won");
        const dk = getEffectiveDateKey();
        writeDailyProgress(makeDailyKey("champion", dk), { status: "won", attempts: total });
      } else {
        const nextAttempts = attempts + 1;
        setAttempts(nextAttempts);
        setPixelSize((p) => Math.max(MIN_PIXEL_SIZE, p - PIXEL_STEP));
        const dk = getEffectiveDateKey();
        writeDailyProgress(makeDailyKey("champion", dk), { status: "playing", attempts: nextAttempts });
      }
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHoverIdx((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHoverIdx((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      // se c'è un suggerimento attivo, prendilo
      if (hoverIdx >= 0 && hoverIdx < suggestions.length) {
        e.preventDefault();
        pickSuggestion(suggestions[hoverIdx]);
      } else if (!isValidGuess) {
        // blocca invio se non è un campione valido (no errore)
        e.preventDefault();
      }
      // altrimenti lascio passare: è valido ed è submit normale
    } else if (e.key === "Escape") {
      setHoverIdx(-1);
    }
  }


  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1
            className="text-3xl font-bold tracking-wider uppercase mb-1"
            style={{
              color: "#00d992",
              textShadow: "0 0 5px #00d992cc, 0 0 10px #00d99280, 0 0 20px #00d99250",
            }}
          >
            CHAMPION SCAN
          </h1>
          <p className="text-xs text-[#6b8a99] font-mono tracking-widest">IDENTIFICATION PROTOCOL</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-[#6b8a99] tracking-wider">ATTEMPTS:</span>
            <span
              className="font-bold text-lg tabular-nums"
              style={{
                color: "oklch(0.78 0.22 35)",
                textShadow: "0 0 5px oklch(0.78 0.22 35 / 0.8), 0 0 10px oklch(0.78 0.22 35 / 0.5)",
              }}
            >
              {attempts.toString().padStart(2, "0")}
            </span>
          </div>
        </div>
      </div>

      <div
        className="relative p-6 backdrop-blur-xl"
        style={{
          backgroundColor: "rgba(10, 20, 25, 0.5)",
          border: "2px solid #00d99250",
          boxShadow: "0 0 5px #00d99280, 0 0 10px #00d99250, 0 0 20px #00d99230, inset 0 0 10px #00d99220",
        }}
      >
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2" style={{ borderColor: "#00d992" }} />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2" style={{ borderColor: "#00d992" }} />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2" style={{ borderColor: "#00d992" }} />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2" style={{ borderColor: "#00d992" }} />

        {err && (
          <div
            className="mb-4 p-3 font-mono text-xs"
            style={{
              border: "1px solid oklch(0.65 0.25 25 / 0.5)",
              backgroundColor: "oklch(0.65 0.25 25 / 0.1)",
              color: "oklch(0.65 0.25 25)",
            }}
          >
            <span style={{ color: "oklch(0.78 0.22 35)" }}>[ERROR]</span> {err}
          </div>
        )}

        {!err && (
          <>
            <div className="mb-6 flex justify-center">
              <div className="relative">
                <div
                  className="absolute -inset-2 blur-xl"
                  style={{
                    background: "linear-gradient(135deg, #00d99233 0%, #14846033 50%, oklch(0.78 0.22 35 / 0.2) 100%)",
                  }}
                />

                <div
                  className="relative h-44 w-44 overflow-hidden"
                  style={{
                    backgroundColor: "rgba(10, 20, 25, 0.8)",
                    border: "2px solid #00d992",
                    boxShadow: "0 0 5px #00d99280, 0 0 10px #00d99250, 0 0 20px #00d99230, inset 0 0 10px #00d99220",
                  }}
                >
                  <div
                    className="absolute inset-0 pointer-events-none z-10"
                    style={{
                      background:
                        "repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.15), rgba(0, 0, 0, 0.15) 1px, transparent 1px, transparent 2px)",
                    }}
                  />

                  <canvas
                    ref={pixelCanvasRef}
                    className="h-full w-full relative z-10"
                    aria-label="Who's that champion?"
                  />
                  <canvas
                    ref={crispCanvasRef}
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover z-20"
                    style={{
                      opacity: crispMounted ? (crispVisible ? 1 : 0) : 0,
                      transition: `opacity ${REVEAL_FADE_MS}ms ease-out`,
                      willChange: "opacity",
                    }}
                  />

                  <div
                    className="absolute top-0 left-0 px-2 py-1 text-[10px] font-mono z-30 flex items-center gap-1"
                    style={{
                      backgroundColor: "rgba(0, 0, 0, 0.8)",
                      borderRight: "1px solid #00d99280",
                      borderBottom: "1px solid #00d99280",
                    }}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${status === "playing" ? "animate-pulse" : ""}`}
                      style={{
                        backgroundColor:
                          status === "playing" ? "#00d992" : status === "won" ? "#10b981" : "oklch(0.78 0.22 35)",
                      }}
                    />
                    <span className="tracking-wider" style={{ color: "#00d992" }}>
                      {status === "playing" ? "SCANNING" : status === "won" ? "MATCH" : "REVEALED"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={onSubmit} className="flex gap-2 mb-4">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  onKeyDown={onKeyDown}
                  placeholder="ENTER CHAMPION NAME..."
                  className="w-full px-4 py-2.5 font-mono text-sm uppercase tracking-wide outline-none transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-clicker"
                  style={{
                    backgroundColor: "#0f1d24",
                    border: "1px solid #00d99250",
                    color: "oklch(0.98 0.01 180)",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#00d992"
                    e.target.style.boxShadow = "0 0 0 1px #00d99280"
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#00d99250"
                    e.target.style.boxShadow = "none"
                  }}
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  disabled={!answer || status !== "playing"}
                  autoFocus
                />
                {suggestions.length > 0 && status === "playing" && (
                  <div
                    className="absolute left-0 right-0 mt-1 max-h-56 overflow-auto border font-mono text-sm z-50"
                    style={{
                      backgroundColor: "#0f1d24",
                      borderColor: "#00d99250",
                      boxShadow: "0 10px 20px rgba(0,0,0,0.3)",
                    }}
                  >
                    {suggestions.map((c, i) => (
                      <button
                        key={c.id}
                        type="button"
                        onMouseEnter={() => setHoverIdx(i)}
                        onMouseLeave={() => setHoverIdx(-1)}
                        onClick={() => pickSuggestion(c)}
                        className="w-full text-left px-3 py-2 transition-colors"
                        style={{
                          backgroundColor: i === hoverIdx ? "rgba(0,217,146,0.15)" : "transparent",
                          color: i === hoverIdx ? "#00d992" : "oklch(0.98 0.01 180)",
                          borderBottom: "1px solid #00d99220",
                        }}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
                <div
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-mono"
                  style={{ color: "#00d99250" }}
                >
                  {">>"}
                </div>
              </div>
              <button
                type="submit"
                className="px-6 py-2.5 font-mono text-sm uppercase tracking-wider font-bold transition-all disabled:opacity-30 disabled:cursor-pointer cursor-clicker"
                style={{
                  backgroundColor: "#00d992",
                  border: "1px solid #00d992",
                  color: "#040a0c",
                  boxShadow: "0 0 5px #00d99280, 0 0 10px #00d99250, 0 0 20px #00d99230, inset 0 0 10px #00d99220",
                }}
                 disabled={!answer || status !== "playing" || guess.trim().length === 0}
              >
                SCAN
              </button>
              <button
                type="button"
                onClick={giveUp}
                className="px-4 py-2.5 font-mono text-sm uppercase tracking-wider transition-all disabled:opacity-30 disabled:cursor-pointer cursor-clicker"
                style={{
                  backgroundColor: "#0a1419",
                  border: "1px solid oklch(0.78 0.22 35 / 0.5)",
                  color: "oklch(0.78 0.22 35)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "oklch(0.78 0.22 35 / 0.1)"
                  e.currentTarget.style.borderColor = "oklch(0.78 0.22 35)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#0a1419"
                  e.currentTarget.style.borderColor = "oklch(0.78 0.22 35 / 0.5)"
                }}
                disabled={!answer || status !== "playing"}
              >
                ABORT
              </button>
            </form>

            <div className="min-h-[60px]">
              {status === "won" && answer && (
                <div
                  className="p-3 backdrop-blur-sm"
                  style={{
                    border: "1px solid #10b98180",
                    backgroundColor: "#10b98120",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-xl" style={{ color: "#10b981" }}>
                      ✓
                    </div>
                    <div className="flex-1">
                      <div className="font-mono text-xs tracking-wider mb-1" style={{ color: "#10b981" }}>
                        [MATCH CONFIRMED]
                      </div>
                      <div className="font-mono" style={{ color: "oklch(0.98 0.01 180)" }}>
                        Target identified as{" "}
                        <span
                          className="font-bold"
                          style={{
                            color: "#00d992",
                            textShadow: "0 0 5px #00d992cc, 0 0 10px #00d99280",
                          }}
                        >
                          {answer.name}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {status === "revealed" && answer && (
                <div
                  className="p-3 backdrop-blur-sm"
                  style={{
                    border: "1px solid oklch(0.78 0.22 35 / 0.5)",
                    backgroundColor: "oklch(0.78 0.22 35 / 0.1)",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-xl" style={{ color: "oklch(0.78 0.22 35)" }}>
                      !
                    </div>
                    <div className="flex-1">
                      <div className="font-mono text-xs tracking-wider mb-1" style={{ color: "oklch(0.78 0.22 35)" }}>
                        [SCAN ABORTED]
                      </div>
                      <div className="font-mono text-sm" style={{ color: "oklch(0.98 0.01 180)" }}>
                        Target was{" "}
                        <span
                          className="font-bold"
                          style={{
                            color: "oklch(0.78 0.22 35)",
                            textShadow: "0 0 5px oklch(0.78 0.22 35 / 0.8), 0 0 10px oklch(0.78 0.22 35 / 0.5)",
                          }}
                        >
                          {answer.name}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {status === "playing" && attempts > 0 && (
                <div
                  className="p-3 backdrop-blur-sm"
                  style={{
                    border: "1px solid #14846080",
                    backgroundColor: "#14846020",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-xl" style={{ color: "#148460" }}>
                      ×
                    </div>
                    <div className="flex-1">
                      <div className="font-mono text-xs tracking-wider mb-1" style={{ color: "#148460" }}>
                        [NO MATCH]
                      </div>
                      <div className="font-mono text-sm" style={{ color: "oklch(0.98 0.01 180)" }}>
                        Enhancing image resolution... Try again.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function IconGame({ champs }: { champs: Champ[] }) {
  type IconAnswer = { champion: Champ; spell: { id: string; name: string } }

  const [answer, setAnswer] = useState<IconAnswer | null>(null)
  const [guess, setGuess] = useState("")
  const [attempts, setAttempts] = useState(0)
  const [status, setStatus] = useState<"idle" | "playing" | "won" | "revealed">("idle")
  const [err, setErr] = useState<string | null>(null)
  const [pixelSize, setPixelSize] = useState(START_PIXEL_SIZE)

  const pixelCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const crispCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const [imgReady, setImgReady] = useState(false)
  const imgObjRef = useRef<HTMLImageElement | null>(null)

  const [crispMounted, setCrispMounted] = useState(false)
  const [crispVisible, setCrispVisible] = useState(false)
  const [isRevealing, setIsRevealing] = useState(false)

  const animationFrameRef = useRef<number | null>(null)
  const morphStartTimeRef = useRef<number | null>(null)
  const morphStartPixelRef = useRef<number>(START_PIXEL_SIZE)

  const inputRef = useRef<HTMLInputElement | null>(null)

  // DAILY init
  useEffect(() => {
    if (champs.length === 0) return;

    const pool = champs.filter(c => c.spells && c.spells.length > 0);
    if (pool.length === 0) return;

    const dateKey = getEffectiveDateKey();
    const k = makeDailyKey("icon", dateKey);

    const champIdx = dailyIndex(pool.length, "icon", `${dateKey}::champ`);
    const champion = pool[champIdx];

    const spellIdx = dailyIndex(champion.spells!.length, "icon", `${dateKey}::spell::${champion.id}`);
    const spell = champion.spells![spellIdx];

    setAnswer({ champion, spell });
    setAttempts(0);
    setStatus(readDailyDone(k) ? "revealed" : "playing");
    setGuess("");
    setPixelSize(START_PIXEL_SIZE);
    setImgReady(false);
    setCrispMounted(false);
    setCrispVisible(false);
    setIsRevealing(false);
    setErr(null);

    const t = setTimeout(() => {
      setAnswer(null);
      setStatus("idle");
      const dk = getEffectiveDateKey();
      const k2 = makeDailyKey("icon", dk);
      const pool2 = champs.filter(c => c.spells && c.spells.length > 0);
      if (pool2.length === 0) return;
      const cIdx2 = dailyIndex(pool2.length, "icon", `${dk}::champ`);
      const champ2 = pool2[cIdx2];
      const sIdx2 = dailyIndex(champ2.spells!.length, "icon", `${dk}::spell::${champ2.id}`);
      setAnswer({ champion: champ2, spell: champ2.spells![sIdx2] });
      setStatus(readDailyDone(k2) ? "revealed" : "playing");
    }, msUntilNextReset());

    return () => clearTimeout(t);
  }, [champs]);

  // Mark done (ICON)
  useEffect(() => {
    if (!answer) return;
    if (status === "won" || status === "revealed") {
      const dk = getEffectiveDateKey();
      writeDailyDone(makeDailyKey("icon", dk));
    }
  }, [status, answer]);

  // ...resto invariato...


  // Nel JSX: disattiva sempre il bottone reroll
  // <button disabled ...> {">"} REROLL </button>
  // cambia: disabled={true}

  const nameIndex = useMemo(() => {
    const map = new Map<string, Champ>()
    for (const c of champs) {
      map.set(normalizeName(c.id), c)
      map.set(normalizeName(c.name), c)
    }
    const wukong = champs.find((c) => c.name === "Wukong" || c.id === "MonkeyKing")
    if (wukong) map.set(normalizeName("wukong"), wukong)
    return map
  }, [champs])

  useEffect(() => {
    if (!answer) return
    setImgReady(false)

    const img = new Image()
    img.crossOrigin = "anonymous"
    img.decoding = "async"
    img.loading = "eager"
    img.src = `${SPELL_IMG_BASE}/${answer.spell.id}.png`

    img.onload = () => {
      imgObjRef.current = img
      requestAnimationFrame(() => {
        setImgReady(true)
        drawPixelOnCanvas()
      })
    }
    img.onerror = () => setErr("Icon unavailable")

    return () => {
      img.onload = null
      img.onerror = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answer])

  const startMorphAnimation = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    morphStartTimeRef.current = performance.now()
    morphStartPixelRef.current = pixelSize

    const animate = (currentTime: number) => {
      if (!morphStartTimeRef.current) return

      const elapsed = currentTime - morphStartTimeRef.current
      const progress = Math.min(elapsed / REVEAL_FADE_MS, 1)
      const easeOutCubic = 1 - Math.pow(1 - progress, 3)

      const newPixelSize = Math.max(
        MIN_PIXEL_SIZE,
        morphStartPixelRef.current - (morphStartPixelRef.current - MIN_PIXEL_SIZE) * easeOutCubic,
      )

      setPixelSize(newPixelSize)

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate)
      } else {
        setPixelSize(MIN_PIXEL_SIZE)
        setIsRevealing(false)
        animationFrameRef.current = null
      }
    }

    animationFrameRef.current = requestAnimationFrame(animate)
  }

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!imgReady) return
    drawPixelOnCanvas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pixelSize, imgReady])

  useEffect(() => {
    if (!imgReady) return
    if (status === "won" || status === "revealed") {
      drawCrispOnCanvas(crispCanvasRef.current)
      setIsRevealing(true)
      setCrispMounted(true)
      setCrispVisible(false)

      startMorphAnimation()

      requestAnimationFrame(() => {
        requestAnimationFrame(() => setCrispVisible(true))
      })
    }
  }, [status, imgReady]) // eslint-disable-line react-hooks/exhaustive-deps

  function setupCanvas(canvas: HTMLCanvasElement | null) {
    if (!canvas)
      return { canvas: null as HTMLCanvasElement | null, ctx: null as CanvasRenderingContext2D | null, dpr: 1 }
    const cssW = 176
    const cssH = 176
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
    canvas.width = Math.round(cssW * dpr)
    canvas.height = Math.round(cssH * dpr)
    canvas.style.width = `${cssW}px`
    canvas.style.height = `${cssH}px`
    const ctx = canvas.getContext("2d")
    return { canvas, ctx, dpr }
  }

  function drawCrispOnCanvas(canvas: HTMLCanvasElement | null) {
    const img = imgObjRef.current
    const { ctx, canvas: c } = setupCanvas(canvas)
    if (!img || !ctx || !c) return

    ctx.clearRect(0, 0, c.width, c.height)
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, 0, 0, c.width, c.height)
  }

  function drawPixelOnCanvas() {
    const img = imgObjRef.current
    const { ctx, canvas } = setupCanvas(pixelCanvasRef.current)
    if (!img || !ctx || !canvas) return

    const block = Math.max(MIN_PIXEL_SIZE, pixelSize)
    const lowW = Math.max(1, Math.floor(canvas.width / block))
    const lowH = Math.max(1, Math.floor(canvas.height / block))

    const off = document.createElement("canvas")
    off.width = lowW
    off.height = lowH
    const offCtx = off.getContext("2d")
    if (!offCtx) return

    offCtx.imageSmoothingEnabled = false
    ctx.imageSmoothingEnabled = false

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    offCtx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, 0, 0, lowW, lowH)
    ctx.drawImage(off, 0, 0, lowW, lowH, 0, 0, canvas.width, canvas.height)
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!answer || status !== "playing") return

    const user = normalizeName(guess)
    const isCorrect =
      user.length > 0 &&
      (user === normalizeName(answer.champion.id) ||
        user === normalizeName(answer.champion.name) ||
        nameIndex.get(user)?.id === answer.champion.id)

    if (isCorrect) {
      setStatus("won")
    } else {
      setAttempts((a) => a + 1)
      setPixelSize((p) => Math.max(MIN_PIXEL_SIZE, p - PIXEL_STEP))
    }
    setGuess("")
    inputRef.current?.focus()
  }

  const giveUp = () => {
    if (!answer) return
    setStatus("revealed")
  }

  const reroll = () => {
    if (!champs.length) return

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    const champsWithSpells = champs.filter((c) => c.spells && c.spells.length > 0)
    if (champsWithSpells.length === 0) return

    const randChamp = champsWithSpells[Math.floor(Math.random() * champsWithSpells.length)]
    const randSpell = randChamp.spells![Math.floor(Math.random() * randChamp.spells!.length)]

    setAnswer({ champion: randChamp, spell: randSpell })
    setAttempts(0)
    setStatus("playing")
    setGuess("")
    setPixelSize(START_PIXEL_SIZE)
    setImgReady(false)

    setCrispMounted(false)
    setCrispVisible(false)
    setIsRevealing(false)

    const c = crispCanvasRef.current
    if (c) {
      const ctx = c.getContext("2d")
      if (ctx) ctx.clearRect(0, 0, c.width, c.height)
    }

    inputRef.current?.focus()
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1
            className="text-3xl font-bold tracking-wider uppercase mb-1"
            style={{
              color: "#00d992",
              textShadow: "0 0 5px #00d992cc, 0 0 10px #00d99280, 0 0 20px #00d99250",
            }}
          >
            ABILITY SCAN
          </h1>
          <p className="text-xs text-[#6b8a99] font-mono tracking-widest">ICON RECOGNITION PROTOCOL</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-[#6b8a99] tracking-wider">ATTEMPTS:</span>
            <span
              className="font-bold text-lg tabular-nums"
              style={{
                color: "oklch(0.78 0.22 35)",
                textShadow: "0 0 5px oklch(0.78 0.22 35 / 0.8), 0 0 10px oklch(0.78 0.22 35 / 0.5)",
              }}
            >
              {attempts.toString().padStart(2, "0")}
            </span>
          </div>
        </div>
      </div>

      <div
        className="relative p-6 backdrop-blur-xl"
        style={{
          backgroundColor: "rgba(10, 20, 25, 0.5)",
          border: "2px solid #00d99250",
          boxShadow: "0 0 5px #00d99280, 0 0 10px #00d99250, 0 0 20px #00d99230, inset 0 0 10px #00d99220",
        }}
      >
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2" style={{ borderColor: "#00d992" }} />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2" style={{ borderColor: "#00d992" }} />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2" style={{ borderColor: "#00d992" }} />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2" style={{ borderColor: "#00d992" }} />

        {err && (
          <div
            className="mb-4 p-3 font-mono text-xs"
            style={{
              border: "1px solid oklch(0.65 0.25 25 / 0.5)",
              backgroundColor: "oklch(0.65 0.25 25 / 0.1)",
              color: "oklch(0.65 0.25 25)",
            }}
          >
            <span style={{ color: "oklch(0.78 0.22 35)" }}>[ERROR]</span> {err}
          </div>
        )}

        {!err && (
          <>
            <div className="mb-6 flex justify-center">
              <div className="relative">
                <div
                  className="absolute -inset-2 blur-xl"
                  style={{
                    background: "linear-gradient(135deg, #00d99233 0%, #14846033 50%, oklch(0.78 0.22 35 / 0.2) 100%)",
                  }}
                />

                <div
                  className="relative h-44 w-44 overflow-hidden"
                  style={{
                    backgroundColor: "rgba(10, 20, 25, 0.8)",
                    border: "2px solid #00d992",
                    boxShadow: "0 0 5px #00d99280, 0 0 10px #00d99250, 0 0 20px #00d99230, inset 0 0 10px #00d99220",
                  }}
                >
                  <div
                    className="absolute inset-0 pointer-events-none z-10"
                    style={{
                      background:
                        "repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.15), rgba(0, 0, 0, 0.15) 1px, transparent 1px, transparent 2px)",
                    }}
                  />

                  <canvas
                    ref={pixelCanvasRef}
                    className="h-full w-full relative z-10"
                    aria-label="Which champion has this ability?"
                  />
                  <canvas
                    ref={crispCanvasRef}
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover z-20"
                    style={{
                      opacity: crispMounted ? (crispVisible ? 1 : 0) : 0,
                      transition: `opacity ${REVEAL_FADE_MS}ms ease-out`,
                      willChange: "opacity",
                    }}
                  />

                  <div
                    className="absolute top-0 left-0 px-2 py-1 text-[10px] font-mono z-30 flex items-center gap-1"
                    style={{
                      backgroundColor: "rgba(0, 0, 0, 0.8)",
                      borderRight: "1px solid #00d99280",
                      borderBottom: "1px solid #00d99280",
                    }}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${status === "playing" ? "animate-pulse" : ""}`}
                      style={{
                        backgroundColor:
                          status === "playing" ? "#00d992" : status === "won" ? "#10b981" : "oklch(0.78 0.22 35)",
                      }}
                    />
                    <span className="tracking-wider" style={{ color: "#00d992" }}>
                      {status === "playing" ? "ANALYZING" : status === "won" ? "MATCH" : "REVEALED"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={onSubmit} className="flex gap-2 mb-4">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="ENTER CHAMPION NAME..."
                  className="w-full px-4 py-2.5 font-mono text-sm uppercase tracking-wide outline-none transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: "#0f1d24",
                    border: "1px solid #00d99250",
                    color: "oklch(0.98 0.01 180)",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#00d992"
                    e.target.style.boxShadow = "0 0 0 1px #00d99280"
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#00d99250"
                    e.target.style.boxShadow = "none"
                  }}
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  disabled={!answer || status !== "playing"}
                  autoFocus
                />
                <div
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-mono"
                  style={{ color: "#00d99250" }}
                >
                  {">>"}
                </div>
              </div>
              <button
                type="submit"
                className="px-6 py-2.5 font-mono text-sm uppercase tracking-wider font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: "#00d992",
                  border: "1px solid #00d992",
                  color: "#040a0c",
                  boxShadow: "0 0 5px #00d99280, 0 0 10px #00d99250, 0 0 20px #00d99230, inset 0 0 10px #00d99220",
                }}
                disabled={!answer || status !== "playing" || guess.trim().length === 0}
              >
                SCAN
              </button>
              <button
                type="button"
                onClick={giveUp}
                className="px-4 py-2.5 font-mono text-sm uppercase tracking-wider transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: "#0a1419",
                  border: "1px solid oklch(0.78 0.22 35 / 0.5)",
                  color: "oklch(0.78 0.22 35)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "oklch(0.78 0.22 35 / 0.1)"
                  e.currentTarget.style.borderColor = "oklch(0.78 0.22 35)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#0a1419"
                  e.currentTarget.style.borderColor = "oklch(0.78 0.22 35 / 0.5)"
                }}
                disabled={!answer || status !== "playing"}
              >
                ABORT
              </button>
            </form>

            <div className="min-h-[60px]">
              {status === "won" && answer && (
                <div
                  className="p-3 backdrop-blur-sm"
                  style={{
                    border: "1px solid #10b98180",
                    backgroundColor: "#10b98120",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-xl" style={{ color: "#10b981" }}>
                      ✓
                    </div>
                    <div className="flex-1">
                      <div className="font-mono text-xs tracking-wider mb-1" style={{ color: "#10b981" }}>
                        [MATCH CONFIRMED]
                      </div>
                      <div className="font-mono" style={{ color: "oklch(0.98 0.01 180)" }}>
                        Ability belongs to{" "}
                        <span
                          className="font-bold"
                          style={{
                            color: "#00d992",
                            textShadow: "0 0 5px #00d992cc, 0 0 10px #00d99280",
                          }}
                        >
                          {answer.champion.name}
                        </span>
                      </div>
                      {attempts > 0 && (
                        <div className="font-mono text-xs mt-1" style={{ color: "#6b8a99" }}>
                          You took {attempts} {attempts === 1 ? "try" : "tries"} before aborting.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {status === "revealed" && answer && (
                <div
                  className="p-3 backdrop-blur-sm"
                  style={{
                    border: "1px solid oklch(0.78 0.22 35 / 0.5)",
                    backgroundColor: "oklch(0.78 0.22 35 / 0.1)",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-xl" style={{ color: "oklch(0.78 0.22 35)" }}>
                      !
                    </div>
                    <div className="flex-1">
                      <div className="font-mono text-xs tracking-wider mb-1" style={{ color: "oklch(0.78 0.22 35)" }}>
                        [SCAN ABORTED]
                      </div>
                      <div className="font-mono text-sm" style={{ color: "oklch(0.98 0.01 180)" }}>
                        Ability belongs to{" "}
                        <span
                          className="font-bold"
                          style={{
                            color: "oklch(0.78 0.22 35)",
                            textShadow: "0 0 5px oklch(0.78 0.22 35 / 0.8), 0 0 10px oklch(0.78 0.22 35 / 0.5)",
                          }}
                        >
                          {answer.champion.name}
                        </span>
                      </div>
                      <div className="font-mono text-xs mt-1" style={{ color: "#6b8a99" }}>
                        {answer.spell.name}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {status === "playing" && attempts > 0 && (
                <div
                  className="p-3 backdrop-blur-sm"
                  style={{
                    border: "1px solid #14846080",
                    backgroundColor: "#14846020",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-xl" style={{ color: "#148460" }}>
                      ×
                    </div>
                    <div className="flex-1">
                      <div className="font-mono text-xs tracking-wider mb-1" style={{ color: "#148460" }}>
                        [NO MATCH]
                      </div>
                      <div className="font-mono text-sm" style={{ color: "oklch(0.98 0.01 180)" }}>
                        Enhancing icon resolution... Try again.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
