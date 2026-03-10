import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Link } from "react-router-dom"
import { Navbar } from "@/components/navbar"
import { supabase } from "@/lib/supabaseClient"
import { Input } from "@/components/ui/input"
import { showCyberToast } from "@/lib/toast-utils"
import { SITE_URL } from "@/config"
import {
  Dialog, DialogContent, DialogTitle,
} from "@/components/ui/dialog"

type Mode = "signin" | "signup"

/* ── floating particle config ── */
function useParticles(count: number) {
  return useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      char: Math.random() > 0.5 ? "◈" : "◆",
      left: `${Math.random() * 100}%`,
      size: `${6 + Math.random() * 6}px`,
      duration: `${14 + Math.random() * 18}s`,
      delay: `${Math.random() * 12}s`,
      opacity: 0.08 + Math.random() * 0.12,
    }))
  }, [count])
}

export default function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const particles = useParticles(12)

  const [mode, setMode] = useState<Mode>(
    searchParams.get("mode") === "signup" ? "signup" : "signin"
  )
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [discordLoading, setDiscordLoading] = useState(false)
  const [phase, setPhase] = useState<"hidden" | "glitch" | "visible">("hidden")
  const [transitioning, setTransitioning] = useState(false)

  // OTP verification state
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""])
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])
  const otpDialogOpen = pendingEmail !== null

  // Glitch-in entrance
  useEffect(() => {
    const t1 = setTimeout(() => setPhase("glitch"), 60)
    const t2 = setTimeout(() => setPhase("visible"), 500)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  // Smooth mode switch
  function switchMode(next: Mode) {
    if (next === mode || transitioning) return
    setTransitioning(true)
    // After fade-out, swap mode and fade-in
    setTimeout(() => {
      setMode(next)
      setEmail("")
      setPassword("")
      setConfirmPassword("")
      // Small delay before fade-in
      requestAnimationFrame(() => setTransitioning(false))
    }, 200)
  }

  // Email/password login
  async function handleLogin() {
    if (!email || !password) {
      showCyberToast({ title: "Missing fields", description: "Please enter both email and password.", tag: "ERR", variant: "error" })
      return
    }
    setSubmitting(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setSubmitting(false)
    if (error) {
      showCyberToast({ title: "Login failed", description: error.message, tag: "ERR", variant: "error" })
    } else {
      navigate("/dashboard")
    }
  }

  // Email/password sign up
  async function handleSignUp() {
    if (!email || !password || !confirmPassword) {
      showCyberToast({ title: "Missing fields", description: "Please fill in all fields.", tag: "ERR", variant: "error" })
      return
    }
    if (password !== confirmPassword) {
      showCyberToast({ title: "Passwords don't match", description: "Make sure both password fields are identical.", tag: "ERR", variant: "error" })
      return
    }
    if (password.length < 6) {
      showCyberToast({ title: "Password too short", description: "Password must be at least 6 characters.", tag: "ERR", variant: "error" })
      return
    }
    setSubmitting(true)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${SITE_URL}/auth/callback` },
    })
    setSubmitting(false)
    if (error) {
      showCyberToast({ title: "Sign up failed", description: error.message, tag: "ERR", variant: "error" })
    } else if (data.user && data.user.identities && data.user.identities.length === 0) {
      // Supabase returns success but empty identities when email already exists (prevents enumeration)
      showCyberToast({ title: "Account already exists", description: "An account with this email already exists. Try signing in instead.", tag: "ERR", variant: "error" })
    } else if (data.session) {
      // Auto-confirmed (email confirmation disabled in Supabase) — go straight to dashboard
      showCyberToast({ title: "Account created", description: "Welcome to loldata!", tag: "OK", variant: "status" })
      navigate("/dashboard")
    } else {
      // Email confirmation required — open OTP dialog
      setPendingEmail(email)
      setOtp(["", "", "", "", "", ""])
      showCyberToast({ title: "Code sent", description: "Check your email for the 6-digit verification code.", tag: "OK", variant: "status" })
    }
  }

  // OTP verification
  async function handleVerifyOtp() {
    const code = otp.join("")
    if (code.length !== 6) {
      showCyberToast({ title: "Incomplete code", description: "Please enter all 6 digits.", tag: "ERR", variant: "error" })
      return
    }
    if (!pendingEmail) return
    setVerifying(true)
    const { error } = await supabase.auth.verifyOtp({
      email: pendingEmail,
      token: code,
      type: "signup",
    })
    setVerifying(false)
    if (error) {
      showCyberToast({ title: "Verification failed", description: error.message, tag: "ERR", variant: "error" })
      // Clear the OTP inputs so they can try again
      setOtp(["", "", "", "", "", ""])
      otpRefs.current[0]?.focus()
    } else {
      showCyberToast({ title: "Account verified", description: "Welcome to loldata!", tag: "OK", variant: "status" })
      setPendingEmail(null)
      navigate("/dashboard")
    }
  }

  // Resend OTP code
  async function handleResendCode() {
    if (!pendingEmail || resending) return
    setResending(true)
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: pendingEmail,
      options: { emailRedirectTo: `${SITE_URL}/auth/callback` },
    })
    setResending(false)
    if (error) {
      showCyberToast({ title: "Resend failed", description: error.message, tag: "ERR", variant: "error" })
    } else {
      showCyberToast({ title: "Code resent", description: "Check your email for a new verification code.", tag: "OK", variant: "status" })
      setOtp(["", "", "", "", "", ""])
      otpRefs.current[0]?.focus()
    }
  }

  // OTP input handlers
  function handleOtpChange(index: number, value: string) {
    // Only accept digits
    const digit = value.replace(/\D/g, "").slice(-1)
    const next = [...otp]
    next[index] = digit
    setOtp(next)
    // Auto-advance to next input
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      // Move back on backspace when current is empty
      otpRefs.current[index - 1]?.focus()
    }
    if (e.key === "Enter") {
      e.preventDefault()
      handleVerifyOtp()
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (!pasted) return
    const next = [...otp]
    for (let i = 0; i < 6; i++) {
      next[i] = pasted[i] || ""
    }
    setOtp(next)
    // Focus the last filled input or the next empty one
    const focusIdx = Math.min(pasted.length, 5)
    otpRefs.current[focusIdx]?.focus()
  }

  // Discord OAuth
  const loginWithDiscord = useCallback(async () => {
    if (discordLoading) return
    setDiscordLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: { scopes: "identify email", redirectTo: `${SITE_URL}/auth/callback` },
    })
    if (error) {
      showCyberToast({ title: "Discord login failed", description: error.message, tag: "ERR", variant: "error" })
      setDiscordLoading(false)
    }
  }, [discordLoading])

  // Enter key submits
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault()
      mode === "signin" ? handleLogin() : handleSignUp()
    }
  }

  const ac = "#00d992"
  const dimGlow = "rgba(0,217,146,0.08)"
  const midGlow = "rgba(0,217,146,0.15)"

  const isSignIn = mode === "signin"

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-liquirice font-jetbrains">
      {/* ── Navbar ── */}
      <div className="relative z-20 w-full bg-liquirice/60">
        <div className="w-[65%] mx-auto">
          <Navbar />
        </div>
      </div>

      {/* ── Background layers ── */}

      {/* Grid */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(0,217,146,0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0,217,146,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
        }}
      />

      {/* Scanlines */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.015) 2px, rgba(255,255,255,0.015) 4px)",
        }}
      />

      {/* Crosshair — center */}
      <div className="absolute inset-0 pointer-events-none z-[1] flex items-center justify-center">
        {/* Horizontal */}
        <div className="absolute w-[min(600px,90vw)] h-px" style={{ background: `linear-gradient(90deg, transparent, rgba(0,217,146,0.06), transparent)` }} />
        {/* Vertical */}
        <div className="absolute h-[min(600px,90vh)] w-px" style={{ background: `linear-gradient(180deg, transparent, rgba(0,217,146,0.06), transparent)` }} />
        {/* Tick marks */}
        {[-120, -60, 60, 120].map((offset) => (
          <div key={`h${offset}`} className="absolute w-[12px] h-px" style={{ background: "rgba(0,217,146,0.1)", transform: `translateX(${offset}px)` }} />
        ))}
        {[-120, -60, 60, 120].map((offset) => (
          <div key={`v${offset}`} className="absolute w-px h-[12px]" style={{ background: "rgba(0,217,146,0.1)", transform: `translateY(${offset}px)` }} />
        ))}
      </div>

      {/* Rotating rings */}
      <div className="absolute inset-0 pointer-events-none z-[1] flex items-center justify-center">
        {/* Outer ring */}
        <div
          className="absolute rounded-full"
          style={{
            width: "min(700px, 95vw)",
            height: "min(700px, 95vw)",
            border: "1px solid rgba(0,217,146,0.04)",
            animation: "login-spin 60s linear infinite",
          }}
        >
          {/* Ring markers */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 text-jade/10 text-[6px] select-none">◈</div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 text-jade/10 text-[6px] select-none">◆</div>
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 text-jade/10 text-[6px] select-none">◈</div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 text-jade/10 text-[6px] select-none">◆</div>
        </div>
        {/* Inner ring */}
        <div
          className="absolute rounded-full"
          style={{
            width: "min(500px, 70vw)",
            height: "min(500px, 70vw)",
            border: "1px dashed rgba(0,217,146,0.03)",
            animation: "login-spin 45s linear infinite reverse",
          }}
        />
        {/* Smallest ring */}
        <div
          className="absolute rounded-full"
          style={{
            width: "min(300px, 45vw)",
            height: "min(300px, 45vw)",
            border: "1px solid rgba(0,217,146,0.02)",
            animation: "login-spin 90s linear infinite",
          }}
        />
      </div>

      {/* Corner HUD decorations */}
      {/* Top-left */}
      <div className="absolute top-20 left-8 pointer-events-none z-[1] font-mono text-[8px] tracking-[0.3em] text-jade/8 select-none hidden md:block">
        <div>:: SYS_AUTH ::</div>
        <div className="mt-1 w-16 h-px" style={{ background: "linear-gradient(90deg, rgba(0,217,146,0.08), transparent)" }} />
        <div className="mt-1 text-flash/6">PROTOCOL v4.2</div>
      </div>
      {/* Top-right */}
      <div className="absolute top-20 right-8 pointer-events-none z-[1] font-mono text-[8px] tracking-[0.3em] text-jade/8 text-right select-none hidden md:block">
        <div>◈ SECURE</div>
        <div className="mt-1 w-16 h-px ml-auto" style={{ background: "linear-gradient(90deg, transparent, rgba(0,217,146,0.08))" }} />
        <div className="mt-1 text-flash/6">ENCRYPTED</div>
      </div>
      {/* Bottom-left */}
      <div className="absolute bottom-8 left-8 pointer-events-none z-[1] font-mono text-[7px] tracking-[0.2em] text-flash/5 select-none hidden md:block">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-jade/10" style={{ animation: "login-pulse 3s ease-in-out infinite" }} />
          SYSTEM ONLINE
        </div>
      </div>
      {/* Bottom-right */}
      <div className="absolute bottom-8 right-8 pointer-events-none z-[1] font-mono text-[7px] tracking-[0.2em] text-flash/5 select-none hidden md:block">
        LOLDATA.CC
      </div>

      {/* Radial vignette (on top of everything bg) */}
      <div
        className="absolute inset-0 pointer-events-none z-[2]"
        style={{
          background: "radial-gradient(ellipse at center, transparent 20%, rgba(4,10,12,0.8) 100%)",
        }}
      />

      {/* Floating particles */}
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute bottom-0 pointer-events-none z-[3] select-none"
          style={{
            left: p.left,
            fontSize: p.size,
            color: ac,
            opacity: p.opacity,
            animation: `heroFloat ${p.duration} linear ${p.delay} infinite`,
          }}
        >
          {p.char}
        </span>
      ))}

      {/* ── Centered card ── */}
      <div className="absolute inset-0 z-[10] flex items-center justify-center px-4">
        <div
          style={{
            opacity: phase === "hidden" ? 0 : 1,
            transform:
              phase === "hidden"
                ? "scaleY(0.7) skew(3deg, 3deg) translateY(-20px)"
                : phase === "glitch"
                  ? "scaleY(1.02) skew(-0.5deg, -0.5deg) translateY(2px)"
                  : "scaleY(1) skew(0deg, 0deg) translateY(0)",
            filter:
              phase === "hidden"
                ? "brightness(0.4) contrast(2.5)"
                : phase === "glitch"
                  ? "brightness(1.2) contrast(1.4)"
                  : "brightness(1) contrast(1)",
            transition:
              phase === "hidden"
                ? "none"
                : phase === "glitch"
                  ? "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
                  : "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <div
            className="relative overflow-hidden w-full max-w-md"
            style={{
              background: "#040A0C",
              border: `1px solid color-mix(in srgb, ${ac} 20%, transparent)`,
              borderRadius: "2px",
              boxShadow: `0 0 40px ${dimGlow}, 0 8px 32px rgba(0,0,0,0.5)`,
            }}
          >
            {/* Left accent bar */}
            <div
              className="absolute left-0 top-0 bottom-0 w-[2px]"
              style={{ background: ac, boxShadow: `0 0 8px rgba(0,217,146,0.4), 0 0 20px ${dimGlow}` }}
            />

            {/* Scanlines overlay */}
            <div
              className="absolute inset-0 pointer-events-none z-[1]"
              style={{
                backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.02) 2px, rgba(255,255,255,0.02) 4px)",
              }}
            />

            {/* HUD bracket corners */}
            <Corner pos="top-left" color={ac} />
            <Corner pos="top-right" color={ac} />
            <Corner pos="bottom-left" color={ac} />
            <Corner pos="bottom-right" color={ac} />

            {/* ── Content ── */}
            <div className="relative z-[5] px-8 py-8">
              {/* Tag line */}
              <div
                className="flex items-center gap-2 text-[10px] tracking-[0.25em] uppercase mb-5"
                style={{ color: `color-mix(in srgb, ${ac} 40%, transparent)` }}
              >
                <span style={{ color: ac, fontSize: "8px" }}>◈</span>
                <span>::</span>
                <span
                  className="px-1.5 py-[1px]"
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
                <span
                  className="flex-1 h-px"
                  style={{ background: `linear-gradient(90deg, color-mix(in srgb, ${ac} 20%, transparent), transparent)` }}
                />
                <span style={{ fontSize: "8px", color: `color-mix(in srgb, ${ac} 25%, transparent)` }}>◆</span>
              </div>

              {/* Mode toggle tabs */}
              <div className="flex items-center gap-1 mb-5">
                <button
                  type="button"
                  onClick={() => switchMode("signin")}
                  className="cursor-pointer select-none transition-all duration-200"
                  style={{
                    padding: "5px 14px",
                    fontSize: "11px",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    borderRadius: "2px",
                    border: `1px solid ${isSignIn ? `color-mix(in srgb, ${ac} 30%, transparent)` : "transparent"}`,
                    background: isSignIn ? dimGlow : "transparent",
                    color: isSignIn ? ac : "color-mix(in srgb, #d7d8d9 30%, transparent)",
                  }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className="cursor-pointer select-none transition-all duration-200"
                  style={{
                    padding: "5px 14px",
                    fontSize: "11px",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    borderRadius: "2px",
                    border: `1px solid ${!isSignIn ? `color-mix(in srgb, ${ac} 30%, transparent)` : "transparent"}`,
                    background: !isSignIn ? dimGlow : "transparent",
                    color: !isSignIn ? ac : "color-mix(in srgb, #d7d8d9 30%, transparent)",
                  }}
                >
                  Sign Up
                </button>
                <div
                  className="flex-1 h-px ml-2"
                  style={{ background: `linear-gradient(90deg, color-mix(in srgb, ${ac} 15%, transparent), transparent)` }}
                />
              </div>

              {/* Animated form wrapper */}
              <div
                style={{
                  opacity: transitioning ? 0 : 1,
                  transform: transitioning ? "translateY(8px)" : "translateY(0)",
                  transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              >
                {/* Title */}
                <h1 className="font-mechano text-2xl text-flash/90 flex items-center gap-3 mb-1">
                  <span className="text-jade/50 text-sm">◈</span>
                  {isSignIn ? "SIGN IN" : "SIGN UP"}
                </h1>
                <div
                  className="w-24 h-px mb-2"
                  style={{ background: `linear-gradient(90deg, ${ac}, transparent)` }}
                />
                <p className="text-[11px] text-flash/30 tracking-[0.05em] mb-7">
                  {isSignIn ? "Access your analytics dashboard" : "Create your loldata account"}
                </p>

                {/* Form */}
                <div className="space-y-5" onKeyDown={onKeyDown}>
                  <div>
                    <label className="block font-mono text-[10px] tracking-[0.15em] uppercase text-flash/30 mb-1.5">
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
                    <label className="block font-mono text-[10px] tracking-[0.15em] uppercase text-flash/30 mb-1.5">
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

                  {/* Confirm password — sign up only */}
                  {!isSignIn && (
                    <div>
                      <label className="block font-mono text-[10px] tracking-[0.15em] uppercase text-flash/30 mb-1.5">
                        Confirm Password
                      </label>
                      <Input
                        variant="underline"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  )}

                  {/* Submit button */}
                  <button
                    type="button"
                    onClick={isSignIn ? handleLogin : handleSignUp}
                    disabled={submitting}
                    className="w-full cursor-pointer select-none disabled:opacity-50 disabled:pointer-events-none"
                    style={{
                      background: dimGlow,
                      border: `1px solid color-mix(in srgb, ${ac} 40%, transparent)`,
                      borderRadius: "2px",
                      padding: "10px 0",
                      color: ac,
                      fontSize: "12px",
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = midGlow
                      e.currentTarget.style.borderColor = ac
                      e.currentTarget.style.boxShadow = `0 0 16px ${dimGlow}, 0 0 6px ${dimGlow}`
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = dimGlow
                      e.currentTarget.style.borderColor = `color-mix(in srgb, ${ac} 40%, transparent)`
                      e.currentTarget.style.boxShadow = "none"
                    }}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <span style={{ fontSize: "8px" }}>◈</span>
                      {submitting
                        ? (isSignIn ? "Authenticating..." : "Creating account...")
                        : (isSignIn ? "Login" : "Create Account")
                      }
                    </span>
                  </button>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3 my-6">
                  <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, transparent, color-mix(in srgb, ${ac} 15%, transparent))` }} />
                  <span className="text-[10px] tracking-[0.15em] uppercase text-flash/20">or continue with</span>
                  <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, color-mix(in srgb, ${ac} 15%, transparent), transparent)` }} />
                </div>

                {/* Discord button */}
                <button
                  type="button"
                  onClick={loginWithDiscord}
                  disabled={discordLoading}
                  className="w-full cursor-pointer select-none group disabled:opacity-50 disabled:pointer-events-none"
                  style={{
                    background: "transparent",
                    border: "1px solid color-mix(in srgb, #d7d8d9 15%, transparent)",
                    borderRadius: "2px",
                    padding: "10px 0",
                    color: "color-mix(in srgb, #d7d8d9 50%, transparent)",
                    fontSize: "11px",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "color-mix(in srgb, #5865F2 40%, transparent)"
                    e.currentTarget.style.background = "rgba(88,101,242,0.06)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "color-mix(in srgb, #d7d8d9 15%, transparent)"
                    e.currentTarget.style.background = "transparent"
                  }}
                >
                  <span className="flex items-center justify-center gap-2.5">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 127.14 96.36"
                      className="w-4 h-4 fill-current text-flash/40 group-hover:text-[#5865F2] transition-colors duration-200"
                    >
                      <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.15,105.15,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21a105.73,105.73,0,0,0,31.77,16.15,77.7,77.7,0,0,0,6.85-11.08,68.42,68.42,0,0,1-10.79-5.18c.91-.66,1.8-1.35,2.66-2a75.57,75.57,0,0,0,66.58,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.81,5.19,77,77,0,0,0,6.85,11.08A105.25,105.25,0,0,0,126.6,80.23C129.24,51.37,121.13,27.53,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S53.89,46,53.89,53,48.73,65.69,42.45,65.69Zm42.24,0c-6.27,0-11.43-5.7-11.43-12.71S78.41,40.23,84.69,40.23,96.12,46,96.12,53,90.95,65.69,84.69,65.69Z" />
                    </svg>
                    {discordLoading ? "Redirecting..." : "Continue with Discord"}
                  </span>
                </button>

                {/* Terms footer */}
                <p className="text-[10px] text-flash/20 text-center mt-6 leading-relaxed">
                  By {isSignIn ? "signing in" : "creating an account"}, you agree to our{" "}
                  <Link to="/terms" className="text-jade/40 hover:text-jade/70 underline underline-offset-2 transition-colors">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link to="/privacy" className="text-jade/40 hover:text-jade/70 underline underline-offset-2 transition-colors">
                    Privacy Policy
                  </Link>
                </p>
              </div>
            </div>

            {/* Bottom accent line */}
            <div className="absolute bottom-0 left-0 right-0 h-[2px] z-[4]">
              <div
                className="h-full"
                style={{
                  background: `linear-gradient(90deg, ${ac}, color-mix(in srgb, ${ac} 40%, transparent))`,
                  animation: "login-line 1s cubic-bezier(0.16, 1, 0.3, 1) forwards",
                  animationDelay: "0.3s",
                  width: "0%",
                  boxShadow: `0 0 8px rgba(0,217,146,0.4)`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── OTP Verification Dialog ── */}
      <Dialog open={otpDialogOpen} onOpenChange={(open) => { if (!open) setPendingEmail(null) }}>
        <DialogContent
          className="p-0 border-0 bg-transparent shadow-none max-w-[420px]"
        >
          <DialogTitle className="sr-only">Verify Email</DialogTitle>
          <div
            className="relative overflow-hidden font-jetbrains"
            style={{
              background: "#040A0C",
              border: `1px solid color-mix(in srgb, ${ac} 25%, transparent)`,
              borderRadius: "2px",
              boxShadow: `0 0 60px ${dimGlow}, 0 0 120px rgba(0,217,146,0.04), 0 8px 32px rgba(0,0,0,0.6)`,
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
            <Corner pos="top-left" color={ac} />
            <Corner pos="top-right" color={ac} />
            <Corner pos="bottom-left" color={ac} />
            <Corner pos="bottom-right" color={ac} />

            {/* Content */}
            <div className="relative z-[5] px-8 py-8">
              {/* Tag */}
              <div
                className="flex items-center gap-2 text-[10px] tracking-[0.25em] uppercase mb-5"
                style={{ color: `color-mix(in srgb, ${ac} 40%, transparent)` }}
              >
                <span style={{ color: ac, fontSize: "8px" }}>◈</span>
                <span>::</span>
                <span
                  className="px-1.5 py-[1px]"
                  style={{
                    color: ac,
                    background: dimGlow,
                    border: `1px solid color-mix(in srgb, ${ac} 25%, transparent)`,
                    borderRadius: "1px",
                    letterSpacing: "0.2em",
                  }}
                >
                  VERIFY
                </span>
                <span>::</span>
                <span
                  className="flex-1 h-px"
                  style={{ background: `linear-gradient(90deg, color-mix(in srgb, ${ac} 20%, transparent), transparent)` }}
                />
                <span style={{ fontSize: "8px", color: `color-mix(in srgb, ${ac} 25%, transparent)` }}>◆</span>
              </div>

              {/* Title */}
              <h2 className="font-mechano text-xl text-flash/90 flex items-center gap-3 mb-1">
                <span className="text-jade/50 text-sm">◈</span>
                VERIFY EMAIL
              </h2>
              <div
                className="w-20 h-px mb-2"
                style={{ background: `linear-gradient(90deg, ${ac}, transparent)` }}
              />
              <p className="text-[11px] text-flash/30 tracking-[0.05em] mb-2">
                Enter the 6-digit code sent to
              </p>
              <p className="text-[12px] text-jade/60 tracking-[0.05em] mb-7 font-mono">
                {pendingEmail}
              </p>

              {/* OTP Inputs */}
              <div className="flex justify-center gap-3 mb-7" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    autoFocus={i === 0}
                    className="w-11 h-13 text-center text-xl font-mechano outline-none transition-all duration-200"
                    style={{
                      background: digit ? dimGlow : "rgba(255,255,255,0.02)",
                      border: `1px solid ${digit ? `color-mix(in srgb, ${ac} 50%, transparent)` : "color-mix(in srgb, #d7d8d9 10%, transparent)"}`,
                      borderRadius: "2px",
                      color: ac,
                      caretColor: ac,
                      boxShadow: digit ? `0 0 12px ${dimGlow}` : "none",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = `color-mix(in srgb, ${ac} 60%, transparent)`
                      e.currentTarget.style.boxShadow = `0 0 12px ${dimGlow}`
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = digit ? `color-mix(in srgb, ${ac} 50%, transparent)` : "color-mix(in srgb, #d7d8d9 10%, transparent)"
                      e.currentTarget.style.boxShadow = digit ? `0 0 12px ${dimGlow}` : "none"
                    }}
                  />
                ))}
              </div>

              {/* Verify button */}
              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={verifying || otp.join("").length !== 6}
                className="w-full cursor-pointer select-none disabled:opacity-40 disabled:pointer-events-none"
                style={{
                  background: dimGlow,
                  border: `1px solid color-mix(in srgb, ${ac} 40%, transparent)`,
                  borderRadius: "2px",
                  padding: "10px 0",
                  color: ac,
                  fontSize: "12px",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  if (!verifying && otp.join("").length === 6) {
                    e.currentTarget.style.background = midGlow
                    e.currentTarget.style.borderColor = ac
                    e.currentTarget.style.boxShadow = `0 0 16px ${dimGlow}, 0 0 6px ${dimGlow}`
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = dimGlow
                  e.currentTarget.style.borderColor = `color-mix(in srgb, ${ac} 40%, transparent)`
                  e.currentTarget.style.boxShadow = "none"
                }}
              >
                <span className="flex items-center justify-center gap-2">
                  <span style={{ fontSize: "8px" }}>◈</span>
                  {verifying ? "Verifying..." : "Verify Code"}
                </span>
              </button>

              {/* Resend + cancel links */}
              <div className="flex items-center justify-between mt-5">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resending}
                  className="text-[10px] text-flash/20 hover:text-jade/50 transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                >
                  {resending ? "Sending..." : "Resend code"}
                </button>
                <button
                  type="button"
                  onClick={() => setPendingEmail(null)}
                  className="text-[10px] text-flash/20 hover:text-flash/50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* Bottom accent line */}
            <div className="absolute bottom-0 left-0 right-0 h-[2px] z-[4]">
              <div
                className="h-full w-full"
                style={{
                  background: `linear-gradient(90deg, ${ac}, color-mix(in srgb, ${ac} 40%, transparent))`,
                  boxShadow: `0 0 8px rgba(0,217,146,0.4)`,
                }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <style>{`
        @keyframes login-line {
          to { width: 100%; }
        }
        @keyframes login-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes login-pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}

/* ── HUD bracket corner ── */
function Corner({ pos, color }: { pos: "top-left" | "top-right" | "bottom-left" | "bottom-right"; color: string }) {
  const isTop = pos.includes("top")
  const isLeft = pos.includes("left")
  return (
    <div
      className={`absolute w-4 h-4 z-[3] ${isTop ? "top-0" : "bottom-0"} ${isLeft ? "left-0" : "right-0"}`}
    >
      <div
        className={`absolute ${isTop ? "top-0" : "bottom-0"} ${isLeft ? "left-0" : "right-0"} w-full h-[2px]`}
        style={{ background: color }}
      />
      <div
        className={`absolute ${isTop ? "top-0" : "bottom-0"} ${isLeft ? "left-0" : "right-0"} w-[2px] h-full`}
        style={{ background: color }}
      />
    </div>
  )
}
