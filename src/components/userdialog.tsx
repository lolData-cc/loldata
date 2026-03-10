import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabaseClient"
import { useAuth } from "@/context/authcontext"
import { showCyberToast } from "@/lib/toast-utils"
import { Input } from "@/components/ui/input"
import {
  Dialog, DialogContent, DialogTrigger, DialogTitle,
} from "@/components/ui/dialog"

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
  return (
    <Dialog>
      <DialogTrigger className="cursor-clicker">
        <div className="text-flash/50 px-3 border border-flash/50 hover:bg-flash/10 rounded-sm bg-liquirice font-jetbrains py-1.5 transition-colors">
          <span className="font-jetbrains text-sm">SIGN IN</span>
        </div>
      </DialogTrigger>

      <DialogContent
        className="p-0 border-0 bg-transparent shadow-none max-w-[380px]"
      >
        <DialogTitle className="sr-only">Sign In</DialogTitle>
        <div
          className="relative overflow-hidden font-jetbrains"
          style={{
            background: "#040A0C",
            border: `1px solid color-mix(in srgb, ${ac} 20%, transparent)`,
            borderRadius: "2px",
            boxShadow: `0 0 40px ${dimGlow}, 0 8px 32px rgba(0,0,0,0.6)`,
          }}
        >
          {/* Left accent bar */}
          <div
            className="absolute left-0 top-0 bottom-0 w-[2px]"
            style={{ background: ac, boxShadow: `0 0 8px rgba(0,217,146,0.4)` }}
          />

          {/* Scanlines */}
          <div
            className="absolute inset-0 pointer-events-none z-[1]"
            style={{
              backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.02) 2px, rgba(255,255,255,0.02) 4px)",
            }}
          />

          {/* HUD corners */}
          <Corner pos="top-left" />
          <Corner pos="top-right" />
          <Corner pos="bottom-left" />
          <Corner pos="bottom-right" />

          {/* Content */}
          <div className="relative z-[5] px-6 py-6">
            {/* Tag */}
            <div
              className="flex items-center gap-2 text-[9px] tracking-[0.25em] uppercase mb-4"
              style={{ color: `color-mix(in srgb, ${ac} 40%, transparent)` }}
            >
              <span style={{ color: ac, fontSize: "7px" }}>◈</span>
              <span>::</span>
              <span
                className="px-1 py-[1px]"
                style={{
                  color: ac,
                  background: dimGlow,
                  border: `1px solid color-mix(in srgb, ${ac} 25%, transparent)`,
                  borderRadius: "1px",
                  letterSpacing: "0.2em",
                }}
              >
                AUTH
              </span>
              <span>::</span>
              <span className="flex-1 h-px" style={{ background: `linear-gradient(90deg, color-mix(in srgb, ${ac} 20%, transparent), transparent)` }} />
            </div>

            {/* Title */}
            <h2 className="font-mechano text-lg text-flash/90 flex items-center gap-2 mb-0.5">
              <span className="text-jade/50 text-xs">◈</span>
              SIGN IN
            </h2>
            <div className="w-16 h-px mb-1.5" style={{ background: `linear-gradient(90deg, ${ac}, transparent)` }} />
            <p className="text-[10px] text-flash/25 tracking-[0.05em] mb-5">
              Access your analytics dashboard
            </p>

            {/* Form */}
            <div className="space-y-4" onKeyDown={onKeyDown}>
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
                  padding: "8px 0",
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

            {/* Divider */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, transparent, color-mix(in srgb, ${ac} 12%, transparent))` }} />
              <span className="text-[9px] tracking-[0.12em] uppercase text-flash/15">or</span>
              <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, color-mix(in srgb, ${ac} 12%, transparent), transparent)` }} />
            </div>

            {/* Discord button */}
            <button
              type="button"
              onClick={loginWithDiscord}
              className="w-full cursor-pointer select-none group"
              style={{
                background: "transparent",
                border: "1px solid color-mix(in srgb, #d7d8d9 12%, transparent)",
                borderRadius: "2px",
                padding: "8px 0",
                color: "color-mix(in srgb, #d7d8d9 45%, transparent)",
                fontSize: "10px",
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
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 127.14 96.36"
                  className="w-3.5 h-3.5 fill-current text-flash/35 group-hover:text-[#5865F2] transition-colors duration-200"
                >
                  <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.15,105.15,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21a105.73,105.73,0,0,0,31.77,16.15,77.7,77.7,0,0,0,6.85-11.08,68.42,68.42,0,0,1-10.79-5.18c.91-.66,1.8-1.35,2.66-2a75.57,75.57,0,0,0,66.58,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.81,5.19,77,77,0,0,0,6.85,11.08A105.25,105.25,0,0,0,126.6,80.23C129.24,51.37,121.13,27.53,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S53.89,46,53.89,53,48.73,65.69,42.45,65.69Zm42.24,0c-6.27,0-11.43-5.7-11.43-12.71S78.41,40.23,84.69,40.23,96.12,46,96.12,53,90.95,65.69,84.69,65.69Z" />
                </svg>
                Continue with Discord
              </span>
            </button>

            {/* Sign up link */}
            <p className="text-[10px] text-flash/20 text-center mt-5">
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => navigate("/login?mode=signup")}
                className="text-jade/40 hover:text-jade/70 underline underline-offset-2 transition-colors cursor-pointer"
              >
                Create one
              </button>
            </p>
          </div>

          {/* Bottom accent line */}
          <div className="absolute bottom-0 left-0 right-0 h-[2px] z-[4]">
            <div
              className="h-full"
              style={{
                background: `linear-gradient(90deg, ${ac}, color-mix(in srgb, ${ac} 40%, transparent))`,
                width: "100%",
                boxShadow: `0 0 8px rgba(0,217,146,0.4)`,
              }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ── HUD bracket corner ── */
function Corner({ pos }: { pos: "top-left" | "top-right" | "bottom-left" | "bottom-right" }) {
  const isTop = pos.includes("top")
  const isLeft = pos.includes("left")
  return (
    <div className={`absolute w-3.5 h-3.5 z-[3] ${isTop ? "top-0" : "bottom-0"} ${isLeft ? "left-0" : "right-0"}`}>
      <div
        className={`absolute ${isTop ? "top-0" : "bottom-0"} ${isLeft ? "left-0" : "right-0"} w-full h-[2px]`}
        style={{ background: ac }}
      />
      <div
        className={`absolute ${isTop ? "top-0" : "bottom-0"} ${isLeft ? "left-0" : "right-0"} w-[2px] h-full`}
        style={{ background: ac }}
      />
    </div>
  )
}
