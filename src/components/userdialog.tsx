import { useEffect, useState, type CSSProperties } from "react"
import { useReducedMotion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabaseClient"
import { useAuth } from "@/context/authcontext"
import { showCyberToast } from "@/lib/toast-utils"
import { API_BASE_URL } from "@/config"
import { Input } from "@/components/ui/input"
import {
  Dialog, DialogContent, DialogTrigger, DialogTitle,
} from "@/components/ui/dialog"
import { Halftone } from "@/components/halftone"

/** Stagger index for the build-in: each block resolves `--i` steps after the frame. */
const row = (i: number) => ({ "--i": i } as CSSProperties)

/**
 * The title, arriving as a decode: every glyph cycles through random
 * characters and locks in left to right.
 *
 * ⚠️ Its own component, because the dialog's content is mounted on OPEN and
 * torn down on close — the hook has to live inside that lifetime so the
 * decode replays every time the window is built, and runs once per open, not
 * once per app.
 */
function DecodedTitle({ text, delay, duration = 620 }: { text: string; delay: number; duration?: number }) {
  const still = useReducedMotion()
  const [out, setOut] = useState(still ? text : "")
  useEffect(() => {
    if (still) {
      setOut(text)
      return
    }
    const glyphs = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<>/\\|_-=+*#"
    const t0 = performance.now() + delay
    let raf = 0
    const tick = () => {
      const t = performance.now() - t0
      if (t < 0) {
        raf = requestAnimationFrame(tick)
        return
      }
      const p = Math.min(1, t / duration)
      const settled = Math.floor(p * text.length)
      let next = text.slice(0, settled)
      for (let i = settled; i < text.length; i++) {
        next += text[i] === " " ? " " : glyphs[Math.floor(Math.random() * glyphs.length)]
      }
      setOut(next)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [text, delay, duration, still])
  return <>{out}</>
}

const ac = "#00d992"
const dimGlow = "rgba(0,217,146,0.08)"
const midGlow = "rgba(0,217,146,0.15)"

export function UserDialog() {
  const { session, loading } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loggingIn, setLoggingIn] = useState(false)
  const navigate = useNavigate()

  async function handleLogin() {
    if (!email || !password) {
      showCyberToast({ title: "Missing fields", description: "Enter both email and password.", tag: "ERR", variant: "error" })
      return
    }
    setLoggingIn(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoggingIn(false)
    if (error) {
      showCyberToast({ title: "Login failed", description: error.message, tag: "ERR", variant: "error" })
    } else {
      navigate("/dashboard")
    }
  }

  async function loginWithRiot() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/riot/url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch (err: any) {
      showCyberToast({ title: "Riot login failed", description: err?.message ?? "Unknown error", tag: "ERR", variant: "error" })
    }
  }

  async function loginWithDiscord() {
    const redirectTo = `${window.location.origin}/auth/callback`
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: { scopes: "identify email", redirectTo },
    })
    if (error) showCyberToast({ title: "Discord login failed", description: error.message, tag: "ERR", variant: "error" })
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") { e.preventDefault(); handleLogin() }
  }

  // Loading state
  if (loading) {
    return (
      <div className="text-flash/50 px-3 border border-flash/50 rounded-sm bg-liquirice font-jetbrains py-1.5 animate-pulse select-none text-sm">
        <span className="opacity-70">DASHBOARD</span>
      </div>
    )
  }

  // Logged in
  if (session) {
    return (
      <button
        type="button"
        className="text-flash/70 px-3 border border-flash/50 hover:bg-flash/10 rounded-sm bg-liquirice font-jetbrains py-1.5 text-sm cursor-clicker transition-colors"
        onClick={() => navigate("/dashboard")}
      >
        DASHBOARD
      </button>
    )
  }

  // Logged out — sign-in dialog
  //
  // ⚠️ The same room as /login, smaller: the same figure, the same copy and
  // the same order — one press with Riot or Discord before any typing. It is
  // the first thing a visitor opens when they decide to sign in.
  //
  // ⚠️ A CENTRED BOX WITH A WATERMARK. Not a side column, not a figure
  // standing beside the card — both were tried and both were the wrong idea.
  // The dialog is an ordinary centred panel; Viego is INSIDE it, whole,
  // behind the form, set to the right and at under half his brightness: a
  // watermark the fields sit on. No scrims, no gradients.
  //
  // ⚠️ IT DOES NOT POP IN. The window is BUILT, in the order a holographic
  // panel would be: a horizontal beam strikes at the centre; the plate opens
  // out of the beam vertically, flickering as it stabilises; the corner
  // brackets snap out; then the content resolves one block at a time behind
  // a scanning edge while the title decodes from random glyphs and the
  // figure surfaces underneath. Once built it holds still. On close the
  // plate collapses back to the beam. All of it is in
  // the `.sd-*` block of index.css; every element carries its own delay and
  // `prefers-reduced-motion` skips straight to the finished state.
  return (
    <Dialog>
      <DialogTrigger className="cursor-clicker">
        <div className="text-flash/50 px-3 border border-flash/50 hover:bg-flash/10 rounded-sm bg-liquirice font-jetbrains py-1.5 transition-colors">
          <span className="font-jetbrains text-sm">SIGN IN</span>
        </div>
      </DialogTrigger>

      <DialogContent
        className="sd-content p-0 border-0 bg-transparent shadow-none max-w-[460px] overflow-visible sm:rounded-none"
        overlayClassName="bg-[#040A0C]/70 backdrop-blur-md"
      >
        <DialogTitle className="sr-only">Sign In</DialogTitle>

        {/* the beam the window opens out of */}
        <span aria-hidden className="sd-beam" />

        {/* the four corner brackets, outside the plate */}
        <span aria-hidden className="sd-c sd-c-tl" />
        <span aria-hidden className="sd-c sd-c-tr" />
        <span aria-hidden className="sd-c sd-c-bl" />
        <span aria-hidden className="sd-c sd-c-br" />

        <div className="sd-plate relative overflow-hidden font-jetbrains">
          {/* scanline texture, static — the moving bands (edge rails, the
              glitch slices, the drifting film, the periodic scan) were cut:
              a window that keeps flashing after it is built is a window you
              cannot read. */}
          <span aria-hidden className="sd-scan" />

          {/* ── The watermark ──────────────────────────────────────────────
              Whole body, a quarter taller than the box, centred right of
              middle so he stands beside the labels rather than under them.
              The canvas paints no ground of its own (the plate has one) and
              the wrapper's opacity is the whole treatment — it fades up as
              the plate builds. */}
          <div aria-hidden className="sd-mark pointer-events-none absolute inset-0 overflow-hidden">
            <Halftone
              src="/img/desktop/login-viego.jpg"
              cols={120}
              cell={8}
              spreadX={1.55}
              black={0.3}
              gamma={2.6}
              floor={0.17}
              ground={null}
              className="absolute left-[66%] top-1/2 h-[125%] w-auto max-w-none -translate-x-1/2 -translate-y-1/2"
            />
          </div>

          {/* Content — on top of him, full width; each block builds in turn */}
          <div className="relative px-8 py-7">
            <h2 className="sd-row font-mechano text-xl text-flash/90 flex items-center gap-2 mb-1" style={row(0)}>
              <span className="text-jade/50 text-xs">◈</span>
              <DecodedTitle text="SIGN IN" delay={560} />
            </h2>
            <div className="sd-row w-16 h-px mb-2" style={{ ...row(0), background: `linear-gradient(90deg, ${ac}, transparent)` }} />
            <p className="sd-row text-[11px] text-flash/40 tracking-[0.05em] mb-5" style={row(1)}>
              Your games, your runes, your record.
            </p>

            {/* ⚠️ The one-press routes come FIRST — see the page for why. */}
            <div className="sd-row flex gap-2" style={row(2)}>
              <button
                type="button"
                onClick={loginWithDiscord}
                className="flex-1 cursor-pointer select-none group"
                style={{
                  background: "#0e1b1d",
                  border: "1px solid #27413d",
                  borderRadius: "2px",
                  padding: "12px 0",
                  color: "#e4e6e7",
                  fontSize: "11px",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#5865F2"
                  e.currentTarget.style.background = "#151d3a"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#27413d"
                  e.currentTarget.style.background = "#0e1b1d"
                }}
              >
                <span className="flex items-center justify-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 127.14 96.36" className="w-3.5 h-3.5 fill-current text-[#5865F2]">
                    <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.15,105.15,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21a105.73,105.73,0,0,0,31.77,16.15,77.7,77.7,0,0,0,6.85-11.08,68.42,68.42,0,0,1-10.79-5.18c.91-.66,1.8-1.35,2.66-2a75.57,75.57,0,0,0,66.58,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.81,5.19,77,77,0,0,0,6.85,11.08A105.25,105.25,0,0,0,126.6,80.23C129.24,51.37,121.13,27.53,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S53.89,46,53.89,53,48.73,65.69,42.45,65.69Zm42.24,0c-6.27,0-11.43-5.7-11.43-12.71S78.41,40.23,84.69,40.23,96.12,46,96.12,53,90.95,65.69,84.69,65.69Z" />
                  </svg>
                  Discord
                </span>
              </button>
              <button
                type="button"
                onClick={loginWithRiot}
                className="flex-1 cursor-pointer select-none group"
                style={{
                  background: "#0e1b1d",
                  border: "1px solid #27413d",
                  borderRadius: "2px",
                  padding: "12px 0",
                  color: "#e4e6e7",
                  fontSize: "11px",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#c8292e"
                  e.currentTarget.style.background = "#2a1416"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#27413d"
                  e.currentTarget.style.background = "#0e1b1d"
                }}
              >
                <span className="flex items-center justify-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current text-[#c8292e]">
                    <path d="M13.458.86 0 7.093l3.353 12.761 2.552-.313-.701-8.024.838-.373 1.447 8.202 4.361-.535-.775-8.857.83-.37 1.591 9.025 4.412-.542-.849-9.708.84-.374 1.74 9.87L24 17.318V3.5Zm.316 19.356.222 1.256L24 23.14v-4.18l-10.22 1.256Z" />
                  </svg>
                  Riot Games
                </span>
              </button>
            </div>

            {/* Divider */}
            <div className="sd-row flex items-center gap-3 my-4" style={row(3)}>
              <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, transparent, color-mix(in srgb, ${ac} 12%, transparent))` }} />
              <span className="text-[9px] tracking-[0.12em] uppercase text-flash/25 whitespace-nowrap">or with an email</span>
              <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, color-mix(in srgb, ${ac} 12%, transparent), transparent)` }} />
            </div>

            {/* Form */}
            <div className="space-y-3" onKeyDown={onKeyDown}>
              <div className="sd-row" style={row(4)}>
                <label className="block font-mono text-[9px] tracking-[0.15em] uppercase text-flash/25 mb-1">
                  Email
                </label>
                <Input
                  variant="underline"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="sd-row" style={row(5)}>
                <label className="block font-mono text-[9px] tracking-[0.15em] uppercase text-flash/25 mb-1">
                  Password
                </label>
                <Input
                  variant="underline"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="text-sm"
                />
              </div>

              {/* Login button */}
              <button
                type="button"
                onClick={handleLogin}
                disabled={loggingIn}
                className="sd-row w-full cursor-pointer select-none disabled:opacity-50 disabled:pointer-events-none"
                style={{
                  ...row(6),
                  background: dimGlow,
                  border: `1px solid color-mix(in srgb, ${ac} 40%, transparent)`,
                  borderRadius: "2px",
                  padding: "10px 0",
                  color: ac,
                  fontSize: "11px",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = midGlow
                  e.currentTarget.style.borderColor = ac
                  e.currentTarget.style.boxShadow = `0 0 12px ${dimGlow}`
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = dimGlow
                  e.currentTarget.style.borderColor = `color-mix(in srgb, ${ac} 40%, transparent)`
                  e.currentTarget.style.boxShadow = "none"
                }}
              >
                <span className="flex items-center justify-center gap-2">
                  <span style={{ fontSize: "7px" }}>◈</span>
                  {loggingIn ? "Authenticating..." : "Login"}
                </span>
              </button>
            </div>

            {/* Sign up link */}
            <p className="sd-row text-[10px] text-flash/30 text-center mt-4" style={row(7)}>
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => navigate("/login?mode=signup")}
                className="text-jade/60 hover:text-jade underline underline-offset-2 transition-colors cursor-pointer"
              >
                Create one
              </button>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
