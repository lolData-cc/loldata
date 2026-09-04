// src/pages/pricingpage.tsx
//
// The standalone /pricing route. The cards come from PricingPlans in its tall
// variant; underneath, the three questions people actually have before they
// pay. The section is sized to the viewport so the FOOTER ARRIVES AFTER A
// SCROLL: the compact cards left it on screen from the first frame, which
// made the page read as finished before it had made its case.

import { PricingPlans } from "@/components/pricingplans"

const QUESTIONS: { q: string; a: string }[] = [
  {
    q: "What is an AI credit?",
    a: "One question to the AI — the coach, a matchup, a build — costs one credit. Free refills three a day; Premium and Elite refill their monthly pool on the day you subscribed.",
  },
  {
    q: "Can I cancel any time?",
    a: "Yes. Upgrade, downgrade or cancel from your dashboard whenever you like. A cancelled plan stays active until the end of the month you paid for.",
  },
  {
    q: "How do I pay?",
    a: "Checkout and billing are handled by Stripe. We never see or store your card details.",
  },
]

export default function PricingPage() {
  return (
    <div className="w-full">
      {/* ⚠️ Viewport-sized on purpose — see the header comment. */}
      <section className="flex min-h-[calc(100svh-72px)] flex-col justify-center py-8">
        <PricingPlans tall />
      </section>

      <section className="mx-auto w-full max-w-[1120px] px-4 pb-24 pt-8 md:px-2">
        <div className="mb-8 h-px w-full bg-gradient-to-r from-transparent via-jade/20 to-transparent" />
        <div className="mb-7 flex items-center gap-2.5">
          <span className="h-1.5 w-1.5 rotate-45 bg-jade" />
          <span className="font-chakrapetch text-[11px] font-bold uppercase tracking-[0.32em] text-jade/70">
            Before you decide
          </span>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-10">
          {QUESTIONS.map((item) => (
            <div key={item.q}>
              <h3 className="font-chakrapetch text-[15px] font-bold text-flash/90">{item.q}</h3>
              <p className="mt-2.5 font-jetbrains text-[12.5px] leading-relaxed text-flash/50">{item.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
