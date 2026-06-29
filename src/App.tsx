import { Routes, Route, useLocation } from "react-router-dom"
import { useEffect, useRef } from "react";
import { useAmbientLight } from "@/hooks/useAmbientLight";
import { Navbar } from "@/components/navbar"
import { supabase } from "@/lib/supabaseClient"
import { Footer } from "@/components/footer"
import SummonerPage from "@/pages/summonerpage"
import SeasonPage from "@/pages/seasonpage"
import DashboardPage from "@/pages/dashboard"
import LearnPage from "@/pages/learnpage"
import ExplorerPage from "@/pages/explorerpage"
import LoginPage from "@/pages/loginpage"
import MatchPage from "@/pages/matchpage"
import NotFoundPage from "@/pages/notfoundpage"
import { Toaster } from "sonner"
import AuthGuard from "@/components/authguard"
import { LiveViewerProvider } from "./context/liveviewercontext";
import { LiveToastOnBoot } from "@/components/livetoastonboot"
import { HardwareAccelerationWarning } from "@/components/hardwareaccelerationwarning"
import { DotPattern } from "@/components/ui/dot-pattern"
if (typeof window !== "undefined") {
  window.history.scrollRestoration = "manual";
  // @ts-expect-error: expose supabase on window for console debugging
  window.supabase = supabase
}
// #region contexts
import { AuthProvider } from "@/context/authcontext"
import ItemPage from "./pages/itempage";
import ChampionPage from "./pages/championpage";
import { ChampionPickerProvider } from "@/context/championpickercontext";
import ChampionDetailPage from "./pages/championdetailpage";
import PatchNotesPage from "./pages/patchnotespage";
import StreamersInfiniteCarousel from "./components/streeamerscarousel";
import { PricingPlans } from "./components/pricingplans";
import AuthCallback from "./auth/callback";
import RiotCallbackPage from "./pages/riotcallback";
import OverlayPage from "./pages/overlaypage";
import WordShiftOnScroll from "./components/features1";
import { SummonerShowcase } from "./components/home/SummonerShowcase";
import { CoachShowcase } from "./components/home/CoachShowcase";
import { ReplayShowcase } from "./components/home/ReplayShowcase";
import SearchDialogMock from "./components/searchdialogmock";
import { Button } from "./components/ui/button";
import { Jax } from "./components/areyouwithus";
import { HeroLive } from "./components/home/HeroLive";
import LeaderboardPage from "@/pages/leaderboardpage";
import TierlistPage from "@/pages/tierlistpage";
import PlaygroundPage from "./pages/playgroundpage";
import TotalMasteryPage from "./pages/totalmastery";
import PrivacyPolicyPage from "@/pages/privacypolicypage";
import TermsOfServicePage from "@/pages/termsofservicepage";
import StreamersPage from "@/pages/streamerspage";
import ScoutPage from "@/pages/scoutpage";
import ScoutCreateLobbyPage from "@/pages/scoutcreatelobbypage";
import ScoutLobbyPage from "@/pages/scoutlobbypage";
import ScoutClaimPage from "@/pages/scoutclaimpage";
import BillingSuccessPage from "@/pages/billingsuccess";
import BillingCancelPage from "@/pages/billingcancel";
import ContactPage from "@/pages/contactpage";
//

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}



function HomePage() {
  const learnRef = useRef<HTMLDivElement | null>(null);

  const handleDiscover = () => {
    if (learnRef.current) {
      const top = learnRef.current.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: top - 100, behavior: "smooth" });
    }
  };

  return (
    <div className="relative min-h-screen">
      <div className="relative z-10">
        <div className="flex flex-col">
          {/* Hero — the facade. "Explore the data" scrolls to the first
              showcase below (#learn). */}
          <div>
            <HeroLive onExplore={handleDiscover} />
            <div ref={learnRef} id="learn">
              <SummonerShowcase />
            </div>
          </div>

          {/* Product showcases, in the hero's language */}
          <CoachShowcase />
          <ReplayShowcase />

          {/* Membership CTA → inline pricing slide-swap.
              Jax is a fixed-height full-bleed panel with no vertical padding,
              so wrap it in the showcases' own py-20/28 rhythm — otherwise the
              gap above/below it is only half of the inter-showcase spacing. */}
          <div className="py-20 md:py-28">
            <Jax />
          </div>

          {/* Live streamers — same top rhythm as a showcase (pairs with Jax's
              pb to give the full inter-section gap). */}
          <section className="pt-20 md:pt-28">
            <StreamersInfiniteCarousel />
          </section>
        </div>
      </div>
    </div>
  );
}

function AmbientLightOverlay() {
  const { intensity } = useAmbientLight()
  const { pathname } = useLocation()
  if (intensity <= 0) return null
  // Skip on homepage — the hero image has its own lighting
  if (pathname === "/") return null
  const opacity = intensity / 100 * 0.08 // max 8% opacity
  return (
    <div className="absolute inset-0 pointer-events-none z-0 top-[400px]" style={{
      background: `radial-gradient(ellipse at 50% 0%, rgba(180,195,210,${opacity}) 0%, transparent 60%)`,
    }} />
  )
}

export function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { pathname } = useLocation()
  // Champion DETAIL pages (/champions/<id>…) get the match-page treatment: the
  // full-bleed splash hero slides UP under a floating, transparent navbar (no
  // reserved spacer, no top margin) instead of sitting below a solid bar.
  const isChampDetail = pathname.startsWith("/champions/")
  const navbarSticky = pathname === "/" || pathname === "/billing/success" || isChampDetail
  const noTopMargin = pathname === "/" || pathname === "/streamers" || isChampDetail
  const contentMargin = noTopMargin ? "mt-0" : "mt-4"
  // Phones feel cramped on the homepage's in-column content — give it more
  // horizontal breathing room there. Full-bleed hero/separator sections use
  // w-screen breakouts so they're unaffected. Other pages keep px-4.
  const horizPad = pathname === "/" ? "px-6 sm:px-8" : "px-4"
  const scrollRef = useRef<HTMLDivElement>(null)

  // Scroll to top on route change
  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0)
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <>
      <Toaster
        position="top-right"
        closeButton={false}
        toastOptions={{
          classNames: {
            title: "font-jetbrains !text-flash/40 ",
            description: "font-geist !text-flash",
            actionButton: "!bg-jade/20 uppercase font-jetbrains",
            toast: "!bg-liquirice !border-flash/20",
          },
        }}
      />
      <div
        ref={scrollRef}
        className="relative font-jetbrains subpixel-antialiased bg-liquirice text-flash w-full min-h-full flex justify-center overflow-y-scroll scrollbar-hide"
      >
        <AmbientLightOverlay />
        <div className={`xl:w-[65%] min-[2560px]:w-[55%] xl:px-0 w-full ${horizPad} flex flex-col items-center relative z-[1]`}>
          <Navbar sticky={navbarSticky} addOffsetSpacer={navbarSticky && !isChampDetail} fullBleed={isChampDetail} />
          <div className={`${contentMargin} w-full`}>{children}</div>
          {/* key on pathname: RootLayout persists across navigations, so the
              footer would otherwise reveal only once for the whole session.
              Remounting it per route re-arms its scroll-in entrance animation. */}
          <Footer key={pathname} className="mt-32" />
        </div>
      </div>
    </>
  )
}
function App() {
  return (
      <AuthProvider>
        <LiveViewerProvider>
          <ChampionPickerProvider>
            <Toaster
              position="top-right"
              theme="dark"
              richColors
              closeButton
            />

            <LiveToastOnBoot />
            <HardwareAccelerationWarning />
            <Routes>
              <Route path="/" element={<RootLayout><HomePage /></RootLayout>} />
              <Route path="/patch-notes" element={<RootLayout><PatchNotesPage /></RootLayout>} />
              <Route path="/summoners/:region/:slug/season" element={<RootLayout><SeasonPage /></RootLayout>} />
              <Route path="/summoners/:region/:slug" element={<RootLayout><SummonerPage /></RootLayout>} />
              <Route path="/dashboard/:tab?" element={<AuthGuard ><DashboardPage /></AuthGuard >} />
              <Route
                path="/learn"
                element={
                  <AuthGuard>
                    <LearnPage />
                  </AuthGuard>
                }
              />
              <Route
                path="/learn/explorer"
                element={
                  <AuthGuard>
                    <ExplorerPage />
                  </AuthGuard>
                }
              />
              <Route path="/champions/:champId/guides/:guideId" element={<RootLayout><ChampionDetailPage /></RootLayout>} />
              <Route path="/champions/:champId/:tab?" element={<RootLayout><ChampionDetailPage /></RootLayout>} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/matches/:matchId" element={<MatchPage />} />
              <Route path="/champions" element={<ChampionPage />} />
              <Route path="/leaderboards" element={<RootLayout><LeaderboardPage /></RootLayout>} />
              <Route path="/tierlist/:role?" element={<RootLayout><TierlistPage /></RootLayout>} />
              <Route path="/items/:itemId" element={<RootLayout><ItemPage /></RootLayout>} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/auth/riot/callback" element={<RiotCallbackPage />} />
              <Route path="/overlay/:region/:slug" element={<OverlayPage />} />
              <Route path="/pricing" element={<RootLayout> <PricingPlans /> </RootLayout>}/>
              <Route path="/billing/success" element={<RootLayout> <BillingSuccessPage /> </RootLayout>}/>
              <Route path="/billing/cancel" element={<RootLayout> <BillingCancelPage /> </RootLayout>}/>
              <Route path="/contact" element={<RootLayout> <ContactPage /> </RootLayout>}/>
              <Route path="/dle" element={<RootLayout> <PlaygroundPage /> </RootLayout>}/>
              <Route path="/mastery" element={<RootLayout> <TotalMasteryPage /> </RootLayout>}/>
              <Route path="/privacy" element={<RootLayout><PrivacyPolicyPage /></RootLayout>} />
              <Route path="/terms" element={<RootLayout><TermsOfServicePage /></RootLayout>} />
              <Route path="/streamers" element={<RootLayout><StreamersPage /></RootLayout>} />
              <Route path="/scout" element={<RootLayout><ScoutPage /></RootLayout>} />
              <Route
                path="/scout/new"
                element={
                  <AuthGuard>
                    <RootLayout>
                      <ScoutCreateLobbyPage />
                    </RootLayout>
                  </AuthGuard>
                }
              />
              {/* Claim page is registered BEFORE /scout/:slug so the
                  static "claim" segment wins over the dynamic slug. */}
              <Route
                path="/scout/claim/:token"
                element={
                  <RootLayout>
                    <ScoutClaimPage />
                  </RootLayout>
                }
              />
              <Route
                path="/scout/:slug"
                element={
                  <RootLayout>
                    <ScoutLobbyPage />
                  </RootLayout>
                }
              />
              <Route
                path="/scout/:slug/:tab"
                element={
                  <RootLayout>
                    <ScoutLobbyPage />
                  </RootLayout>
                }
              />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </ChampionPickerProvider>
        </LiveViewerProvider>
      </AuthProvider>
  )
}

export default App
