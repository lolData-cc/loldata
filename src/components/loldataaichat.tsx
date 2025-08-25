"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Send, Bot, User } from "lucide-react"
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
  content: string // testo visibile (per l’assistente: l’`answer` che facciamo “scrivere”)
  createdAt: number
  payload?: AssistantPayload // JSON opzionale restituito dall’API
}

type Props = {
  contextHint?: string
  placeholder?: string
  className?: string
  apiUrl?: string
}

const DEFAULT_API_URL = "https://ai.loldata.cc/chat/ask"

// Helper: scrittura “macchina da scrivere” sul solo testo
function typeWriterEffect(text: string, onUpdate: (partial: string) => void, onDone: () => void) {
  let i = 0
  const interval = setInterval(() => {
    onUpdate(text.slice(0, i + 1))
    i++
    if (i >= text.length) {
      clearInterval(interval)
      onDone()
    }
  }, 20)
}

// Helper: **grassetto** evidenziato
function renderWithHighlights(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      const inner = part.slice(2, -2)
      return (
        <span key={i} className="font-bold uppercase tracking-wide">
          {inner}
        </span>
      )
    }
    return <span key={i}>{part}</span>
  })
}

// Normalizza l’id campione per l’immagine (toglie spazi/apostrofi, prima lettera maiuscola)
function toChampId(input?: string) {
  if (!input) return ""
  const cleaned = input.replace(/['\s.]/g, "")
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

// Componente riquadro matchup
function MatchupHeader({
  champion,
  opponent,
  winrate,
  games
}: {
  champion: string
  opponent: string
  winrate: number | undefined
  games: number | undefined
}) {
  const champId = toChampId(champion)
  const oppId = toChampId(opponent)

  return (
    <div className="mb-3 rounded-sm border border-flash/10 bg-flash/5 px-3 py-1 shadow-lg backdrop-blur-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          {champId ? (
            <img
              src={`http://cdn.loldata.cc/15.13.1/img/champion/${champId}.png`}
              alt={champion}
              className="h-10 w-10 rounded"
            />
          ) : null}
          <div className="truncate">
            <div className="text-xs text-flash/50">Champion</div>
            <div className="font-semibold text-flash truncate">{champion || "—"}</div>
          </div>
        </div>

        {/* Winrate al centro */}
        <div className="text-center px-2">
          <div className="text-xs text-flash/50">Winrate</div>
          <div className="text-2xl font-extrabold">
            {typeof winrate === "number" ? `${winrate.toFixed(1)}%` : "—"}
          </div>
          <div className="text-[11px] text-flash/40">{games ? `${games} games` : ""}</div>
        </div>

        {/* Opponent */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="text-right truncate">
            <div className="text-xs text-flash/50">Opponent</div>
            <div className="font-semibold text-flash truncate">{opponent || "—"}</div>
          </div>
          {oppId ? (
            <img
              src={`http://cdn.loldata.cc/15.13.1/img/champion/${oppId}.png`}
              alt={opponent}
              className="h-10 w-10 rounded"
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default function LoldataAIChat({
  contextHint,
  placeholder,
  className,
  apiUrl = DEFAULT_API_URL
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [abortCtrl, setAbortCtrl] = useState<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const effectivePlaceholder = useMemo(
    () => placeholder || "Ask LOLDATA AI… (Invio invia, Shift+Invio va a capo)",
    [placeholder]
  )

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight })
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
        // prova ad estrarre l’answer testuale
        answerText =
          raw?.answer ??
          raw?.message ??
          raw?.output ??
          (typeof raw === "string" ? raw : JSON.stringify(raw, null, 2))
      } else {
        const txt = await res.text()
        // prova a fare parse JSON, se fallisce resta testo semplice
        try {
          raw = JSON.parse(txt)
          answerText =
            raw?.answer ??
            raw?.message ??
            raw?.output ??
            (typeof raw === "string" ? raw : JSON.stringify(raw, null, 2))
        } catch {
          raw = null
          answerText = txt
        }
      }

      if (!res.ok) {
        pushMessage({ role: "error", content: `HTTP ${res.status}\n${answerText}` })
        return
      }

      // crea messaggio assistant vuoto e poi animiamo l’answer
      const id = crypto.randomUUID()
      setMessages(prev => [...prev, { id, role: "assistant", content: "", createdAt: Date.now(), payload: raw }])

      typeWriterEffect(
        answerText,
        partial => {
          setMessages(prev => prev.map(m => (m.id === id ? { ...m, content: partial } : m)))
        },
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

  function handleStop() {
    abortCtrl?.abort()
  }

  // renderer messaggi assistant con possibile header matchup
  function AssistantMessage({ m }: { m: ChatMessage }) {
    const p = m.payload as AssistantPayload | undefined
    const isMatchup = p?.intent?.topic?.toLowerCase() === "matchup"
    const winrate =
      typeof p?.matchup?.winrate === "number"
        ? p!.matchup!.winrate
        : typeof p?.cohort?.winrate === "number"
        ? p!.cohort!.winrate
        : undefined
    const games = p?.matchup?.n ?? p?.cohort?.n

    return (
      <div
        className={cn(
          "max-w-[80%] whitespace-pre-wrap rounded-[3px] px-4 py-3 text-sm leading-relaxed font-geist",
          "border shadow-xl transition-transform duration-200 hover:-translate-y-[1px]",
          "bg-flash/5 border-flash/10 text-flash drop-shadow-[0_10px_20px_rgba(255,255,255,0.08)] backdrop-blur-sm border-l-4 border-l-flash/10"
        )}
      >
        {isMatchup ? (
          <MatchupHeader
            champion={p?.intent?.champion ?? ""}
            opponent={p?.intent?.opponent ?? ""}
            winrate={winrate}
            games={games}
          />
        ) : null}

        {renderWithHighlights(m.content)}
      </div>
    )
  }

  return (
    <div className={cn("flex h-full w-full flex-col", className)}>
      {/* Chat area */}
      <div ref={scrollRef} className="mt-4 flex-1 overflow-y-auto p-1 pr-2 scrollbar-hide">
        {messages.length === 0 && (
          <div className="text-sm text-flash/40 px-1 font-geist">
            You may ask something like: “What do I build on Volibear?”, “What is Rakan&apos;s winrate?”
          </div>
        )}

        <div className="flex flex-col gap-4">
          {messages.map(m => (
            <div
              key={m.id}
              className={cn("flex items-start", m.role === "user" ? "justify-end" : "justify-start")}
            >
              {m.role !== "user" && (
                <div className="mr-2 mt-0.5 rounded-full bg-jade/20 p-1 text-jade">
                  <Bot className="h-4 w-4" />
                </div>
              )}

              {m.role === "assistant" ? (
                <AssistantMessage m={m} />
              ) : (
                <div
                  className={cn(
                    "max-w-[80%] whitespace-pre-wrap rounded-[3px] px-4 py-3 text-sm leading-relaxed font-geist",
                    "border shadow-xl transition-transform duration-200 hover:-translate-y-[1px]",
                    m.role === "user" &&
                      "bg-jade/15 border-jade/30 text-jade drop-shadow-[0_10px_20px_rgba(16,185,129,0.15)]",
                    m.role === "error" &&
                      "bg-red-400/10 border-red-400/30 text-red-300 drop-shadow-[0_10px_20px_rgba(248,113,113,0.15)]"
                  )}
                >
                  {m.content}
                </div>
              )}

              {m.role === "user" && (
                <div className="ml-2 mt-0.5 rounded-full bg-flash/10 p-1 text-flash/70">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-flash/60">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Thinking…</span>
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="mt-4 flex items-end gap-2">
        <Textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={effectivePlaceholder}
          className="min-h-[56px] flex-1 resize-none bg-transparent text-flash placeholder:text-flash/30 focus-visible:ring-jade"
        />
        {!loading ? (
          <Button onClick={handleSend} className="h-[56px] px-4 bg-jade/20 text-jade hover:bg-jade/30">
            <Send className="mr-2 h-4 w-4" />
            Send
          </Button>
        ) : (
          <Button onClick={handleStop} className="h-[56px] px-4">
            Stop
          </Button>
        )}
      </div>
    </div>
  )
}
