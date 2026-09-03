import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabaseClient"
import { showCyberToast } from "@/lib/toast-utils"

/**
 * Where a password is actually changed, after a recovery link.
 *
 * ⚠️ THIS PAGE DOES NOT VERIFY THE LINK. The recovery token is consumed by
 * /auth/callback, which already handles `type=recovery`, and it lands here with
 * a real session in storage. So the only job left is `updateUser` — and the only
 * check that matters is that a session exists, because without one Supabase
 * would happily accept the call and change nothing.
 *
 * ⚠️ There was NO password recovery in this product at all. Every account signed
 * up with an email and a password had no way back in, and that was survivable
 * only while there were 57 accounts and the owner knew them. It is not
 * survivable now that everyone is registering again.
 */
export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [ready, setReady] = useState<"checking" | "ok" | "nolink">("checking")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let alive = true
    // The callback has had its turn by now; a session here means the link was
    // good. No session means somebody opened this URL on its own.
    void supabase.auth.getSession().then(({ data }) => {
      if (!alive) return
      setReady(data.session ? "ok" : "nolink")
    })
    return () => {
      alive = false
    }
  }, [])

  async function submit() {
    if (password.length < 8) {
      showCyberToast({
        title: "Too short",
        description: "Use at least 8 characters.",
        tag: "ERR",
        variant: "error",
      })
      return
    }
    if (password !== confirm) {
      showCyberToast({
        title: "They do not match",
        description: "The two passwords are different.",
        tag: "ERR",
        variant: "error",
      })
      return
    }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (error) {
      showCyberToast({ title: "Could not change it", description: error.message, tag: "ERR", variant: "error" })
      return
    }
    showCyberToast({ title: "Password changed", description: "You are signed in.", tag: "OK", variant: "status" })
    navigate("/dashboard")
  }

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-liquirice px-4 font-jetbrains text-flash">
      <div
        className="relative w-full max-w-md px-8 py-9"
        style={{
          background: "rgba(215,216,217,0.022)",
          boxShadow:
            "inset 0 1px 0 0 rgba(215,216,217,0.05), inset 0 0 38px 0 rgba(0,217,146,0.03), inset 0 -1px 0 0 rgba(4,10,12,0.5)",
        }}
      >
        <p className="font-jetbrains text-[9px] uppercase tracking-[0.28em] text-jade/60">a new password</p>

        {ready === "checking" && (
          <p className="mt-6 font-chakrapetch text-[14px] text-flash/45">Checking the link…</p>
        )}

        {ready === "nolink" && (
          <>
            <p className="mt-5 font-chakrapetch text-[14px] leading-relaxed text-flash/55">
              This page is opened by the link in the recovery email. Ask for a new one from the sign-in
              page — a recovery link can only be used once, and it expires.
            </p>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="mt-7 w-full rounded-[3px] py-3 font-jetbrains text-[11px] uppercase tracking-[0.24em] text-jade"
              style={{
                background: "rgba(0,217,146,0.07)",
                boxShadow: "inset 0 0 0 1px rgba(0,217,146,0.42), inset 0 0 22px rgba(0,217,146,0.12)",
              }}
            >
              back to sign in
            </button>
          </>
        )}

        {ready === "ok" && (
          <>
            <p className="mt-5 font-chakrapetch text-[14px] leading-relaxed text-flash/55">
              Choose a new password. You are already signed in on this device.
            </p>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="new password"
              className="mt-6 w-full bg-transparent px-3 py-3 font-jetbrains text-[12px] text-flash outline-none"
              style={{ boxShadow: "inset 0 0 0 1px rgba(215,216,217,0.13)" }}
            />
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="repeat it"
              className="mt-2 w-full bg-transparent px-3 py-3 font-jetbrains text-[12px] text-flash outline-none"
              style={{ boxShadow: "inset 0 0 0 1px rgba(215,216,217,0.13)" }}
            />

            <button
              type="button"
              disabled={saving}
              onClick={submit}
              className="mt-6 w-full rounded-[3px] py-3 font-jetbrains text-[11px] uppercase tracking-[0.24em] text-jade disabled:opacity-50"
              style={{
                background: "rgba(0,217,146,0.07)",
                boxShadow: "inset 0 0 0 1px rgba(0,217,146,0.42), inset 0 0 22px rgba(0,217,146,0.12)",
              }}
            >
              {saving ? "saving…" : "change password"}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
