// src/components/pricingplans.tsx
//
// The membership pricing cards — used both on the standalone /pricing route
// and inline inside the "Are you with us?" homepage swap (areyouwithus.tsx).
//
// Fully responsive: 1 column on phones, 2 on small tablets, 3 on desktop.
// The middle (Premium) tier is the featured / recommended card — it lifts,
// carries a travelling BorderBeam and a "MOST POPULAR" ribbon. All the Stripe
// checkout logic (sign-in guard, loading state, plan→ACTIVE detection) is
// preserved verbatim from the previous version.

import { useRef, useState } from "react";
import { Check, Loader2, ArrowRight } from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useAuth } from "@/context/authcontext";
import { supabase } from "@/lib/supabaseClient";
import { API_BASE_URL } from "@/config";
import { BorderBeam } from "./ui/border-beam";
import { cn } from "@/lib/utils";
import { showCyberToast } from "@/lib/toast-utils";

const EASE_BRAND = [0.22, 1, 0.36, 1] as const;

type PlanId = "free" | "premium" | "elite";

const PLANS: {
  id: PlanId;
  name: string;
  price: string;
  period: string;
  tagline: string;
  features: string[];
  featured?: boolean;
}[] = [
  {
    id: "free",
    name: "Free",
    price: "€0",
    period: "forever",
    tagline: "Everything you need to start climbing.",
    features: [
      "Personal data tracking",
      "3 daily AI credits",
      "Full loldata stats access",
      "Community support",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: "€3.49",
    period: "/ month",
    tagline: "Deeper analysis and more AI, every month.",
    features: [
      "Everything in Free",
      "150 AI credits / month",
      "Matchup analysis",
      "Personal itemization analysis",
    ],
    featured: true,
  },
  {
    id: "elite",
    name: "Elite",
    price: "€14.99",
    period: "/ month",
    tagline: "The complete arsenal — no limits.",
    features: [
      "Everything in Premium",
      "750 AI credits / month",
      "Priority AI processing",
      "Early access to new tools",
    ],
  },
];

export function PricingPlans() {
  const { plan, session } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<"premium" | "elite" | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });

  async function goCheckout(nextPlan: "premium" | "elite") {
    // Logged-out guard — the backend rejects unauthenticated requests anyway,
    // catch it here so the user gets a useful toast instead of a generic error.
    if (!session?.user) {
      showCyberToast({
        title: "Sign in required",
        description: "Log in or create a free account before subscribing.",
        tag: "AUTH",
        variant: "error",
        duration: 4000,
      });
      return;
    }

    try {
      setLoadingPlan(nextPlan);
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      const resp = await fetch(`${API_BASE_URL}/api/billing/create-checkout-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ plan: nextPlan }),
      });

      if (!resp.ok) {
        const body = await resp.text().catch(() => "");
        throw new Error(`HTTP ${resp.status} ${body}`.trim());
      }
      const { url } = await resp.json();
      if (!url) throw new Error("Missing checkout URL");

      window.location.href = url; // redirect to Stripe Checkout
    } catch (err) {
      console.error("Checkout error:", err);
      showCyberToast({
        title: "Couldn't start checkout",
        description: "Something blocked the payment session. Please try again in a moment.",
        tag: "STRIPE",
        variant: "error",
        duration: 4500,
        id: "stripe-checkout-error",
      });
      setLoadingPlan(null);
    }
  }

  return (
    <div ref={ref} className="relative w-full py-4">
      {/* Sheen keyframe for the CTA buttons (scoped + self-contained). */}
      <style>{`
        @keyframes pp-sheen {
          0%   { transform: translateX(-180%) skewX(-18deg); }
          100% { transform: translateX(460%) skewX(-18deg); }
        }
      `}</style>

      {/* Header */}
      <div className="mb-9 flex flex-col items-center px-4 text-center">
        <div className="mb-3 flex items-center gap-2.5">
          <span className="relative inline-grid h-3.5 w-3.5 place-items-center">
            <span className="absolute inset-0 rotate-45 rounded-[2px] border border-jade/50 bg-jade/10" />
            <span className="absolute h-1 w-1 rounded-full bg-jade" />
          </span>
          <span className="font-chakrapetch text-[11px] font-bold uppercase tracking-[0.32em] text-jade/70">
            Membership
          </span>
        </div>
        <h2 className="font-chakrapetch text-[clamp(28px,4.5vw,46px)] font-bold leading-[1.02] tracking-tight text-flash">
          Choose your{" "}
          <span className="text-jade" style={{ textShadow: "0 0 30px rgba(0,217,146,0.35)" }}>
            plan
          </span>
        </h2>
        <p className="mt-3 font-jetbrains text-[13px] text-flash/45">
          Upgrade, downgrade or cancel anytime.
        </p>
      </div>

      {/* Cards */}
      <div className="mx-auto grid w-full max-w-[1060px] grid-cols-1 gap-5 px-4 md:grid-cols-3 md:gap-5 md:px-2">
        {PLANS.map((p, i) => {
          const isActive = plan === p.id;
          const isLoading = loadingPlan === (p.id as "premium" | "elite");

          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 26 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, ease: EASE_BRAND, delay: 0.08 * i }}
              className={cn(
                "group relative flex flex-col rounded-2xl border p-6 backdrop-blur-md transition-[transform,border-color,background-color] duration-300 sm:p-7",
                p.featured
                  ? "border-jade/30 bg-[radial-gradient(140%_120%_at_50%_-10%,rgba(0,217,146,0.12),rgba(6,12,13,0.55))] shadow-[0_0_55px_-14px_rgba(0,217,146,0.4)] md:-translate-y-3 md:scale-[1.035]"
                  : "border-flash/10 bg-[#0a0f10]/55 hover:-translate-y-1 hover:border-jade/25"
              )}
            >
              {p.featured && <BorderBeam size={130} duration={7} borderWidth={1.4} />}

              {/* inset hairline — the one OK white touch (glass spec) */}
              <span aria-hidden className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/[0.05]" />

              {p.featured && (
                <span className="absolute -top-[11px] left-1/2 -translate-x-1/2 rounded-full bg-jade px-3 py-1 font-chakrapetch text-[9px] font-bold uppercase tracking-[0.2em] text-liquirice shadow-[0_0_22px_-4px_rgba(0,217,146,0.8)]">
                  Most popular
                </span>
              )}

              {/* Name */}
              <div className="flex items-center gap-2">
                <span className={cn("h-1.5 w-1.5 rotate-45", p.featured ? "bg-jade" : "bg-flash/40")} />
                <span
                  className={cn(
                    "font-chakrapetch text-[12px] font-bold uppercase tracking-[0.26em]",
                    p.featured ? "text-jade" : "text-flash/60"
                  )}
                >
                  {p.name}
                </span>
              </div>

              {/* Price */}
              <div className="mt-5 flex items-end gap-2">
                <span className="font-chakrapetch text-[42px] font-bold leading-none text-flash">{p.price}</span>
                <span className="mb-1.5 font-jetbrains text-[12px] lowercase text-flash/40">{p.period}</span>
              </div>
              <p className="mt-2.5 min-h-[34px] font-jetbrains text-[12.5px] leading-relaxed text-flash/45">
                {p.tagline}
              </p>

              <div className="my-6 h-px w-full bg-gradient-to-r from-transparent via-jade/20 to-transparent" />

              {/* Features */}
              <ul className="flex flex-col gap-3.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-3 font-jetbrains text-[12.5px] text-flash/70">
                    <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-jade/15">
                      <Check className="h-2.5 w-2.5 text-jade" strokeWidth={3.5} />
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {/* CTA — mt-auto pins it to the bottom so every card aligns. */}
              <div className="mt-auto pt-8">
                {isActive ? (
                  <div className="flex h-[52px] items-center justify-center gap-2 rounded-xl border border-jade/40 bg-jade/10 font-chakrapetch text-[12px] font-bold uppercase tracking-[0.14em] text-jade">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} /> Current plan
                  </div>
                ) : p.id === "free" ? (
                  <div className="flex h-[52px] items-center justify-center rounded-xl border border-flash/10 font-chakrapetch text-[12px] font-bold uppercase tracking-[0.14em] text-flash/35">
                    Free forever
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => goCheckout(p.id as "premium" | "elite")}
                    disabled={isLoading}
                    aria-label={`Subscribe to ${p.name}`}
                    className={cn(
                      "group/cta relative flex h-[52px] w-full items-center justify-center gap-2 overflow-hidden rounded-xl font-chakrapetch text-[13px] font-bold uppercase tracking-[0.16em] transition-all duration-200 cursor-clicker disabled:cursor-not-allowed disabled:opacity-70 active:translate-y-0",
                      p.featured
                        ? "text-liquirice shadow-[0_10px_28px_-10px_rgba(0,217,146,0.85)] hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-10px_rgba(0,217,146,1)]"
                        : "border hover:-translate-y-0.5 hover:border-jade hover:text-liquirice hover:shadow-[0_14px_36px_-12px_rgba(0,217,146,0.9)]",
                      // Elite stays FILLED while redirecting (dark text + solid border) so it
                      // never empties back to the outline when the cursor leaves the button.
                      !p.featured && (isLoading ? "border-jade text-liquirice" : "border-jade/45 text-jade")
                    )}
                  >
                    {/* fill */}
                    {p.featured ? (
                      <span aria-hidden className="absolute inset-0 bg-gradient-to-b from-[#2bf4b6] to-[#00c184]" />
                    ) : (
                      // Elite: jade fill wipes up from the bottom on hover — and stays up
                      // while loading so REDIRECTING never loses its green.
                      <span
                        aria-hidden
                        className={cn(
                          "absolute inset-0 origin-bottom bg-gradient-to-b from-[#2bf4b6] to-[#00c184] transition-transform duration-300 ease-out",
                          isLoading ? "scale-y-100" : "scale-y-0 group-hover/cta:scale-y-100"
                        )}
                      />
                    )}
                    {/* sheen sweep — featured CTA only (the Elite outline stays clean at rest) */}
                    {!isLoading && p.featured && (
                      <span
                        aria-hidden
                        className="pointer-events-none absolute top-0 h-full w-1/5 bg-white/40 blur-[6px] [animation:pp-sheen_2.6s_ease-in-out_infinite]"
                      />
                    )}
                    <span className="relative z-10">{isLoading ? "Redirecting…" : `Get ${p.name}`}</span>
                    {isLoading ? (
                      <Loader2 className="relative z-10 h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="relative z-10 h-4 w-4 transition-transform duration-200 group-hover/cta:translate-x-1" />
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
