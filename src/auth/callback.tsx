// src/auth/callback.tsx — OAuth / email-link return handler.
//
// The client uses the PKCE flow (see supabaseClient.ts), so providers send us
// back to /auth/callback?code=... (success) or /auth/callback?error=... (failure).
// We exchange the code for a session explicitly and, crucially, SURFACE the real
// error instead of silently bouncing to /login — a blank bounce hides the actual
// cause (redirect URL not allow-listed, provider disabled, "Database error saving
// new user" from a failing signup trigger, domain mismatch on the code verifier…).

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabaseClient"
import { consumeStashedRedirect } from "@/lib/authRedirect"

export default function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const fail = (msg: string) => { if (!cancelled) { console.error("[AuthCallback]", msg); setError(msg) } }
    // Honour the stashed return-route (smart redirect); falls back to /dashboard.
    const ok = () => { if (!cancelled) navigate(consumeStashedRedirect(), { replace: true }) }

    async function run() {
      const url = new URL(window.location.href)
      const qp = url.searchParams
      // Errors can arrive in the query (PKCE) or, for legacy links, the hash.
      const hp = new URLSearchParams(url.hash.replace(/^#/, ""))
      const errCode = qp.get("error") || hp.get("error")
      const errDesc = qp.get("error_description") || hp.get("error_description")
      if (errCode) {
        fail(decodeURIComponent(errDesc || errCode).replace(/\+/g, " "))
        return
      }

      // PKCE code: a fresh sign-in, an account-link (linkIdentity), or an email
      // confirmation link. Exchange it FIRST — before checking for an existing
      // session — so linking still completes while already logged in (we disabled
      // detectSessionInUrl, so nothing else consumes the code for us).
      const code = qp.get("code")
      if (code) {
        const { error: exErr } = await supabase.auth.exchangeCodeForSession(window.location.href)
        if (exErr) { fail(exErr.message); return }
        ok()
        return
      }

      // Older-style email links carry token_hash + type instead of a code.
      const tokenHash = qp.get("token_hash")
      const type = qp.get("type")
      if (tokenHash && type) {
        const { error: vErr } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as "signup" | "magiclink" | "recovery" | "invite" | "email",
        })
        if (vErr) { fail(vErr.message); return }
        ok()
        return
      }

      // No code/token in the URL — a returning user who landed here directly with
      // a session already in storage is fine; otherwise the redirect is misconfigured.
      const { data: existing } = await supabase.auth.getSession()
      if (existing.session) { ok(); return }

      fail("No authorization code was returned. The redirect URL is likely not configured in Supabase.")
    }

    run()
    return () => { cancelled = true }
  }, [navigate])

  if (error) {
    return (
      <div className="w-screen h-screen bg-liquirice text-flash font-jetbrains flex items-center justify-center px-4">
        <div
          className="relative w-full max-w-md overflow-hidden px-8 py-8"
          style={{
            background: "#040A0C",
            border: "1px solid color-mix(in srgb, #ff6286 28%, transparent)",
            borderRadius: "2px",
            boxShadow: "0 0 40px rgba(255,98,134,0.08), 0 8px 32px rgba(0,0,0,0.5)",
          }}
        >
          <div className="absolute left-0 top-0 bottom-0 w-[2px]" style={{ background: "#ff6286" }} />
          <div className="flex items-center gap-2 text-[10px] tracking-[0.25em] uppercase mb-4 text-error/70">
            <span style={{ fontSize: "8px" }}>◈</span> :: AUTH FAILED ::
          </div>
          <h1 className="font-mechano text-xl text-flash/90 mb-3">Sign-in didn’t complete</h1>
          <p className="text-[12px] text-flash/55 leading-relaxed mb-6 break-words">{error}</p>
          <button
            type="button"
            onClick={() => navigate("/login", { replace: true })}
            className="cursor-pointer select-none px-5 py-2 text-[12px] uppercase tracking-[0.15em] text-jade"
            style={{
              background: "rgba(0,217,146,0.08)",
              border: "1px solid color-mix(in srgb, #00d992 40%, transparent)",
              borderRadius: "2px",
            }}
          >
            ◈ Back to login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 text-flash/70 font-jetbrains">
      Reindirizzamento in corso…
    </div>
  )
}
