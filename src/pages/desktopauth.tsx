import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "@/context/authcontext"
import { buildHandoffLink, clearDesktopLogin, openDesktopApp } from "@/lib/desktopHandoff"

/**
 * The last step of signing into the desktop app.
 *
 * Every desktop login lands here — password, OTP and OAuth alike — because all
 * three go through the same redirect helper. The session is handed to the app
 * over loldata://auth, which the app validates before keeping.
 *
 * It fires ONCE, automatically, and then stops. A protocol navigation that
 * retries on a timer opens the app repeatedly for anyone who does not have it
 * installed, and there is no way for a browser to tell the difference — nothing
 * on this side can observe whether the handoff landed. So the automatic attempt
 * happens once and the rest is a button.
 */
export default function DesktopAuthPage() {
  const { session, plan, loading } = useAuth()
  const [sent, setSent] = useState(false)
  const fired = useRef(false)

  const link = useMemo(() => buildHandoffLink(session, plan), [session, plan])

  useEffect(() => {
    if (!link || fired.current) return
    fired.current = true
    clearDesktopLogin()
    openDesktopApp(link)
    setSent(true)
  }, [link])

  return (
    <div className="min-h-screen bg-liquirice text-flash flex items-center justify-center px-6">
      <div className="w-full max-w-[460px]">
        {/* The same rail-and-mark the app itself uses, so the handoff looks
            like it belongs to the thing it is handing off to. */}
        <svg aria-hidden viewBox="0 0 460 10" preserveAspectRatio="none" className="w-full h-[10px] overflow-visible">
          <path d="M 0 2 L 449 2 L 458 9" fill="none" stroke="#00d992" strokeWidth="1"
                vectorEffect="non-scaling-stroke" opacity="0.9" />
          <g transform="rotate(45 16 2)"><rect x="12" y="-2" width="8" height="8" fill="#00d992" /></g>
        </svg>

        <div className="pl-6 pt-4">
          <p className="font-jetbrains text-[9px] uppercase tracking-[0.3em] text-jade/60">
            loldata desktop
          </p>

          {loading ? (
            <h1 className="mt-3 font-chakrapetch text-[24px] font-bold">Checking your session…</h1>
          ) : !session ? (
            <>
              <h1 className="mt-3 font-chakrapetch text-[24px] font-bold">You are not signed in</h1>
              <p className="mt-2 font-chakrapetch text-[14px] leading-relaxed text-flash/45">
                Sign in first and we will pass the session straight to the app.
              </p>
              <Link
                to="/login?desktop=1"
                className="mt-6 inline-block rounded-[3px] bg-jade/10 px-4 py-2 font-chakrapetch text-[12px] font-bold uppercase tracking-[0.12em] text-jade hover:bg-jade/20"
                style={{ boxShadow: "inset 2px 0 0 0 #00d992" }}
              >
                sign in
              </Link>
            </>
          ) : (
            <>
              <h1 className="mt-3 font-chakrapetch text-[24px] font-bold">
                {sent ? "Sent to the app" : "Ready to hand over"}
              </h1>
              <p className="mt-2 max-w-[46ch] font-chakrapetch text-[14px] leading-relaxed text-flash/45">
                {sent
                  ? "The desktop app should be signed in now. If nothing happened, it is probably not running — open it and press the button below."
                  : "Press below to send your session to the desktop app."}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => link && openDesktopApp(link)}
                  disabled={!link}
                  className="rounded-[3px] bg-jade/10 px-4 py-2 font-chakrapetch text-[12px] font-bold uppercase tracking-[0.12em] text-jade hover:bg-jade/20 disabled:opacity-40"
                  style={{ boxShadow: "inset 2px 0 0 0 #00d992" }}
                >
                  {sent ? "try again" : "open the app"}
                </button>
                <Link to="/dashboard" className="font-jetbrains text-[10px] uppercase tracking-[0.16em] text-flash/30 hover:text-flash/60">
                  go to the dashboard
                </Link>
              </div>

              <p className="mt-6 max-w-[46ch] font-jetbrains text-[9px] leading-relaxed text-flash/25">
                Nothing is sent over the network here — the link is handed straight
                to the app on this machine.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
