// src/pages/billingcancel.tsx
//
// Landing page when a user abandons the Stripe Checkout flow.
// Stripe redirects here when they hit "Back" in the hosted checkout.
// Should be friendly, NOT scolding — they might have wanted to look
// at the page first and they can always try again.

import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import { ArrowRight, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const EASE_BRAND = [0.22, 1, 0.36, 1] as const

const glassDark = cn(
  "relative overflow-hidden rounded-md",
  "bg-black/35 backdrop-blur-lg saturate-150",
  "shadow-[0_20px_60px_rgba(0,0,0,0.65),inset_0_0_0_0.5px_rgba(255,255,255,0.10),inset_0_1px_0_rgba(255,255,255,0.05)]"
)

export default function BillingCancelPage() {
  return (
    <div className="relative min-h-[70vh] py-16 px-4">
      <div className="mx-auto max-w-xl">
        <motion.div
          className={cn(glassDark, "p-8 md:p-10 text-center")}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE_BRAND }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sm bg-flash/[0.05] border border-flash/15 text-flash/55 font-mono text-[10px] tracking-[0.25em] uppercase mb-6">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-flash/40" />
            CHECKOUT CANCELLED
          </div>

          <h1 className="font-jetbrains font-bold text-2xl md:text-3xl text-flash/90 mb-3">
            No charge made
          </h1>

          <p className="text-sm md:text-base text-flash/60 leading-relaxed max-w-md mx-auto mb-8">
            You stepped out of the checkout flow before completing your
            payment. Nothing was billed. Whenever you're ready, the plans
            are still right where you left them.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            <Button variant="solid" asChild>
              <Link to="/pricing" className="inline-flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                BACK TO PRICING
              </Link>
            </Button>
            <Button variant="purchase" asChild>
              <Link to="/" className="text-flash/55 inline-flex items-center gap-2">
                EXPLORE THE SITE
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
