"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"

type AssistantPayload = {
  mode?: string
  intent?: {
    topic?: string
    champion?: string
    opponent?: string
    role?: string
    patch_major?: string
    queue_id?: number
    language?: string
  }
  cohort?: {
    n?: number
    winrate?: number
    topItems?: { item: number; freq: number }[]
  }
  matchup?: {
    n?: number
    winrate?: number
  }
  answer?: string
}

type ChatMessage = {
  id: string
  role: "user" | "assistant" | "error"
  content: string
  createdAt: number
  payload?: AssistantPayload
}

type Props = {
  contextHint?: string
  placeholder?: string
  className?: string
  apiUrl?: string
}

const DEFAULT_API_URL =
  process.env.NODE_ENV === "development"
    ? "/api/loldata-ai"
    : "https://ai.loldata.cc/chat/ask"

function typeWriterEffect(text: string, onUpdate: (partial: string) => void, onDone: () => void) {
  let i = 0
  const interval = setInterval(() => {
    onUpdate(text.slice(0, i + 1))
    i++
    if (i >= text.length) {
      clearInterval(interval)
      onDone()
    }
  }, 15)
}

function renderWithHighlights(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <span key={i} className="font-bold text-jade">
          {part.slice(2, -2)}
        </span>
      )
    }
    return <span key={i}>{part}</span>
  })
}

function toChampId(input?: string) {
  if (!input) return ""
  const cleaned = input.replace(/['\s.]/g, "")
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

/* ── Cyber rhomboid decorators ── */
function CyberCorners({ color = "jade" }: { color?: string }) {
  const c = color === "jade" ? "bg-jade/25" : "bg-red-400/25"
  return (
    <>
      <div className="absolute top-0 left-0 w-2.5 h-2.5 z-[3]">
        <div className={cn("absolute top-0 left-0 w-full h-px", c)} />
        <div className={cn("absolute top-0 left-0 w-px h-full", c)} />
      </div>
      <div className="absolute top-0 right-0 w-2.5 h-2.5 z-[3]">
        <div className={cn("absolute top-0 right-0 w-full h-px", c)} />
        <div className={cn("absolute top-0 right-0 w-px h-full", c)} />
      </div>
      <div className="absolute bottom-0 left-0 w-2.5 h-2.5 z-[3]">
        <div className={cn("absolute bottom-0 left-0 w-full h-px", c)} />
        <div className={cn("absolute bottom-0 left-0 w-px h-full", c)} />
      </div>
      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 z-[3]">
        <div className={cn("absolute bottom-0 right-0 w-full h-px", c)} />
        <div className={cn("absolute bottom-0 right-0 w-px h-full", c)} />
      </div>
    </>
  )
}

function MatchupHeader({
  champion, opponent, winrate, games
}: { champion: string; opponent: string; winrate?: number; games?: number }) {
  const champId = toChampId(champion)
  const oppId = toChampId(opponent)
  const wrColor = winrate && winrate >= 50 ? "text-jade" : "text-red-400"

  return (
    <div className="relative mb-3 rounded-sm border border-jade/15 bg-jade/[0.03] overflow-hidden">
      <CyberCorners />
      <div className="absolute inset-0 pointer-events-none" style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,217,146,0.015) 3px, rgba(0,217,146,0.015) 4px)" }} />
      <div className="relative z-10 flex items-center justify-between gap-3 px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          {champId && <img src={`https://cdn2.loldata.cc/16.1.1/img/champion/${champId}.png`} alt={champion} className="h-9 w-9 rounded-sm border border-jade/20" />}
          <div className="truncate">
            <div className="text-[9px] font-mono text-jade/40 tracking-[0.15em] uppercase">Champion</div>
            <div className="text-[13px] font-mono font-semibold text-flash truncate">{champion || "--"}</div>
          </div>
        </div>

        <div className="text-center px-2 shrink-0">
          <div className="text-[9px] font-mono text-jade/40 tracking-[0.15em] uppercase">Winrate</div>
          <div className={cn("text-xl font-mono font-bold tabular-nums", wrColor)}>
            {typeof winrate === "number" ? `${winrate.toFixed(1)}%` : "--"}
          </div>
          {games ? <div className="text-[10px] font-mono text-flash/30">{games} games</div> : null}
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <div className="text-right truncate">
            <div className="text-[9px] font-mono text-red-400/40 tracking-[0.15em] uppercase">Opponent</div>
            <div className="text-[13px] font-mono font-semibold text-flash truncate">{opponent || "--"}</div>
          </div>
          {oppId && <img src={`https://cdn2.loldata.cc/16.1.1/img/champion/${oppId}.png`} alt={opponent} className="h-9 w-9 rounded-sm border border-red-400/20" />}
        </div>
      </div>
    </div>
  )
}

export default function LoldataAIChat({
  contextHint, placeholder, className, apiUrl = DEFAULT_API_URL
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [abortCtrl, setAbortCtrl] = useState<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const effectivePlaceholder = useMemo(
    () => placeholder || "Ask lolData AI anything...",
    [placeholder]
  )

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }, [messages, loading])

  function pushMessage(msg: Omit<ChatMessage, "id" | "createdAt">) {
    setMessages(prev => [...prev, { id: crypto.randomUUID(), createdAt: Date.now(), ...msg }])
  }

  async function sendPrompt(prompt: string) {
    const controller = new AbortController()
    setAbortCtrl(controller)
    setLoading(true)

    try {
      const finalPrompt = contextHint ? `${contextHint}\n\n${prompt}` : prompt
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: finalPrompt }),
        signal: controller.signal
      })

      const contentType = res.headers.get("content-type") || ""
      let raw: any = null
      let answerText = ""

      if (contentType.includes("application/json")) {
        raw = await res.json()
        answerText = raw?.answer ?? raw?.message ?? raw?.output ?? (typeof raw === "string" ? raw : JSON.stringify(raw, null, 2))
      } else {
        const txt = await res.text()
        try {
          raw = JSON.parse(txt)
          answerText = raw?.answer ?? raw?.message ?? raw?.output ?? (typeof raw === "string" ? raw : JSON.stringify(raw, null, 2))
        } catch {
          raw = null
          answerText = txt
        }
      }

      if (!res.ok) {
        pushMessage({ role: "error", content: `HTTP ${res.status}\n${answerText}` })
        return
      }

      const id = crypto.randomUUID()
      setMessages(prev => [...prev, { id, role: "assistant", content: "", createdAt: Date.now(), payload: raw }])

      typeWriterEffect(
        answerText,
        partial => setMessages(prev => prev.map(m => (m.id === id ? { ...m, content: partial } : m))),
        () => {}
      )
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        pushMessage({ role: "error", content: err?.message || "Unknown error" })
      }
    } finally {
      setLoading(false)
      setAbortCtrl(null)
    }
  }

  async function handleSend() {
    const trimmed = input.trim()
    if (!trimmed || loading) return
    pushMessage({ role: "user", content: trimmed })
    setInput("")
    await sendPrompt(trimmed)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function AssistantMessage({ m }: { m: ChatMessage }) {
    const p = m.payload as AssistantPayload | undefined
    const isMatchup = p?.intent?.topic?.toLowerCase() === "matchup"
    const winrate = typeof p?.matchup?.winrate === "number" ? p!.matchup!.winrate : typeof p?.cohort?.winrate === "number" ? p!.cohort!.winrate : undefined
    const games = p?.matchup?.n ?? p?.cohort?.n

    return (
      <div className="relative rounded-sm border border-flash/[0.08] bg-flash/[0.02] overflow-hidden">
        <CyberCorners color="jade" />
        {/* Left accent bar */}
        <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-jade/30" />
        {/* Scanlines */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,217,146,0.01) 3px, rgba(0,217,146,0.01) 4px)" }} />

        <div className="relative z-10 px-4 py-3 pl-5">
          {isMatchup && (
            <MatchupHeader
              champion={p?.intent?.champion ?? ""}
              opponent={p?.intent?.opponent ?? ""}
              winrate={winrate}
              games={games}
            />
          )}
          <div className="text-[13px] text-flash/70 leading-relaxed font-mono whitespace-pre-wrap">
            {renderWithHighlights(m.content)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex h-full w-full flex-col", className)}>
      {/* Chat messages */}
      <div ref={scrollRef} className="mt-4 flex-1 overflow-y-auto pr-2 scrollbar-hide">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-6">
            {/* Rhomboid icon */}
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rotate-45 border border-jade/20 bg-jade/[0.03]" />
              <div className="absolute inset-2 rotate-45 border border-jade/10" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-jade/50 text-lg font-mono font-bold">AI</span>
              </div>
            </div>
            <div className="text-center space-y-2">
              <p className="text-[11px] font-mono tracking-[0.2em] uppercase text-jade/40">
                lolData Intelligence
              </p>
              <p className="text-[12px] font-mono text-flash/30 max-w-sm">
                Ask about champion winrates, matchups, builds, or any League of Legends data
              </p>
            </div>
            {/* Suggestion chips */}
            <div className="flex flex-wrap justify-center gap-2 max-w-md">
              {[
                "What do I build on Volibear?",
                "Rakan winrate this patch?",
                "Best ADCs right now?",
              ].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => { setInput(q); }}
                  className={cn(
                    "px-3 py-1.5 rounded-sm text-[10px] font-mono tracking-wide cursor-clicker",
                    "border border-jade/15 bg-jade/[0.03] text-jade/50",
                    "hover:border-jade/30 hover:text-jade/70 hover:bg-jade/[0.06]",
                    "transition-all duration-200"
                  )}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {messages.map(m => (
            <div
              key={m.id}
              className={cn("flex items-start gap-3", m.role === "user" ? "justify-end" : "justify-start")}
            >
              {/* AI avatar */}
              {m.role !== "user" && (
                <div className="relative w-7 h-7 shrink-0 mt-1">
                  <div className="absolute inset-0 rotate-45 border border-jade/30 bg-jade/[0.08]" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-jade text-[9px] font-mono font-bold">AI</span>
                  </div>
                </div>
              )}

              {m.role === "assistant" ? (
                <div className="max-w-[85%] flex-1">
                  <AssistantMessage m={m} />
                </div>
              ) : (
                <div
                  className={cn(
                    "relative max-w-[80%] rounded-sm overflow-hidden",
                    m.role === "user" && "border border-jade/20 bg-jade/[0.05]",
                    m.role === "error" && "border border-red-400/20 bg-red-400/[0.05]"
                  )}
                >
                  {m.role === "user" && <CyberCorners />}
                  {m.role === "error" && <CyberCorners color="red" />}
                  {/* Right accent for user */}
                  {m.role === "user" && <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-jade/30" />}
                  {m.role === "error" && <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-red-400/30" />}
                  <div className={cn(
                    "relative z-10 px-4 py-2.5 text-[13px] font-mono whitespace-pre-wrap",
                    m.role === "user" ? "text-jade/80 pr-5" : "text-red-300/80 pl-5"
                  )}>
                    {m.content}
                  </div>
                </div>
              )}

              {/* User avatar */}
              {m.role === "user" && (
                <div className="relative w-7 h-7 shrink-0 mt-1">
                  <div className="absolute inset-0 rotate-45 border border-flash/20 bg-flash/[0.05]" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-flash/60 text-[9px] font-mono font-bold">U</span>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="flex items-center gap-3">
              <div className="relative w-7 h-7 shrink-0">
                <div className="absolute inset-0 rotate-45 border border-jade/30 bg-jade/[0.08] animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-jade text-[9px] font-mono font-bold">AI</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rotate-45 bg-jade/40 animate-pulse"
                    style={{ animationDelay: `${i * 200}ms` }}
                  />
                ))}
                <span className="text-[10px] font-mono text-jade/30 tracking-[0.15em] uppercase ml-2">Processing</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Input bar — Liquid Glass + Rhomboid send ── */}
      <div className="mt-4 flex items-center gap-4">
        {/* Liquid glass input pill */}
        <div className={cn(
          "relative flex-1 flex items-center rounded-full px-5 h-11",
          "bg-white/[0.03]",
          "ring-1 ring-inset ring-white/[0.12]",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-1px_2px_rgba(0,0,0,0.12)]",
          "backdrop-blur-2xl",
          "transition-all duration-300",
          "focus-within:ring-jade/25 focus-within:shadow-[inset_0_1px_0_rgba(0,217,146,0.08),0_0_20px_rgba(0,217,146,0.06)]"
        )}>
          {/* Top edge highlight */}
          <div className="pointer-events-none absolute inset-x-4 top-[1px] h-px rounded-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={effectivePlaceholder}
            rows={1}
            className={cn(
              "flex-1 resize-none bg-transparent border-0 outline-none",
              "text-[13px] font-mono text-flash/65 placeholder:text-flash/18",
              "h-[24px] py-0",
              "caret-jade"
            )}
          />
        </div>

        {/* Rhomboid send / stop button */}
        {!loading ? (
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim()}
            className={cn(
              "group relative w-10 h-10 shrink-0 cursor-clicker transition-opacity duration-500 ease-in-out",
              input.trim() ? "opacity-100" : "opacity-20 pointer-events-none"
            )}
          >
            <span className={cn(
              "absolute inset-0 rotate-45 rounded-[4px] border transition-all duration-300",
              "bg-black/60 border-jade/40",
              "group-hover:border-jade/80 group-hover:bg-jade/10",
              "group-hover:shadow-[0_0_18px_rgba(0,217,146,0.35),inset_0_0_8px_rgba(0,217,146,0.08)]",
              "shadow-[0_0_8px_rgba(0,217,146,0.15)]"
            )} />
            <span className="absolute inset-0 flex items-center justify-center text-jade/70 group-hover:text-jade transition-colors duration-300">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13" />
                <path d="M22 2L15 22L11 13L2 9L22 2Z" />
              </svg>
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => abortCtrl?.abort()}
            className="group relative w-10 h-10 shrink-0 cursor-clicker"
          >
            <span className={cn(
              "absolute inset-0 rotate-45 rounded-[4px] border transition-all duration-300 animate-pulse",
              "bg-black/60 border-red-400/40",
              "group-hover:border-red-400/80 group-hover:bg-red-400/10",
              "shadow-[0_0_8px_rgba(239,68,68,0.15)]"
            )} />
            <span className="absolute inset-0 flex items-center justify-center">
              <div className="w-3 h-3 bg-red-400/60 rounded-[2px]" />
            </span>
          </button>
        )}
      </div>
    </div>
  )
}
