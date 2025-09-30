import { useState } from "react";
import { Check } from "lucide-react";
import { useAuth } from "@/context/authcontext";
import { supabase } from "@/lib/supabaseClient";
import { API_BASE_URL } from "@/config";
import { BorderBeam } from "./ui/border-beam";
import { Button } from "./ui/button";
import { Globe } from "./ui/globe";
import { Example } from "./example";
import { LightRays } from "./ui/light-rays";

export function PricingPlans() {
  const { plan } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<"premium" | "elite" | null>(null);

  async function goCheckout(nextPlan: "premium" | "elite") {
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

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const { url } = await resp.json();
      if (!url) throw new Error("Missing checkout URL");

      window.location.href = url; // redirect a Stripe Checkout
    } catch (err) {
      console.error("Checkout error:", err);
      alert("Errore nell'avvio del checkout. Riprova tra un attimo.");
      setLoadingPlan(null);
    }
  }

  return (
    <div className="relative w-full">
    <LightRays className="absolute inset-0 -z-10 opacity-40 [mask-image:radial-gradient(60%_60%_at_50%_50%,white,transparent)]" />
      <div className="flex justify-center">
        <span className="font-gtmono text-[164px] h-32 select-none"> PRICING </span>
      </div>
      <div className="relative bottom-8 flex justify-center gap-8">
        {/* FREE */}
        <div className="w-[25%] h-[400px] overflow-hidden bg-[radial-gradient(ellipse_at_top_left,_rgba(50,50,50,255),_rgba(14,14,14,0.02))] backdrop-blur-md border border-flash/25 rounded-sm shadow-lg ring-1 ring-white/5">
          <div className="flex flex-col select-none">
            <div className="relative top-12 w-full h-[1px] bg-[linear-gradient(to_right,_transparent,_rgba(107,114,128,0.4),_transparent)]" />
            <div className="relative top-48 w-full h-[1px] bg-[linear-gradient(to_right,_transparent,_rgba(107,114,128,0.3),_transparent)]" />
            <div className="relative top-80 w-full h-[1px] bg-[linear-gradient(to_right,_transparent,_rgba(107,114,128,0.2),_transparent)]" />
            <div className="relative mx-auto w-[1px] h-[400px] bg-gray-500/10" />
            <div className="relative mx-auto bottom-[371px] text-2xl text-gray-500/30 z-10"> + </div>
            <div className="relative mx-auto bottom-[258px] text-2xl text-gray-500/30 z-10"> + </div>
            <div className="relative mx-auto bottom-[161px] text-2xl text-gray-500/30 z-10"> + </div>
            <div className="relative bottom-[132px] flex items-center text-flash/40 justify-between px-4">
              <div>
                <img src="/img/gear.png" className="w-4 h-4" alt="" />
              </div>
              <div className="">
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    <span className="font-scifi text-xs text-flash/55"> v0.1 </span>
                    <span className="font-scifi text-[6px]"> FREE </span>
                  </div>
                  <span className="font-scifi text-[5px]"> GET IT - YOURSELF </span>
                </div>
              </div>
            </div>
            {plan === "free" ? (
              <div className="relative text-jade border border-jade py-2 bottom-[200px] rounded-sm mx-auto w-[80%] z-10 text-center text-sm font-jetbrains">
                ACTIVE
              </div>
            ) : (
              <div className="relative mx-auto bottom-[100px] purchase-wrapper-inactive py-5 w-[80%] z-10 cursor-not-allowed opacity-50">
                {/* nessuna azione: è il piano base */}
              </div>
            )}
            <div className="relative bottom-[540px]">
              <div className="flex flex-col px-4">
                <span className="text-xs font-scifi text-flash/50"> FREE PLAN</span>
                <span className="text-4xl pl-1 pt-2 text-jade font-scifi"> FREE </span>

                <div className="flex flex-col my-6 gap-5">
                  <div className="flex text-xs text-flash/50 items-center gap-3">
                    <Check className="w-4 h-4 bg-jade/20 text-jade p-1 rounded-full" />
                    <span> PERSONAL DATA TRACKING </span>
                  </div>
                  <div className="flex text-xs text-flash/50 items-center gap-3">
                    <Check className="w-4 h-4 bg-jade/20 text-jade p-1 rounded-full" />
                    <span> 3 DAILY AI TOKENS </span>
                  </div>
                  <div className="flex text-xs text-flash/50 items-center gap-3">
                    <Check className="w-4 h-4 bg-jade/20 text-jade p-1 rounded-full" />
                    <span> COMPLETE ACCESS TO LOLDATA STATS </span>
                  </div>
                  <div className="flex text-xs text-flash/50 items-center gap-3">
                    <Check className="w-4 h-4 bg-jade/20 text-jade p-1 rounded-full" />
                    <span> COMING SOON </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PREMIUM */}
        <div className="w-[25%] h-[400px] overflow-hidden bg-[radial-gradient(ellipse_at_top_left,_rgba(50,50,50,255),_rgba(14,14,14,0.02))] backdrop-blur-md border border-flash/25 rounded-sm shadow-lg ring-1 ring-white/5">
          <div className="flex flex-col select-none">
            <div className="relative top-12 w-full h-[1px] bg-[linear-gradient(to_right,_transparent,_rgba(107,114,128,0.4),_transparent)]" />
            <div className="relative top-48 w-full h-[1px] bg-[linear-gradient(to_right,_transparent,_rgba(107,114,128,0.3),_transparent)]" />
            <div className="relative top-80 w-full h-[1px] bg-[linear-gradient(to_right,_transparent,_rgba(107,114,128,0.2),_transparent)]" />
            <div className="relative mx-auto w-[1px] h-[400px] bg-gray-500/10" />
            <div className="relative mx-auto bottom-[371px] text-2xl text-gray-500/30 z-10"> + </div>
            <div className="relative mx-auto bottom-[258px] text-2xl text-gray-500/30 z-10"> + </div>
            <div className="relative mx-auto bottom-[161px] text-2xl text-gray-500/30 z-10"> + </div>

            <div className="relative bottom-[132px] flex items-center text-flash/40 justify-between px-4">
              <div>
                <img src="/img/gear.png" className="w-4 h-4" alt="" />
              </div>
              <div className="">
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    <span className="font-scifi text-xs text-flash/55"> v0.2 </span>
                    <span className="font-scifi text-[6px]"> PREMIUM </span>
                  </div>
                  <span className="font-scifi text-[5px]"> GET IT - YOURSELF </span>
                </div>
              </div>
            </div>
            {plan === "premium" ? (
              <div className="relative text-jade border border-jade py-2 bottom-[200px] rounded-sm mx-auto w-[80%] z-10 text-center text-sm font-jetbrains">
                ACTIVE
              </div>
            ) : (
              <button
                type="button"
                onClick={() => goCheckout("premium")}
                disabled={loadingPlan === "premium"}
                className="relative mx-auto bottom-[200px] purchase-wrapper py-5 w-[80%] z-10 cursor-clicker transition-transform duration-200 hover:-translate-y-1 disabled:opacity-60 disabled:cursor-not-allowed"
                aria-label="Purchase Premium"
              >
                <div className="purchase-content flex items-center justify-center text-sm font-jetbrains">
                  {loadingPlan === "premium" ? "REDIRECTING..." : "PURCHASE"}
                </div>
              </button>
            )}
            <div className="relative bottom-[540px]">
              <div className="flex flex-col px-4">
                <span className="text-xs font-scifi text-flash/50"> PREMIUM PLAN </span>
                <span className="text-4xl pl-1 pt-2 text-jade font-scifi"> 3.49€/m </span>

                <div className="flex flex-col my-6 gap-5">
                  <div className="flex text-xs text-flash/50 items-center gap-3">
                    <Check className="w-4 h-4 bg-jade/20 text-jade p-1 rounded-full" />
                    <span> ALL FREE PLAN VANTAGES </span>
                  </div>
                  <div className="flex text-xs text-flash/50 items-center gap-3">
                    <Check className="w-4 h-4 bg-jade/20 text-jade p-1 rounded-full" />
                    <span> MATCHUP ANALYSIS </span>
                  </div>
                  <div className="flex text-xs text-flash/50 items-center gap-3">
                    <Check className="w-4 h-4 bg-jade/20 text-jade p-1 rounded-full" />
                    <span> PERSONAL ITEMIZATION ANALYSIS </span>
                  </div>
                  <div className="flex text-xs text-flash/50 items-center gap-3">
                    <Check className="w-4 h-4 bg-jade/20 text-jade p-1 rounded-full" />
                    <span> DAILY PERFORMANCE REPORTS </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ELITE */}
        <div className="w-[25%] h-[400px] overflow-hidden bg-[radial-gradient(ellipse_at_top_left,_rgba(50,50,50,255),_rgba(14,14,14,0.02))] backdrop-blur-md border border-flash/25 rounded-sm shadow-lg ring-1 ring-white/5">
          <div className="flex flex-col select-none">
            <div className="relative top-12 w-full h-[1px] bg-[linear-gradient(to_right,_transparent,_rgba(107,114,128,0.4),_transparent)]" />
            <div className="relative top-48 w-full h-[1px] bg-[linear-gradient(to_right,_transparent,_rgba(107,114,128,0.3),_transparent)]" />
            <div className="relative top-80 w-full h-[1px] bg-[linear-gradient(to_right,_transparent,_rgba(107,114,128,0.2),_transparent)]" />
            <div className="relative mx-auto w-[1px] h-[400px] bg-gray-500/10" />
            <div className="relative mx-auto bottom-[371px] text-2xl text-gray-500/30 z-10"> + </div>
            <div className="relative mx-auto bottom-[258px] text-2xl text-gray-500/30 z-10"> + </div>
            <div className="relative mx-auto bottom-[161px] text-2xl text-gray-500/30 z-10"> + </div>
            <div className="relative bottom-[132px] flex items-center text-flash/40 justify-between px-4">
              <div>
                <img src="/img/gear.png" className="w-4 h-4" alt="" />
              </div>
              <div className="">
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    <span className="font-scifi text-xs text-flash/55"> v0.3 </span>
                    <span className="font-scifi text-[6px]"> ELITE </span>
                  </div>
                  <span className="font-scifi text-[5px]"> GET IT - YOURSELF </span>
                </div>
              </div>
            </div>
            {plan === "elite" ? (
              <div className="relative text-jade border border-jade py-2 bottom-[200px] rounded-sm mx-auto w-[80%] z-10 text-center text-sm font-jetbrains">
                ACTIVE
              </div>
            ) : (
              <button
                type="button"
                onClick={() => goCheckout("elite")}
                disabled={loadingPlan === "elite"}
                className="relative mx-auto bottom-[200px] purchase-wrapper-inactive py-5 w-[80%] z-10 cursor-clicker transition-transform duration-200 hover:-translate-y-1 disabled:opacity-60 disabled:cursor-not-allowed"
                aria-label="Purchase Elite"
              >
                <div className="purchase-content-inactive flex items-center justify-center text-sm font-jetbrains">
                  {loadingPlan === "elite" ? "REDIRECTING..." : "PURCHASE"}
                </div>
              </button>
            )}
            <div className="relative bottom-[540px]">
              <div className="flex flex-col px-4">
                <span className="text-xs font-scifi text-flash/50"> ELITE PLAN </span>
                <span className="text-4xl pl-1 pt-2 text-jade font-scifi"> 14.99€/m </span>

                <div className="flex flex-col my-6 gap-5">
                  <div className="flex text-xs text-flash/50 items-center gap-3">
                    <Check className="w-4 h-4 bg-jade/20 text-jade p-1 rounded-full" />
                    <span> ALL PREMIUM PLAN VANTAGES </span>
                  </div>
                  <div className="flex text-xs text-flash/50 items-center gap-3">
                    <Check className="w-4 h-4 bg-jade/20 text-jade p-1 rounded-full" />
                    <span> COMING SOON </span>
                  </div>
                  <div className="flex text-xs text-flash/50 items-center gap-3">
                    <Check className="w-4 h-4 bg-jade/20 text-jade p-1 rounded-full" />
                    <span> COMING SOON </span>
                  </div>
                  <div className="flex text-xs text-flash/50 items-center gap-3">
                    <Check className="w-4 h-4 bg-jade/20 text-jade p-1 rounded-full" />
                    <span> COMING SOON </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div> 
    </div>
  );
}
