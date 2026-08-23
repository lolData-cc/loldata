import { useEffect, useState } from "react"
import { Navbar } from "@/components/navbar"

/**
 * Where the desktop app is downloaded from.
 *
 * The version is READ from the same latest.yml the app itself polls, not
 * hardcoded here. One source means the page cannot drift out of date behind a
 * release, which is the failure every hand-written download page eventually
 * has.
 *
 * ⚠️ On architectures: x64 only, and deliberately. League of Legends requires
 * 64-bit Windows, so anyone who could not run an x64 build could not run the
 * game this app sits beside — an x86 download would be a second thing to build,
 * host and test for nobody. Same for Windows-on-ARM, where League does not run
 * natively either.
 */
const FEED = "https://cdn.loldata.cc/desktop"

type Release = { version: string; file: string; size: number; releaseDate: string | null }

/** latest.yml is small and regular, so a few lines beat pulling in a YAML
 *  parser for one file. Anything it cannot read becomes null, and the page
 *  offers the download without the details rather than showing nothing. */
function parseLatest(text: string): Release | null {
  const version = text.match(/^version:\s*(.+)$/m)?.[1]?.trim()
  const file = text.match(/^path:\s*(.+)$/m)?.[1]?.trim()
  if (!version || !file) return null
  const size = Number(text.match(/^\s+size:\s*(\d+)$/m)?.[1] ?? 0)
  const date = text.match(/^releaseDate:\s*'?([^'\n]+)'?$/m)?.[1]?.trim() ?? null
  return { version, file, size, releaseDate: date }
}

export default function DownloadPage() {
  const [rel, setRel] = useState<Release | null>(null)
  const [state, setState] = useState<"loading" | "ready" | "unavailable">("loading")

  useEffect(() => {
    const ctl = new AbortController()
    fetch(`${FEED}/latest.yml`, { signal: ctl.signal, cache: "no-store" })
      .then((r) => (r.ok ? r.text() : null))
      .then((t) => {
        const parsed = t ? parseLatest(t) : null
        if (parsed) { setRel(parsed); setState("ready") } else setState("unavailable")
      })
      .catch(() => { if (!ctl.signal.aborted) setState("unavailable") })
    return () => ctl.abort()
  }, [])

  const href = rel ? `${FEED}/${rel.file}` : null
  const mb = rel && rel.size ? (rel.size / 1048576).toFixed(0) : null

  return (
    <div className="min-h-screen bg-liquirice text-flash">
      <Navbar columnInset />

      <main className="mx-auto w-full px-6 xl:px-[17.5%] min-[2560px]:px-[22.5%] pt-24 pb-24">
        {/* The rail-and-mark the app uses, so the page and the thing it hands
            you look like the same product. */}
        <svg aria-hidden viewBox="0 0 600 10" preserveAspectRatio="none" className="w-full h-[10px] overflow-visible">
          <path d="M 0 2 L 589 2 L 598 9" fill="none" stroke="#00d992" strokeWidth="1"
                vectorEffect="non-scaling-stroke" opacity="0.85" />
          <g transform="rotate(45 16 2)"><rect x="12" y="-2" width="8" height="8" fill="#00d992" /></g>
        </svg>

        <div className="pl-6 pt-5">
          <p className="font-jetbrains text-[9px] uppercase tracking-[0.3em] text-jade/60">
            loldata desktop
          </p>
          <h1 className="mt-3 font-chakrapetch text-[38px] font-bold leading-[1.05] tracking-tight">
            Your runes, in the client.
          </h1>
          <p className="mt-4 max-w-[54ch] font-chakrapetch text-[15px] leading-relaxed text-flash/45">
            It sits beside League and does the things a website cannot: writes the
            page you picked straight into your client, reads your match history
            from the client itself, and tells you what changed this patch for the
            champions you actually play.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <a
              href={href ?? undefined}
              aria-disabled={!href}
              className={`group relative overflow-hidden rounded-[3px] px-6 py-3 font-chakrapetch text-[14px] font-bold uppercase tracking-[0.14em] ${
                href ? "text-jade bg-jade/[0.10] hover:bg-jade/[0.18]" : "text-flash/25 bg-flash/[0.04] pointer-events-none"
              }`}
              style={{ boxShadow: href ? "inset 3px 0 0 0 #00d992" : "inset 3px 0 0 0 rgba(215,216,217,0.2)" }}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 -translate-x-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-full"
                style={{ background: "linear-gradient(90deg,transparent,rgba(0,217,146,0.22),transparent)" }}
              />
              <span className="relative">
                {state === "loading" ? "checking…" : state === "unavailable" ? "not released yet" : "download for windows"}
              </span>
            </a>

            {rel && (
              <p className="font-jetbrains text-[10px] tabular-nums uppercase tracking-[0.16em] text-flash/30">
                v{rel.version} · 64-bit{mb ? ` · ${mb} MB` : ""}
                {rel.releaseDate ? ` · ${new Date(rel.releaseDate).toLocaleDateString()}` : ""}
              </p>
            )}
          </div>

          {state === "unavailable" && (
            <p className="mt-4 max-w-[52ch] font-jetbrains text-[10px] leading-relaxed text-citrine/70">
              The build is not on the CDN yet. Nothing is broken — it simply has
              not been published.
            </p>
          )}

          <div className="mt-14 grid gap-8 sm:grid-cols-3 max-w-[720px]">
            <Note title="It updates itself">
              New versions show a button inside the app. It downloads only what
              changed and restarts when you press it — never on its own, and never
              mid-game.
            </Note>
            <Note title="Windows will warn you">
              The app is not code-signed yet, so SmartScreen shows “unrecognised
              app”. Choose “More info”, then “Run anyway”. A certificate is on the
              list; it costs money rather than effort.
            </Note>
            <Note title="64-bit only">
              League itself needs 64-bit Windows, so there is no machine that
              could run the game but not this.
            </Note>
          </div>

          <p className="mt-14 max-w-[54ch] font-jetbrains text-[9.5px] leading-relaxed text-flash/25">
            The app never asks for your password — signing in opens your browser.
            It reads the League client the way Riot allows and shows only what you
            could already see yourself.
          </p>
        </div>
      </main>
    </div>
  )
}

function Note({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-jetbrains text-[9px] uppercase tracking-[0.2em] text-jade/50">{title}</p>
      <p className="mt-2 font-chakrapetch text-[13px] leading-relaxed text-flash/40">{children}</p>
    </div>
  )
}
