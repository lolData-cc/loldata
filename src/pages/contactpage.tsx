// src/pages/contactpage.tsx
//
// Contact / get-in-touch page, in the homepage design language (HUD
// brackets, scanlines, jade accents, framer-motion entrances). No
// backend dependency: Discord is the primary channel and the message
// form composes a mailto: so it works today. When the Resend pipeline
// lands we can repoint the form at a POST /api/contact endpoint.

import { useState } from "react"
import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import { ArrowUpRight, Mail, MessageCircle, Send } from "lucide-react"

const EASE = [0.22, 1, 0.36, 1] as const

// Change this to the real inbox when you have one.
const CONTACT_EMAIL = "contact@loldata.cc"
const DISCORD_INVITE = "https://discord.gg/SNjKYbdXzG"

// Reusable HUD-bracket glass card, matching the rest of the site.
function HudCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative rounded-[2px] border border-jade/10 bg-cement overflow-hidden ${className}`}>
      <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-jade/40" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.015) 3px, rgba(255,255,255,0.015) 4px)" }}
      />
      <div className="absolute top-0 left-0 w-3 h-3 z-[3]"><div className="absolute top-0 left-0 w-full h-[1px] bg-jade/25" /><div className="absolute top-0 left-0 w-[1px] h-full bg-jade/25" /></div>
      <div className="absolute top-0 right-0 w-3 h-3 z-[3]"><div className="absolute top-0 right-0 w-full h-[1px] bg-jade/25" /><div className="absolute top-0 right-0 w-[1px] h-full bg-jade/25" /></div>
      <div className="absolute bottom-0 left-0 w-3 h-3 z-[3]"><div className="absolute bottom-0 left-0 w-full h-[1px] bg-jade/25" /><div className="absolute bottom-0 left-0 w-[1px] h-full bg-jade/25" /></div>
      <div className="absolute bottom-0 right-0 w-3 h-3 z-[3]"><div className="absolute bottom-0 right-0 w-full h-[1px] bg-jade/25" /><div className="absolute bottom-0 right-0 w-[1px] h-full bg-jade/25" /></div>
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-jade/30 via-jade/10 to-transparent z-[3]" />
      <div className="relative z-[2]">{children}</div>
    </div>
  )
}

export default function ContactPage() {
  const [email, setEmail] = useState("")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")

  function send(e: React.FormEvent) {
    e.preventDefault()
    const body = `${message}\n\n— Reply to: ${email || "(no email provided)"}`
    window.location.href =
      `mailto:${CONTACT_EMAIL}` +
      `?subject=${encodeURIComponent(subject || "Contact from loldata.cc")}` +
      `&body=${encodeURIComponent(body)}`
  }

  return (
    <div className="w-full max-w-3xl mx-auto py-12 px-2 sm:px-4">
      {/* Header tag */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="font-mono text-[10px] tracking-[0.3em] uppercase text-jade/40 mb-6"
      >
        :: SUPPORT :: CONTACT_US ::
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: EASE, delay: 0.05 }}
        className="font-mechano text-2xl sm:text-3xl text-flash/90 flex items-center gap-3 mb-2"
      >
        <span className="text-jade/50 text-sm">◈</span>
        Get in touch
      </motion.h1>
      <div className="w-48 h-px mb-8" style={{ background: "linear-gradient(90deg, rgba(0,217,146,0.4), transparent)" }} />

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="text-sm text-flash/55 leading-relaxed mb-10 font-jetbrains max-w-xl"
      >
        Questions, feedback, a bug, a partnership, or you just broke something interesting? We read everything.
        Discord is the fastest way to reach us — otherwise drop a message below.
      </motion.p>

      {/* Channels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        <motion.a
          href={DISCORD_INVITE}
          target="_blank"
          rel="noreferrer"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.12 }}
          whileHover={{ y: -2 }}
          className="group block cursor-clicker"
        >
          <HudCard className="hover:border-jade/30 transition-colors">
            <div className="px-4 py-4 pl-5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-sm border border-jade/25 bg-jade/[0.06] text-jade">
                  <MessageCircle className="w-4 h-4" />
                </span>
                <ArrowUpRight className="w-4 h-4 text-flash/30 group-hover:text-jade transition-colors" />
              </div>
              <div className="mt-3 text-flash/90 font-medium text-sm">Discord</div>
              <p className="text-[12px] text-flash/45 mt-1 leading-relaxed">Join the community — fastest response, direct line to the team.</p>
            </div>
          </HudCard>
        </motion.a>

        <motion.a
          href={`mailto:${CONTACT_EMAIL}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.18 }}
          whileHover={{ y: -2 }}
          className="group block cursor-clicker"
        >
          <HudCard className="hover:border-jade/30 transition-colors">
            <div className="px-4 py-4 pl-5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-sm border border-jade/25 bg-jade/[0.06] text-jade">
                  <Mail className="w-4 h-4" />
                </span>
                <ArrowUpRight className="w-4 h-4 text-flash/30 group-hover:text-jade transition-colors" />
              </div>
              <div className="mt-3 text-flash/90 font-medium text-sm">Email</div>
              <p className="text-[12px] text-flash/45 mt-1 leading-relaxed">{CONTACT_EMAIL} — for business, press or anything formal.</p>
            </div>
          </HudCard>
        </motion.a>
      </div>

      {/* Message form */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: EASE, delay: 0.24 }}
      >
        <HudCard>
          <form onSubmit={send} className="px-4 sm:px-6 py-5 pl-5 sm:pl-7 space-y-4">
            <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-jade/50">▸ Send a message</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] uppercase tracking-[0.22em] text-flash/35 mb-1.5">Your email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-black/30 border border-flash/15 focus:border-jade/55 rounded-sm px-3 py-2 text-sm text-flash placeholder:text-flash/25 font-jetbrains outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-[9px] uppercase tracking-[0.22em] text-flash/35 mb-1.5">Subject</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="What's this about?"
                  className="w-full bg-black/30 border border-flash/15 focus:border-jade/55 rounded-sm px-3 py-2 text-sm text-flash placeholder:text-flash/25 font-jetbrains outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] uppercase tracking-[0.22em] text-flash/35 mb-1.5">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us everything…"
                rows={5}
                className="w-full bg-black/30 border border-flash/15 focus:border-jade/55 rounded-sm px-3 py-2 text-sm text-flash placeholder:text-flash/25 font-jetbrains outline-none transition-colors resize-y"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <span className="text-[10px] font-mono text-flash/30 tracking-[0.08em] hidden sm:block">Opens your mail app</span>
              <button
                type="submit"
                disabled={!message.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm font-jetbrains text-[11px] tracking-[0.2em] uppercase text-liquirice bg-jade hover:bg-jade/90 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_8px_24px_rgba(0,217,146,0.25)] transition-all cursor-clicker"
              >
                <Send className="w-3.5 h-3.5" />
                Send
              </button>
            </div>
          </form>
        </HudCard>
      </motion.div>

      <p className="text-[11px] text-flash/30 font-jetbrains mt-8">
        Looking for a streamer or pro profile?{" "}
        <Link to="/streamers" className="text-jade/70 hover:text-jade underline underline-offset-4 cursor-clicker">Apply here</Link>.
      </p>
    </div>
  )
}
