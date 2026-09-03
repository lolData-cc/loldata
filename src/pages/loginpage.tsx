import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Link } from "react-router-dom"
import { Navbar } from "@/components/navbar"
import { Halftone } from "@/components/halftone"
import { supabase } from "@/lib/supabaseClient"
import { Input } from "@/components/ui/input"
import { showCyberToast } from "@/lib/toast-utils"
import { SITE_URL, API_BASE_URL } from "@/config"
import { redirectFromUrl, stashRedirect } from "@/lib/authRedirect"
import { stashDesktopLogin } from "@/lib/desktopHandoff"
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
  const [riotLoading, setRiotLoading] = useState(false)
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
      navigate(redirectFromUrl())
    }
  }

  /**
   * Ask for a recovery email.
   *
   * ⚠️ This did not exist. There was no resetPasswordForEmail anywhere in the
   * product, so an account created with an email and a password had no way back
   * in at all — the only recovery was the owner editing the database.
   *
   * ⚠️ It always reports success. Telling an anonymous visitor whether an
   * address has an account here is an account-enumeration oracle, and the reply
   * is the same either way.
   */
  async function handleForgot() {
    if (!email) {
      showCyberToast({ title: "Your email first", description: "Type the address you signed up with.", tag: "ERR", variant: "error" })
      return
    }
    setSubmitting(true)
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })
    setSubmitting(false)
    showCyberToast({
      title: "Check your email",
      description: "If that address has an account, a recovery link is on its way.",
      tag: "OK",
      variant: "status",
    })
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
      navigate(redirectFromUrl())
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
      navigate(redirectFromUrl())
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
    stashRedirect() // remember the desired route across the OAuth round-trip
    stashDesktopLogin() // …and that this login came from the desktop app
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: { scopes: "identify email", redirectTo: `${SITE_URL}/auth/callback` },
    })
    if (error) {
      showCyberToast({ title: "Discord login failed", description: error.message, tag: "ERR", variant: "error" })
      setDiscordLoading(false)
    }
  }, [discordLoading])

  // Riot RSO
  const loginWithRiot = useCallback(async () => {
    if (riotLoading) return
    setRiotLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/riot/url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch (err: any) {
      showCyberToast({ title: "Riot login failed", description: err?.message ?? "Unknown error", tag: "ERR", variant: "error" })
      setRiotLoading(false)
    }
  }, [riotLoading])

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

      {/* ── The subject ───────────────────────────────────────────────────
          ⚠️ This page had NO League in it at all: a grid, scanlines, a
          crosshair and floating characters — the visual language of a generic
          terminal, on the one page where somebody decides whether this product
          is for them. It now carries a champion, struck out in the same
          cross-halftone as the download page's hero: the one piece of
          atmosphere this site actually owns.

          ⚠️ A DIFFERENT champion from the download page, deliberately — two
          pages wearing the same face would read as one template rather than
          two rooms in the same building.

          ⚠️ And a PORTRAIT source (Riot's loading crop), not the wide splash.
          The splash is a scene: the figure is small in it, the halftone's
          radial dissolve eats exactly the outer band the face sits in, and
          every crop of it resolved into an unreadable middle. Cropped to the
          character, the dissolve does what it is for — the figure comes out of
          the black and goes back into it.

          It stands on the LEFT with the card on the right, so on a wide screen
          the face is looked at and the form is used, instead of the form
          floating in the middle of nothing. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <Halftone
          src="/img/desktop/login-viego.jpg"
          // ⚠️ Fewer columns than the download hero: the field is stretched
          // to the element, and 150 across this strip put the marks twice as
          // close as Jhin's. Not too few either — under ~100 the face stops
          // resolving and he is an abstract.
          cols={120}
          cell={8}
          // tall crop, so the sides have to die too — see the prop's note
          spreadX={1.55}
          // ⚠️ And the tone pushed hard. Coarsening the grid did NOT cure the
          // contour-map look; this did. Viego is painted in fog, and at the
          // hero's defaults every wisp of it earned a mark. The shadows and
          // the mids now fall to black and only the figure is left: face,
          // hair, blade, the flat shapes the treatment wants. Both versions
          // were looked at side by side; this one was chosen.
          black={0.3}
          gamma={2.6}
          floor={0.17}
          // ⚠️ FOREGROUND, not backdrop. At page height the figure was a
          // small thing in the left third with a lane of dead black between it
          // and the card, and the page read as empty. It now stands a
          // half-again taller than the viewport, head clear of the navbar, the
          // rest running off the bottom, and reaches all the way to the card —
          // which is glass, so the last of him shows through its edge.
          // ⚠️ Six points LEFT of the navbar's column edge (11.5% at xl, where
          // the column starts at 17.5%). Flush with the column he sat too
          // central — the eye had him and the card as one centred block —
          // and a hand's width to the left puts him in the margin the way a
          // figure stands beside a page rather than in it. Still not off the
          // screen: the visible mass is the middle ~60% of the canvas, so it
          // begins about where the logo does.
          className="absolute left-1/2 top-[-4%] h-[126%] w-auto max-w-none -translate-x-1/2 lg:left-[3%] lg:top-[-9%] lg:h-[165%] lg:translate-x-0 xl:left-[11.5%] xl:h-[148%] 2xl:h-[165%] min-[2560px]:left-[16.5%]"
          // ⚠️ xl:h-[148%] — a step DOWN at xl, then back up at 2xl. The
          // column is 65% of the viewport: at 1440 that is 936px, and a 165%
          // figure (817px wide) plus a 440px card cannot share it — the face
          // went under the heading. At 1536+ the column is wide enough for
          // both, and he gets his full height back.
        />
        {/* The ground closes back over it from the right, so the card is read
            against black rather than against a face. Contained: it reaches zero
            inside its own box. */}
        <span
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(4,10,12,0.22) 0%, rgba(4,10,12,0.04) 22%, rgba(4,10,12,0.42) 48%, rgba(4,10,12,0.86) 60%, #040A0C 70%)",
          }}
        />
        {/* ⚠️ and from the TOP, because the navbar is translucent and blurred:
            live dots underneath it get smeared into a grey band whose bottom
            edge is a visible horizontal line across the page. The field has to
            reach the navbar already dead. Fixed pixels, not a percentage — the
            navbar is a fixed height whatever the viewport is. */}
        <span
          className="absolute inset-x-0 top-0 h-[124px]"
          style={{ background: "linear-gradient(180deg, #040A0C 0%, rgba(4,10,12,0.86) 42%, rgba(4,10,12,0) 100%)" }}
        />
        {/* and from the bottom, where the type sits on small screens */}
        <span
          className="absolute inset-x-0 bottom-0 h-1/2 lg:hidden"
          style={{ background: "linear-gradient(180deg, rgba(4,10,12,0) 0%, rgba(4,10,12,0.88) 60%, #040A0C 100%)" }}
        />
      </div>

      {/* ── Centered card ── */}
      {/* ⚠️ The card sits in the NAVBAR'S column — the same 17.5%-a-side inset
          the bar uses at xl (22.5% past 2560px) plus the bar's own px-4 — so
          its right edge lands under the SIGN IN button instead of 10% in from
          wherever the viewport ends. Pinned to the viewport it overshot the
          column on every width and left a lane of black between it and the
          figure. Inside the column, the figure's left edge is the logo's and
          the card's right edge is the button's, and the space between them is
          the composition rather than what was left over. */}
      <div className="absolute inset-0 z-[10] flex items-center justify-center px-4 lg:justify-end xl:px-[calc(17.5%+1rem)] min-[2560px]:px-[calc(22.5%+1rem)]">
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
              // ⚠️ FROSTED, not clear. The first pass was 2% white over a 2px
              // blur — a card you could see straight through, which looked right
              // at 1920 where nothing sat behind it and fell apart everywhere
              // else: at 1440 the figure's face lands under the heading, on a
              // phone the whole figure is behind the form, and white text over
              // bright marks is unreadable. The card now protects its own text
              // wherever it lands — dark ground, a real blur so what shows
              // through is a glow rather than marks — and still belongs to the
              // picture rather than sitting on it. Lit from the inside, never
              // outlined: the house rule, and the reason the old jade box read
              // as a terminal window.
              // 78%, not 62%: the blur is not guaranteed (some engines skip
              // backdrop-filter), and without it 62% still let white marks
              // through under the subtitle on a phone. The ground has to carry
              // legibility on its own; the blur is the bonus.
              background: "rgba(4,10,12,0.78)",
              borderRadius: "3px",
              boxShadow:
                "inset 0 1px 0 0 rgba(215,216,217,0.055), inset 0 0 60px 0 rgba(0,217,146,0.035), inset 0 -1px 0 0 rgba(4,10,12,0.55), 0 30px 80px -40px rgba(0,0,0,0.9)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
            }}
          >
            {/* ⚠️ The accent rail, the scanlines and the four HUD brackets are
                gone. Together they made a terminal window, which is what made
                this page feel like anything but League — and they fought the
                halftone behind, which is the actual subject now. The card is
                lit from within and has no edge of its own. */}

            {/* ── Content ── */}
            <div className="relative z-[5] px-8 py-8">
                {/* The `:: AUTH ::` terminal strip is gone with the rest of the
                    chrome. It named the mechanism, not the thing you came to do. */}


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
                  {isSignIn ? "Your games, your runes, your record." : "Free. Two clicks with Riot or Discord."}
                </p>

                {/* ⚠️ THE ONE-CLICK ROUTES COME FIRST, and that is the point of
                    this change rather than the paint. Email + password + a
                    six-digit code from an inbox is three steps and a context
                    switch; Riot or Discord is one press, and on a League site
                    almost everybody already has both. Putting them last, small,
                    behind an "or continue with", was telling people the long way
                    round was the intended one. */}
                {/* OAuth buttons row */}
                <div className="flex gap-2">
                  {/* Discord */}
                  <button
                    type="button"
                    onClick={loginWithDiscord}
                    disabled={discordLoading}
                    className="flex-1 cursor-pointer select-none group disabled:opacity-50 disabled:pointer-events-none"
                    style={{
                      background: "transparent",
                      border: "1px solid color-mix(in srgb, #d7d8d9 15%, transparent)",
                      borderRadius: "2px",
                      padding: "14px 0",
                      color: "color-mix(in srgb, #d7d8d9 78%, transparent)",
                      fontSize: "12px",
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
                    <span className="flex items-center justify-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 127.14 96.36" className="w-4 h-4 fill-current text-flash/40 group-hover:text-[#5865F2] transition-colors duration-200">
                        <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.15,105.15,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21a105.73,105.73,0,0,0,31.77,16.15,77.7,77.7,0,0,0,6.85-11.08,68.42,68.42,0,0,1-10.79-5.18c.91-.66,1.8-1.35,2.66-2a75.57,75.57,0,0,0,66.58,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.81,5.19,77,77,0,0,0,6.85,11.08A105.25,105.25,0,0,0,126.6,80.23C129.24,51.37,121.13,27.53,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S53.89,46,53.89,53,48.73,65.69,42.45,65.69Zm42.24,0c-6.27,0-11.43-5.7-11.43-12.71S78.41,40.23,84.69,40.23,96.12,46,96.12,53,90.95,65.69,84.69,65.69Z" />
                      </svg>
                      {discordLoading ? "..." : "Discord"}
                    </span>
                  </button>

                  {/* Riot */}
                  <button
                    type="button"
                    onClick={loginWithRiot}
                    disabled={riotLoading}
                    className="flex-1 cursor-pointer select-none group disabled:opacity-50 disabled:pointer-events-none"
                    style={{
                      background: "transparent",
                      border: "1px solid color-mix(in srgb, #d7d8d9 15%, transparent)",
                      borderRadius: "2px",
                      padding: "14px 0",
                      color: "color-mix(in srgb, #d7d8d9 78%, transparent)",
                      fontSize: "12px",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "color-mix(in srgb, #c8292e 40%, transparent)"
                      e.currentTarget.style.background = "rgba(200,41,46,0.06)"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "color-mix(in srgb, #d7d8d9 15%, transparent)"
                      e.currentTarget.style.background = "transparent"
                    }}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 fill-current text-flash/40 group-hover:text-[#c8292e] transition-colors duration-200">
                        <path d="M13.458.86 0 7.093l3.353 12.761 2.552-.313-.701-8.024.838-.373 1.447 8.202 4.361-.535-.775-8.857.83-.37 1.591 9.025 4.412-.542-.849-9.708.84-.374 1.74 9.87L24 17.318V3.5Zm.316 19.356.222 1.256L24 23.14v-4.18l-10.22 1.256Z"/>
                      </svg>
                      {riotLoading ? "..." : "Riot Games"}
                    </span>
                  </button>
                </div>


                {/* Divider */}
                <div className="flex items-center gap-3 my-6">
                  <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, transparent, color-mix(in srgb, ${ac} 15%, transparent))` }} />
                  <span className="text-[10px] tracking-[0.15em] uppercase text-flash/20">or with an email</span>
                  <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, color-mix(in srgb, ${ac} 15%, transparent), transparent)` }} />
                </div>

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

                  {/* The way back in, for the people who cannot get in. */}
                  {isSignIn && (
                    <button
                      type="button"
                      onClick={handleForgot}
                      disabled={submitting}
                      className="-mt-1 self-start font-mono text-[10px] uppercase tracking-[0.15em] text-flash/30 transition-colors hover:text-jade disabled:opacity-50"
                    >
                      forgot your password?
                    </button>
                  )}

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

            {/* The animated jade underline is gone with the rest of the
                terminal chrome: it drew an edge on a card that is meant not to
                have one. */}
          </div>
        </div>
      </div>

      {/* ── OTP Verification Dialog ── */}
      <Dialog open={otpDialogOpen} onOpenChange={(open) => { if (!open) setPendingEmail(null) }}>
        <DialogContent
          className="p-0 border-0 bg-transparent shadow-none w-full max-w-[min(420px,92vw)]"
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
            <div className="relative z-[5] px-5 py-7 sm:px-8 sm:py-8">
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
              <div className="flex justify-center gap-2 sm:gap-3 mb-7" onPaste={handleOtpPaste}>
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
                    className="w-10 h-12 sm:w-11 sm:h-13 text-center text-xl font-mechano outline-none transition-all duration-200"
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
