// src/pages/contactpage.tsx
//
// Contact page — full-bleed Nunu splash backdrop (same treatment as the
// scout-create page), glass cards, jade accents, framer-motion entrances.
// The message form POSTs to /api/contact (→ email to the loldata inbox + the
// admin Telegram feed). No more mailto on the form.

import { useState } from "react"
import { Link } from "react-router-dom"
import { motion, useReducedMotion } from "framer-motion"
import { ArrowUpRight, Mail, MessageCircle, Send, Check, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { API_BASE_URL } from "@/config"
import { BorderBeam } from "@/components/ui/border-beam"

const NUNU_SPLASH = "https://cdn2.loldata.cc/img/champion/splash/Nunu_4.jpg"
const CONTACT_EMAIL = "loldata.cc1@gmail.com"
const DISCORD_INVITE = "https://discord.com/invite/loldata"
const JADE = "#00d992"
const EASE = [0.22, 1, 0.36, 1] as const

// Glass card — mirrors the scout-create / "This Season" surface.
const glassDark = cn(
  "relative overflow-hidden rounded-md",
  "bg-black/15 backdrop-blur-lg saturate-150",
  "shadow-[0_10px_30px_rgba(0,0,0,0.55),inset_0_0_0_0.5px_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.04)]"
)

const inputCls =
  "w-full rounded-sm border border-transparent bg-black/40 px-3 py-2 font-jetbrains text-sm text-flash placeholder:text-flash/25 outline-none transition-colors focus:border-jade/55"

const labelCls =
  "mb-1.5 block text-[9px] uppercase tracking-[0.22em] text-flash/40"

export default function ContactPage() {
  const prefersReduced = useReducedMotion()
  const [email, setEmail] = useState("")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState("")

  const rise = (delay: number, y = 16) => ({
    initial: prefersReduced ? false : { opacity: 0, y },
    animate: { opacity: 1, y: 0 },
    transition: prefersReduced ? { duration: 0 } : { duration: 0.7, delay, ease: EASE },
  })

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim() || busy) return
    setBusy(true)
    setErr("")
    try {
      const r = await fetch(`${API_BASE_URL}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, subject, message }),
      })
      if (!r.ok) throw new Error(String(r.status))
      setSent(true)
      setEmail("")
      setSubject("")
      setMessage("")
    } catch {
      setErr("Couldn't send right now — reach us on Discord or by email instead.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative w-full font-geist">
      {/* ── full-bleed Nunu backdrop ──────────────────────────────── */}
      <motion.div
        aria-hidden
        className="fixed inset-0 -z-10 overflow-hidden"
        initial={prefersReduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.1, ease: EASE }}
      >
        <motion.img
          src={NUNU_SPLASH}
          alt=""
          className="absolute inset-0 h-full w-full select-none object-cover object-[center_22%]"
          initial={prefersReduced ? false : { scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.6, ease: EASE }}
        />
        {/* scrims — keep the dark theme, let Nunu glow through the right side */}
        <div className="absolute inset-0 bg-[#040A0C]/78" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#040A0C] via-[#040A0C]/55 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-[#040A0C] to-transparent" />
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#040A0C] via-[#040A0C]/70 to-transparent" />
        <div className="pointer-events-none absolute right-[8%] top-[14%] h-[360px] w-[520px] rounded-full bg-jade/10 blur-[120px]" />
      </motion.div>

      {/* ── content ───────────────────────────────────────────────── */}
      <div className="relative z-10 mx-auto min-h-screen w-full max-w-[820px] pt-10 pb-28">
        {/* hero */}
        <div className="mb-9">
          <motion.div className="mb-3 flex items-center gap-2.5" {...rise(0.12)}>
            <span style={{ color: JADE, fontSize: "12px" }}>◈</span>
            <span className="font-jetbrains text-[12px] font-medium uppercase tracking-[0.32em] text-jade/80">
              Support · Contact
            </span>
          </motion.div>
          <motion.h1
            className="font-chakrapetch text-4xl font-bold uppercase leading-[0.95] tracking-[0.02em] text-flash drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)] sm:text-[52px]"
            {...rise(0.22)}
          >
            Get in touch
          </motion.h1>
          <motion.p
            className="mt-4 max-w-[54ch] font-chakrapetch text-[14px] leading-relaxed text-flash/70 drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]"
            {...rise(0.36)}
          >
            Questions, feedback, a bug, a partnership — or you just broke something
            interesting? We read everything. Discord is the fastest line; otherwise drop a
            message below.
          </motion.p>
        </div>

        {/* channels */}
        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <motion.a
            href={DISCORD_INVITE}
            target="_blank"
            rel="noreferrer"
            whileHover={{ y: -2 }}
            className={cn(glassDark, "group block cursor-clicker p-5")}
            {...rise(0.46)}
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-sm border border-jade/25 bg-jade/[0.08] text-jade">
                <MessageCircle className="h-4 w-4" />
              </span>
              <ArrowUpRight className="h-4 w-4 text-flash/30 transition-colors group-hover:text-jade" />
            </div>
            <div className="mt-3 font-chakrapetch text-sm font-semibold text-flash/90">Discord</div>
            <p className="mt-1 font-jetbrains text-[12px] leading-relaxed text-flash/45">
              Join the community — fastest response, direct line to the team.
            </p>
          </motion.a>

          <motion.a
            href={`mailto:${CONTACT_EMAIL}`}
            whileHover={{ y: -2 }}
            className={cn(glassDark, "group block cursor-clicker p-5")}
            {...rise(0.54)}
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-sm border border-jade/25 bg-jade/[0.08] text-jade">
                <Mail className="h-4 w-4" />
              </span>
              <ArrowUpRight className="h-4 w-4 text-flash/30 transition-colors group-hover:text-jade" />
            </div>
            <div className="mt-3 font-chakrapetch text-sm font-semibold text-flash/90">Email</div>
            <p className="mt-1 break-all font-jetbrains text-[12px] leading-relaxed text-flash/45">
              {CONTACT_EMAIL} — for business, press or anything formal.
            </p>
          </motion.a>
        </div>

        {/* message form */}
        <motion.div className={glassDark} {...rise(0.62, 22)}>
          <BorderBeam duration={10} size={120} />
          <div className="relative z-10 p-6 sm:p-8">
            {sent ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-sm border border-jade/40 bg-jade/10 text-jade">
                  <Check className="h-5 w-5" />
                </span>
                <div className="font-chakrapetch text-lg font-bold text-flash/90">Message sent</div>
                <p className="max-w-xs font-jetbrains text-[12px] leading-relaxed text-flash/45">
                  Thanks — it landed in our inbox. We read everything and will get back to you
                  if it needs a reply.
                </p>
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-jade/70 transition-colors hover:text-jade cursor-clicker"
                >
                  Send another
                </button>
              </div>
            ) : (
              <form onSubmit={send} className="space-y-4">
                <div className="flex items-center gap-3">
                  <span style={{ color: JADE, fontSize: "11px" }}>◈</span>
                  <span className="font-jetbrains text-[12px] font-medium uppercase tracking-[0.22em] text-flash/85">
                    Send a message
                  </span>
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-flash/15 to-transparent" />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>Your email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Subject</label>
                    <input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="What's this about?"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Message</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us everything…"
                    rows={5}
                    className={cn(inputCls, "resize-y")}
                  />
                </div>

                {err && <p className="font-jetbrains text-[11px] text-[#ff6286]/80">{err}</p>}

                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="hidden font-mono text-[10px] tracking-[0.08em] text-flash/30 sm:block">
                    Goes straight to our inbox
                  </span>
                  <button
                    type="submit"
                    disabled={!message.trim() || busy}
                    className="inline-flex items-center gap-2 rounded-sm bg-jade px-5 py-2.5 font-jetbrains text-[11px] uppercase tracking-[0.2em] text-liquirice shadow-[0_8px_24px_rgba(0,217,146,0.25)] transition-all hover:bg-jade/90 disabled:cursor-not-allowed disabled:opacity-40 cursor-clicker"
                  >
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    {busy ? "Sending…" : "Send"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>

        <motion.p className="mt-6 font-jetbrains text-[11px] text-flash/40" {...rise(0.7)}>
          Looking for a streamer or pro profile?{" "}
          <Link
            to="/streamers"
            className="text-jade/70 underline underline-offset-4 transition-colors hover:text-jade cursor-clicker"
          >
            Apply here
          </Link>
          .
        </motion.p>
      </div>
    </div>
  )
}
