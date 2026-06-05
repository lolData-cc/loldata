import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import {
  Check,
  ChevronRight,
  Users,
  TrendingUp,
  Eye,
  Crosshair,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Typing animation ──────────────────────────────────────────────── */

function TypingOnInView({
  text,
  speed = 50,
  className = "",
}: {
  text: string;
  speed?: number;
  className?: string;
}) {
  const ref = useRef<HTMLHeadingElement | null>(null);
  const isInView = useInView(ref, { once: true, amount: 0.55 });
  const [typed, setTyped] = useState("");
  const runId = useRef(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isInView) return;
    const id = ++runId.current;
    let i = 0;
    setTyped("");
    const step = () => {
      if (runId.current !== id) return;
      const ch = text.charAt(i);
      if (!ch) { timerRef.current = null; return; }
      setTyped((prev) => prev + ch);
      i += 1;
      timerRef.current = window.setTimeout(step, speed);
    };
    timerRef.current = window.setTimeout(step, speed);
    return () => {
      runId.current++;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isInView, text, speed]);

  const done = typed.length === text.length;
  return (
    <h1 ref={ref} className={className} aria-label={text}>
      <span>{typed}</span>
      <span
        className={`ml-1 inline-block w-[1ch] select-none ${
          done ? "opacity-0" : "opacity-100 animate-pulse"
        }`}
      >
        |
      </span>
    </h1>
  );
}

/* ── Glass card ────────────────────────────────────────────────────── */

const glassDark = cn(
  "relative overflow-hidden rounded-md",
  "bg-black/25 backdrop-blur-lg saturate-150",
  "shadow-[0_10px_30px_rgba(0,0,0,0.55),inset_0_0_0_0.5px_rgba(255,255,255,0.10),inset_0_1px_0_rgba(255,255,255,0.05)]"
);

/* ── Fade in wrapper ───────────────────────────────────────────────── */

function FadeIn({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24, filter: "blur(4px)" }}
      animate={
        isInView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}
      }
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Main page ─────────────────────────────────────────────────────── */

export default function ScoutPage() {
  return (
    <div className="w-full">
      {/* ═══ HERO ═══ */}
      <section className="relative flex flex-col items-center justify-center text-center pt-20 pb-10">
        {/* Radial glow — fixed to viewport */}
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            background:
              "radial-gradient(ellipse 40% 35% at 50% 15%, rgba(0,217,146,0.09), transparent)",
          }}
        />
        {/* Scanlines */}
        <div
          className="absolute inset-0 pointer-events-none z-[1] -mx-[50vw] left-1/2 right-1/2 w-screen"
          style={{
            background:
              "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.012) 3px, rgba(255,255,255,0.012) 4px)",
          }}
        />

        <div className="relative z-10 flex flex-col items-center gap-5 max-w-2xl px-4">
          <div className="flex items-center gap-2 text-[10px] font-mono tracking-[0.3em] uppercase text-jade/50">
            <span className="text-jade/30">◈</span> Squad Tracking System{" "}
            <span className="text-jade/30">◈</span>
          </div>

          <TypingOnInView
            text="Track your squad."
            speed={60}
            className="text-4xl md:text-5xl font-bold font-orbitron text-flash tracking-wider uppercase whitespace-nowrap"
          />

          <p className="text-flash/50 text-sm md:text-base font-mono leading-relaxed max-w-lg">
            Build a shareable lobby of up to 20 players. Watch their matches,
            ranks, and LP gains roll in live. One link for the whole crew.
          </p>

          <Link
            to="/scout/new"
            className="mt-4 group flex items-center gap-2 px-6 py-2.5 rounded-sm border border-jade/40 text-jade hover:bg-jade/10 font-mono text-[12px] tracking-[0.15em] uppercase cursor-clicker transition-all hover:shadow-[0_0_20px_rgba(0,217,146,0.15)]"
          >
            Create your lobby
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="pt-6 pb-16">
        <FadeIn className="text-center mb-10">
          <p className="text-[10px] font-mono tracking-[0.25em] uppercase text-jade/50 mb-2">
            :: HOW IT WORKS ::
          </p>
          <h2 className="text-2xl font-bold font-mono text-flash">
            Three steps to a live feed
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              num: "01",
              title: "Add your players",
              desc: "Drop in up to 20 friends, teammates, or scouting targets. Each player can link up to 3 Riot accounts — smurfs, mains, alt regions, all tracked together.",
            },
            {
              num: "02",
              title: "Share the link",
              desc: "Every lobby gets a unique URL like loldata.cc/scout/x7K2mE. No accounts required to view it. Drop it in Discord, paste it on Twitter, pin it in your team chat.",
            },
            {
              num: "03",
              title: "Watch them play",
              desc: "Matches stream in within seconds of game end. Auto-refresh every 10 minutes. Manual REFRESH whenever you want. Rank changes, LP deltas, squad games — all tracked.",
            },
          ].map((step, i) => (
            <FadeIn key={step.num} delay={i * 0.15}>
              <div className={cn(glassDark, "h-full")}>
                <div className="relative z-10 p-6">
                  <div className="text-[10px] font-mono tracking-[0.3em] text-jade/40 mb-3">
                    {step.num}
                  </div>
                  <h3 className="text-[13px] font-mono font-bold text-flash tracking-wide uppercase mb-2">
                    {step.title}
                  </h3>
                  <p className="text-[12px] font-mono text-flash/45 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section className="py-16">
        <FadeIn className="text-center mb-10">
          <p className="text-[10px] font-mono tracking-[0.25em] uppercase text-jade/50 mb-2">
            :: WHAT YOU GET ::
          </p>
          <h2 className="text-2xl font-bold font-mono text-flash">
            One feed. Everything.
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[
            {
              icon: <Users className="w-3.5 h-3.5 text-jade" />,
              title: "Squad detection",
              desc: "Games where two or more lobby members played together get a SQUAD badge. See who duos with who, who carries who.",
            },
            {
              icon: <TrendingUp className="w-3.5 h-3.5 text-jade" />,
              title: "LP tracking",
              desc: "Every ranked match shows the exact LP delta (+18 LP) or promotion/demotion badge (▲ D4). Per-account balance since lobby creation in the sidebar leaderboard.",
            },
            {
              icon: <Eye className="w-3.5 h-3.5 text-jade" />,
              title: "Live refresh",
              desc: "Auto-pulls the latest matches every 10 minutes. NEXT UPDATE countdown visible at all times. Manual REFRESH whenever you want fresh data.",
            },
            {
              icon: <Crosshair className="w-3.5 h-3.5 text-jade" />,
              title: "Deep stats",
              desc: "Trending tab with daily activity, hourly heatmaps, KDA histograms, role distribution, top champions, win/loss streaks. Habits tab tracks tilt-queue tendencies and prime-time hours.",
            },
          ].map((feat, i) => (
            <FadeIn key={feat.title} delay={i * 0.1}>
              <div className={cn(glassDark, "h-full")}>
                <div className="relative z-10 p-5">
                  <div className="flex items-start gap-3">
                    <div className="relative w-8 h-8 shrink-0 mt-0.5">
                      <span className="absolute inset-0 rotate-45 rounded-[3px] border border-jade/40 bg-jade/10 shadow-[0_0_8px_rgba(0,217,146,0.15)]" />
                      <span className="absolute inset-0 flex items-center justify-center">
                        {feat.icon}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-[12px] font-mono font-bold text-flash tracking-wide uppercase mb-1.5">
                        {feat.title}
                      </h3>
                      <p className="text-[11px] font-mono text-flash/45 leading-relaxed">
                        {feat.desc}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ═══ USE CASES ═══ */}
      <section className="py-16">
        <FadeIn>
          <p className="text-[10px] font-mono tracking-[0.25em] uppercase text-jade/50 mb-2">
            :: WHO IS IT FOR ::
          </p>
          <h2 className="text-2xl font-bold font-mono text-flash mb-8">
            Built for serious crews
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {[
            {
              tag: "TEAMS",
              title: "Amateur teams & ARAM nights",
              desc: "Track your 5-stack's grind to Diamond. Watch your roster's solo queue progress in one feed instead of stalking op.gg tabs.",
            },
            {
              tag: "COACH",
              title: "Coaches & analysts",
              desc: "Scout players you might recruit. Watch their habits, champion pool, and consistency over weeks — not just their last 3 games.",
            },
            {
              tag: "FRIENDS",
              title: "Friend groups",
              desc: "Brag-board for the group chat. Compare LP gains, see who's actually grinding, settle the eternal debate over who has the best winrate.",
            },
          ].map((u, i) => (
            <FadeIn key={u.tag} delay={i * 0.1}>
              <div className={cn(glassDark, "h-full")}>
                <div className="relative z-10 p-6">
                  <div className="inline-flex items-center gap-1 text-[9px] font-mono font-bold tracking-[0.25em] text-jade/60 bg-jade/10 border border-jade/20 px-2 py-1 rounded-sm mb-3">
                    {u.tag}
                  </div>
                  <h3 className="text-[14px] font-mono font-bold text-flash mb-2">
                    {u.title}
                  </h3>
                  <p className="text-[11px] font-mono text-flash/45 leading-relaxed">
                    {u.desc}
                  </p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ═══ PLAN LIMITS ═══ */}
      <section className="py-16">
        <FadeIn className="text-center mb-10">
          <p className="text-[10px] font-mono tracking-[0.25em] uppercase text-jade/50 mb-2">
            :: LOBBY QUOTA ::
          </p>
          <h2 className="text-2xl font-bold font-mono text-flash">
            How many lobbies you can run
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              tier: "FREE",
              count: "3",
              color: "flash",
              ring: "border-flash/15",
              text: "text-flash/80",
              perks: [
                "Up to 3 active lobbies",
                "20 players × 3 accounts each",
                "Full feed, leaderboard, stats",
                "10-min auto-refresh",
              ],
            },
            {
              tier: "PRO",
              count: "5",
              color: "jade",
              ring: "border-jade/40 shadow-[0_0_30px_rgba(0,217,146,0.1)]",
              text: "text-jade",
              perks: [
                "Up to 5 active lobbies",
                "Everything in Free",
                "PRO badge on your profile",
                "Priority support",
              ],
              highlighted: true,
            },
            {
              tier: "ELITE",
              count: "10",
              color: "amber",
              ring: "border-amber-400/40 shadow-[0_0_30px_rgba(251,191,36,0.08)]",
              text: "text-amber-300",
              perks: [
                "Up to 10 active lobbies",
                "Everything in PRO",
                "ELITE badge on your profile",
                "Early access to new features",
              ],
            },
          ].map((p, i) => (
            <FadeIn key={p.tier} delay={i * 0.12}>
              <div
                className={cn(
                  "relative overflow-hidden rounded-md bg-black/30 backdrop-blur-lg saturate-150 border",
                  p.ring,
                  "h-full"
                )}
              >
                {p.highlighted && (
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-jade/60 to-transparent" />
                )}
                <div className="relative z-10 p-6 flex flex-col h-full">
                  <div
                    className={cn(
                      "text-[10px] font-mono font-bold tracking-[0.3em] mb-2",
                      p.text
                    )}
                  >
                    {p.tier}
                  </div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span
                      className={cn(
                        "text-5xl font-bold font-orbitron tabular-nums",
                        p.text
                      )}
                    >
                      {p.count}
                    </span>
                    <span className="text-[11px] font-mono text-flash/40 uppercase tracking-wider">
                      lobbies
                    </span>
                  </div>
                  <div className="h-[1px] bg-flash/10 my-4" />
                  <ul className="space-y-2 flex-1">
                    {p.perks.map((perk) => (
                      <li
                        key={perk}
                        className="flex items-start gap-2 text-[11px] font-mono text-flash/55"
                      >
                        <Check
                          className={cn("w-3 h-3 mt-0.5 shrink-0", p.text)}
                        />
                        <span>{perk}</span>
                      </li>
                    ))}
                  </ul>
                  {p.tier !== "FREE" && (
                    <Link
                      to="/pricing"
                      className={cn(
                        "mt-5 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-sm border text-[10px] font-mono tracking-[0.2em] uppercase cursor-clicker transition-all",
                        p.tier === "PRO"
                          ? "border-jade/40 text-jade hover:bg-jade/10"
                          : "border-amber-400/40 text-amber-300 hover:bg-amber-400/10"
                      )}
                    >
                      Upgrade
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ═══ FAQ MINI ═══ */}
      <section className="py-16">
        <FadeIn>
          <p className="text-[10px] font-mono tracking-[0.25em] uppercase text-jade/50 mb-2">
            :: GOOD TO KNOW ::
          </p>
          <h2 className="text-2xl font-bold font-mono text-flash mb-6">
            The fine print
          </h2>
        </FadeIn>

        <FadeIn delay={0.15}>
          <div className={cn(glassDark)}>
            <div className="relative z-10 p-6 space-y-4">
              {[
                {
                  q: "Do tracked players need to know about it?",
                  a: "Nope. Riot's API is public — you can scout any player without their consent. Same as op.gg or u.gg.",
                },
                {
                  q: "How fast do matches appear?",
                  a: "Within seconds of game end. Riot indexes matches almost instantly. Press REFRESH to pull immediately.",
                },
                {
                  q: "Can I make a lobby private?",
                  a: "Lobbies are public by default — anyone with the URL can view. Password-protected lobbies are coming soon.",
                },
                {
                  q: "Can I edit the player list later?",
                  a: "Yes. As the creator, you'll see an EDIT button on the lobby page to add, remove, or rename players.",
                },
              ].map((f, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 pb-3 last:pb-0 last:border-b-0 border-b border-flash/[0.04]"
                >
                  <div className="w-5 h-5 rounded-full bg-jade/10 border border-jade/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-jade" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-[12px] font-mono font-bold text-flash mb-1">
                      {f.q}
                    </h4>
                    <p className="text-[11px] font-mono text-flash/45 leading-relaxed">
                      {f.a}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="py-20 flex flex-col items-center text-center">
        <FadeIn className="flex flex-col items-center gap-5">
          <div className="text-[10px] font-mono tracking-[0.3em] uppercase text-jade/50 flex items-center gap-2">
            <span className="text-jade/30">◈</span> ready to scout{" "}
            <span className="text-jade/30">◈</span>
          </div>
          <h2 className="text-3xl font-bold font-mono text-flash">
            One link. The whole squad.
          </h2>
          <p className="text-[12px] font-mono text-flash/40 max-w-md">
            Set up your first lobby in under 60 seconds. No credit card. Just a
            login and the players you want to watch.
          </p>
          <Link
            to="/scout/new"
            className="mt-2 group inline-flex items-center gap-2 px-8 py-3 rounded-sm font-mono text-[13px] tracking-[0.15em] uppercase cursor-clicker transition-all border border-jade/50 text-jade hover:bg-jade/10 hover:shadow-[0_0_25px_rgba(0,217,146,0.2)]"
          >
            Create your first lobby
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </FadeIn>
      </section>
    </div>
  );
}
