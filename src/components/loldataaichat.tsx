"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Link } from "react-router-dom"
import { ArrowUp, ArrowUpRight, Square } from "lucide-react"
import { cn } from "@/lib/utils"
import { BOX_API_BASE_URL } from "@/config"
import { RichGameText } from "@/components/richgametext"

type ChatAction = { label: string; href: string; kind?: string }

type ChatMessage = {
  id: string
  role: "user" | "assistant" | "error"
  content: string
  createdAt: number
  actions?: ChatAction[]
  instant?: boolean // loaded from history → render immediately, no typewriter
}

export type AiUserContext = { puuid?: string | null; region?: string | null; nametag?: string | null }

type Props = {
  contextHint?: string
  placeholder?: string
  className?: string
  apiUrl?: string
  /** Linked-account identity, so the AI can answer "how am I doing?" about the user. */
  userContext?: AiUserContext
  /** Supabase access token — enables per-account, persisted chat history. */
  authToken?: string
}

// The AI agent is deployed on the box backend (api2) — used directly in both dev
// and prod, so no local backend is needed to test the chat.
const DEFAULT_API_URL = `${BOX_API_BASE_URL}/api/ai/chat`

const EASE = [0.22, 1, 0.36, 1] as const

const SUGGESTIONS = [
  "Best item for Quinn vs assassins?",
  "How am I performing lately?",
  "Best support for Aphelios?",
  "Is Darius good into Garen?",
]

/* ── smooth character reveal for assistant answers ── */
function useReveal(text: string, skip = false) {
  const [n, setN] = useState(skip ? text.length : 0)
  useEffect(() => {
    if (skip) {
      setN(text.length)
      return
    }
    setN(0)
    if (!text) return
    let i = 0
    const id = setInterval(() => {
      i++
      setN(i)
      if (i >= text.length) clearInterval(id)
    }, 9)
    return () => clearInterval(id)
  }, [text, skip])
  return { shown: text.slice(0, n), done: n >= text.length }
}

const enter = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: EASE },
}

function ActionButton({ a }: { a: ChatAction }) {
  return (
    <Link
      to={a.href}
      className="group/cta inline-flex items-center gap-1.5 rounded-full border border-jade/25 bg-jade/[0.06] px-3.5 py-1.5 font-chakrapetch text-[12px] font-light tracking-wide text-jade/90 transition-all duration-200 hover:border-jade/50 hover:bg-jade/[0.12] hover:text-jade cursor-clicker"
    >
      {a.label}
      <ArrowUpRight size={13} className="transition-transform duration-200 group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5" />
    </Link>
  )
}

function AssistantMsg({ text, actions, instant }: { text: string; actions?: ChatAction[]; instant?: boolean }) {
  const { shown, done } = useReveal(text, !!instant)
  return (
    <motion.div {...enter} className="pr-6">
      <div className="flex gap-3">
        <span
          className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-jade"
          style={{ boxShadow: "0 0 8px #00d992" }}
        />
        <p className="flex-1 font-chakrapetch text-[15px] font-light leading-[1.75] text-flash/95 whitespace-pre-wrap">
          {done ? <RichGameText text={text} /> : shown}
          {!done && (
            <span className="ml-0.5 inline-block h-[15px] w-px translate-y-[2px] bg-jade/70 animate-[aiBlink_1s_step-end_infinite]" />
          )}
        </p>
      </div>
      {done && actions && actions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="ml-[18px] mt-3 flex flex-wrap gap-2"
        >
          {actions.map((a) => (
            <ActionButton key={a.href} a={a} />
          ))}
        </motion.div>
      )}
    </motion.div>
  )
}

function UserMsg({ text }: { text: string }) {
  return (
    <motion.div {...enter} className="flex justify-end">
      <p className="max-w-[80%] whitespace-pre-wrap rounded-[18px] rounded-br-md bg-flash/[0.06] px-4 py-2.5 font-chakrapetch text-[14.5px] font-light leading-relaxed text-flash/80">
        <RichGameText text={text} />
      </p>
    </motion.div>
  )
}

function ErrorMsg({ text }: { text: string }) {
  return (
    <motion.div {...enter} className="flex gap-3 pr-6">
      <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#ff6286]" />
      <p className="font-chakrapetch text-[14px] font-light leading-relaxed text-[#ff6286]/80 whitespace-pre-wrap">{text}</p>
    </motion.div>
  )
}

function Thinking() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3">
      <span className="h-1.5 w-1.5 rounded-full bg-jade" style={{ boxShadow: "0 0 8px #00d992" }} />
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-jade/50"
            animate={{ opacity: [0.2, 1, 0.2], y: [0, -3, 0] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.16, ease: "easeInOut" }}
          />
        ))}
      </div>
    </motion.div>
  )
}

export default function LoldataAIChat({
  contextHint,
  placeholder,
  className,
  apiUrl = DEFAULT_API_URL,
  userContext,
  authToken,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [abortCtrl, setAbortCtrl] = useState<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const stickRef = useRef(true)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const ph = useMemo(() => placeholder || "Ask lolData AI anything…", [placeholder])
  const historyUrl = useMemo(() => apiUrl.replace(/\/chat$/, "/history"), [apiUrl])

  // Stick to the bottom. Track whether the user is near the bottom; snap down
  // whenever the content grows (new message, typewriter reveal, icons loading) —
  // but never yank them back down if they've scrolled up to read.
  useEffect(() => {
    const el = scrollRef.current
    const content = contentRef.current
    if (!el || !content) return
    const onScroll = () => {
      stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 90
    }
    el.addEventListener("scroll", onScroll, { passive: true })
    const snap = () => {
      if (stickRef.current) el.scrollTop = el.scrollHeight
    }
    const ro = new ResizeObserver(snap)
    ro.observe(content)
    snap() // land at the bottom on open
    return () => {
      el.removeEventListener("scroll", onScroll)
      ro.disconnect()
    }
  }, [])

  // auto-grow the input as you type
  useEffect(() => {
    const ta = taRef.current
    if (!ta) return
    ta.style.height = "0px"
    ta.style.height = Math.min(ta.scrollHeight, 168) + "px"
  }, [input])

  // Load this account's persisted conversation once (survives refresh / new device).
  useEffect(() => {
    if (!authToken) {
      setHydrated(true)
      return
    }
    let alive = true
    fetch(historyUrl, { headers: { Authorization: `Bearer ${authToken}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive) return
        const rows = Array.isArray(d?.messages) ? d.messages : []
        if (rows.length) {
          setMessages(
            rows.map((m: any) => ({
              id: crypto.randomUUID(),
              createdAt: Date.now(),
              role: m?.role === "assistant" ? "assistant" : "user",
              content: String(m?.content ?? ""),
              actions: Array.isArray(m?.actions) ? m.actions : undefined,
              instant: true,
            }))
          )
        }
      })
      .catch(() => {})
      .finally(() => alive && setHydrated(true))
    return () => {
      alive = false
    }
  }, [authToken, historyUrl])

  function push(m: Omit<ChatMessage, "id" | "createdAt">) {
    setMessages((p) => [...p, { id: crypto.randomUUID(), createdAt: Date.now(), ...m }])
  }

  async function send(prompt: string) {
    const controller = new AbortController()
    setAbortCtrl(controller)
    setLoading(true)
    try {
      const finalPrompt = contextHint ? `${contextHint}\n\n${prompt}` : prompt
      // history is this closure's state — BEFORE the new user turn was pushed — so
      // appending the new prompt rebuilds the full thread.
      const history = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }))
      history.push({ role: "user", content: finalPrompt })

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ messages: history, userContext }),
        signal: controller.signal,
      })

      let raw: any = null
      let answer = ""
      try {
        raw = await res.json()
        answer = raw?.answer ?? raw?.message ?? raw?.output ?? (typeof raw === "string" ? raw : JSON.stringify(raw))
      } catch {
        answer = await res.text().catch(() => "")
      }

      if (!res.ok) {
        push({ role: "error", content: answer || `Error ${res.status}` })
        return
      }
      push({ role: "assistant", content: answer, actions: Array.isArray(raw?.actions) ? raw.actions : undefined })
    } catch (err: any) {
      if (err?.name !== "AbortError") push({ role: "error", content: err?.message || "Connection failed" })
    } finally {
      setLoading(false)
      setAbortCtrl(null)
    }
  }

  function submit() {
    const t = input.trim()
    if (!t || loading) return
    push({ role: "user", content: t })
    setInput("")
    send(t)
  }
  function pick(q: string) {
    if (loading) return
    push({ role: "user", content: q })
    send(q)
  }
  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  const empty = messages.length === 0

  return (
    <div className={cn("flex flex-col", className)}>
      <style>{`@keyframes aiBlink{0%,100%{opacity:1}50%{opacity:0}}`}</style>

      {/* messages — floating, no container */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-hide">
        <div ref={contentRef} className="mx-auto w-full max-w-2xl">
          <AnimatePresence mode="wait">
            {!hydrated ? (
              <div key="hydrating" className="min-h-[42vh]" />
            ) : empty ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.55, ease: EASE }}
                className="flex min-h-[42vh] flex-col items-center justify-center gap-7 text-center"
              >
                <div className="space-y-2.5">
                  <h3 className="font-chakrapetch text-[26px] font-bold tracking-tight text-flash/90">Ask anything.</h3>
                  <p className="font-chakrapetch text-[13px] font-light text-flash/35">Real answers, live from ranked data.</p>
                </div>
                <div className="flex flex-col items-center gap-3">
                  {SUGGESTIONS.map((q, i) => (
                    <motion.button
                      key={q}
                      type="button"
                      onClick={() => pick(q)}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.12 + i * 0.07, ease: EASE }}
                      className="font-chakrapetch text-[13.5px] font-light text-flash/45 transition-colors duration-200 hover:text-jade cursor-clicker"
                    >
                      {q}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <div key="thread" className="flex flex-col gap-7 py-6">
                {messages.map((m) =>
                  m.role === "user" ? (
                    <UserMsg key={m.id} text={m.content} />
                  ) : m.role === "error" ? (
                    <ErrorMsg key={m.id} text={m.content} />
                  ) : (
                    <AssistantMsg key={m.id} text={m.content} actions={m.actions} instant={m.instant} />
                  )
                )}
                {loading && <Thinking />}
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* floating input */}
      <div className="mx-auto w-full max-w-2xl shrink-0 pt-3">
        <div
          className={cn(
            "flex items-end gap-2 rounded-[20px] border px-3 py-2 transition-all duration-300",
            "border-flash/10 bg-[rgba(255,255,255,0.025)]",
            "focus-within:border-jade/35 focus-within:bg-[rgba(0,217,146,0.025)]",
            "focus-within:shadow-[0_0_34px_-12px_rgba(0,217,146,0.55)]"
          )}
        >
          <textarea
            ref={taRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            rows={1}
            placeholder={ph}
            className="max-h-[168px] flex-1 resize-none border-0 bg-transparent py-1.5 font-chakrapetch text-[14.5px] font-light leading-relaxed text-flash/90 outline-none scrollbar-hide placeholder:text-flash/25 caret-jade"
          />
          {loading ? (
            <button
              type="button"
              onClick={() => abortCtrl?.abort()}
              aria-label="Stop"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-[14px] bg-flash/10 text-flash/60 transition-all duration-200 hover:bg-flash/[0.16] cursor-clicker"
            >
              <Square size={12} className="fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!input.trim()}
              aria-label="Send"
              className={cn(
                "grid h-9 w-9 shrink-0 place-items-center rounded-[14px] transition-all duration-300 cursor-clicker",
                input.trim()
                  ? "bg-jade text-[#04110c] hover:scale-[1.06] shadow-[0_0_22px_-5px_rgba(0,217,146,0.7)]"
                  : "bg-flash/[0.07] text-flash/25"
              )}
            >
              <ArrowUp size={18} strokeWidth={2.5} />
            </button>
          )}
        </div>
        <p className="mt-2 text-center font-chakrapetch text-[10px] font-light text-flash/15">
          lolData AI can make mistakes — verify important calls.
        </p>
      </div>
    </div>
  )
}
