import { useState } from "react"
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
  // ⚠️ This is the same room as /login, smaller. It used to be a different
  // building: an accent bar, scanlines, four HUD brackets, a ":: AUTH ::"
  // strip and a glowing bottom rule — the generic-terminal kit — with the
  // email form first and Riot/Discord last as an afterthought. It is the first
  // thing a visitor opens when they decide to sign in, so it now carries the
  // same figure, the same card, the same copy and the same order as the page:
  // one press with Riot or Discord before any typing.
  //
  // ⚠️ WIDE, with the whole figure. The first cut was a 400px column with
  // only the head as a band across the top, and it read as a tall strip with
  // a hat on. He now stands full height down the left, under the content
  // rather than above it — the form is set to the right and a scrim carries
  // him under it, so the body is seen and the text is read.
  const ground = "#050d10"
  return (
    <Dialog>
      <DialogTrigger className="cursor-clicker">
        <div className="text-flash/50 px-3 border border-flash/50 hover:bg-flash/10 rounded-sm bg-liquirice font-jetbrains py-1.5 transition-colors">
          <span className="font-jetbrains text-sm">SIGN IN</span>
        </div>
      </DialogTrigger>

      <DialogContent
        className="p-0 border-0 bg-transparent shadow-none max-w-[580px] overflow-hidden sm:rounded-[3px]"
        overlayClassName="bg-[#040A0C]/70 backdrop-blur-md"
      >
        <DialogTitle className="sr-only">Sign In</DialogTitle>
        <div
          className="relative overflow-hidden font-jetbrains"
          style={{
            background: ground,
            borderRadius: "3px",
            // lit from the inside, never outlined — the house rule
            boxShadow:
              "inset 0 1px 0 0 rgba(215,216,217,0.055), inset 0 0 60px 0 rgba(0,217,146,0.035), 0 40px 90px -30px rgba(0,0,0,0.95)",
          }}
        >
          {/* ── The figure, whole ───────────────────────────────────────────
              Same portrait, same tone as the page. Much taller than the box —
              the feet run off the bottom, the head sits under the top edge —
              and wide enough that the sword arm reaches under the form. The
              body owns the left two-fifths in full; past that the scrim takes
              him down to a texture the text sits on. */}
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <Halftone
              src="/img/desktop/login-viego.jpg"
              cols={110}
              cell={8}
              spreadX={1.55}
              black={0.3}
              gamma={2.6}
              floor={0.17}
              className="absolute left-[-5%] top-[-12%] h-[160%] w-auto max-w-none"
            />
            <span
              className="absolute inset-0"
              style={{
                // ⚠️ never fully solid: the scrim tops out at 90%, so the marks that
                // run under the form are dimmed to a texture, not erased. That is
                // the "under" — he continues behind the text at a tenth of his
                // brightness instead of ending at a line where the form begins.
                background: `linear-gradient(90deg, rgba(5,13,16,0) 0%, rgba(5,13,16,0) 28%, rgba(5,13,16,0.5) 44%, rgba(5,13,16,0.82) 58%, rgba(5,13,16,0.9) 72%, rgba(5,13,16,0.9) 100%)`,
              }}
            />
            {/* ⚠️ Under sm the form is full width and sits ON the figure, so
                the whole thing is dimmed to a glow — the phone gets legibility
                and atmosphere, the desktop gets the picture. */}
            <span className="absolute inset-0 sm:hidden" style={{ background: "rgba(5,13,16,0.66)" }} />
          </div>

          {/* Content — to the right of him */}
          <div className="relative px-7 py-7 sm:pl-[43%] sm:pr-8">
            <h2 className="font-mechano text-xl text-flash/90 flex items-center gap-2 mb-1">
              <span className="text-jade/50 text-xs">◈</span>
              SIGN IN
            </h2>
            <div className="w-16 h-px mb-2" style={{ background: `linear-gradient(90deg, ${ac}, transparent)` }} />
            <p className="text-[11px] text-flash/40 tracking-[0.05em] mb-5">
              Your games, your runes, your record.
            </p>

            {/* ⚠️ The one-press routes come FIRST — see the page for why. */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={loginWithDiscord}
                className="flex-1 cursor-pointer select-none group"
                style={{
                  background: "transparent",
                  border: "1px solid color-mix(in srgb, #d7d8d9 12%, transparent)",
                  borderRadius: "2px",
                  padding: "12px 0",
                  color: "color-mix(in srgb, #d7d8d9 78%, transparent)",
                  fontSize: "11px",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "color-mix(in srgb, #5865F2 35%, transparent)"
                  e.currentTarget.style.background = "rgba(88,101,242,0.05)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "color-mix(in srgb, #d7d8d9 12%, transparent)"
                  e.currentTarget.style.background = "transparent"
                }}
              >
                <span className="flex items-center justify-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 127.14 96.36" className="w-3.5 h-3.5 fill-current text-flash/50 group-hover:text-[#5865F2] transition-colors duration-200">
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
                  background: "transparent",
                  border: "1px solid color-mix(in srgb, #d7d8d9 12%, transparent)",
                  borderRadius: "2px",
                  padding: "12px 0",
                  color: "color-mix(in srgb, #d7d8d9 78%, transparent)",
                  fontSize: "11px",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "color-mix(in srgb, #c8292e 35%, transparent)"
                  e.currentTarget.style.background = "rgba(200,41,46,0.05)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "color-mix(in srgb, #d7d8d9 12%, transparent)"
                  e.currentTarget.style.background = "transparent"
                }}
              >
                <span className="flex items-center justify-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current text-flash/50 group-hover:text-[#c8292e] transition-colors duration-200">
                    <path d="M13.458.86 0 7.093l3.353 12.761 2.552-.313-.701-8.024.838-.373 1.447 8.202 4.361-.535-.775-8.857.83-.37 1.591 9.025 4.412-.542-.849-9.708.84-.374 1.74 9.87L24 17.318V3.5Zm.316 19.356.222 1.256L24 23.14v-4.18l-10.22 1.256Z" />
                  </svg>
                  Riot Games
                </span>
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, transparent, color-mix(in srgb, ${ac} 12%, transparent))` }} />
              <span className="text-[9px] tracking-[0.12em] uppercase text-flash/25 whitespace-nowrap">or with an email</span>
              <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, color-mix(in srgb, ${ac} 12%, transparent), transparent)` }} />
            </div>

            {/* Form */}
            <div className="space-y-3" onKeyDown={onKeyDown}>
              <div>
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
              <div>
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
                className="w-full cursor-pointer select-none disabled:opacity-50 disabled:pointer-events-none"
                style={{
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
            <p className="text-[10px] text-flash/30 text-center mt-4">
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
