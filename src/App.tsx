import { Routes, Route, useLocation } from "react-router-dom"
import { useState, useEffect, useRef } from "react";
import { Navbar } from "@/components/navbar"
import { supabase } from "@/lib/supabaseClient"
import { Footer } from "@/components/footer"
import SummonerPage from "@/pages/summonerpage"
import DashboardPage from "@/pages/dashboard"
import LearnPage from "@/pages/learnpage"
import LoginPage from "@/pages/loginpage"
import MatchPage from "@/pages/matchpage"
import { Toaster } from "sonner"
import AuthGuard from "@/components/authguard"
import { LiveViewerProvider } from "./context/liveviewercontext";
import { LiveToastOnBoot } from "@/components/livetoastonboot"
import { DotPattern } from "@/components/ui/dot-pattern"
if (typeof window !== "undefined") {
  // @ts-expect-error: expose supabase on window for console debugging
  window.supabase = supabase
}
// #region contexts
import { AuthProvider } from "@/context/authcontext"
import ItemPage from "./pages/itempage";
import ChampionPage from "./pages/championpage";
import { ChampionPickerProvider } from "@/context/championpickercontext";
import ChampionDetailPage from "./pages/championdetailpage";
import StreamersInfiniteCarousel from "./components/streeamerscarousel";
import { PricingPlans } from "./components/pricingplans";
import AuthCallback from "./auth/callback";
import WordShiftOnScroll from "./components/features1";
import { LearnPageFeature } from "./components/learnpagefeature";
import { SearchPageFeature } from "./components/searchpagefeature";
import SearchDialogMock from "./components/searchdialogmock";
import { Button } from "./components/ui/button";
import { Jax } from "./components/areyouwithus";
import { HomeYasuo } from "./components/home";
import LeaderboardPage from "@/pages/leaderboardpage";
import PlaygroundPage from "./pages/playgroundpage";
//

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}



function HomePage() {
  const [text, setText] = useState("")
  const [showSubtitle, setShowSubtitle] = useState(false)
  const fullText = "The future of Improvement"

  const learnRef = useRef<HTMLDivElement | null>(null);

  const handleDiscover = () => {
    if (learnRef.current) {
      const top = learnRef.current.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: top - 80, // 👈 offset di 80px (cambia a piacere)
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    let cancelled = false
    const typeWriter = async () => {
      for (let i = 0; i < fullText.length; i++) {
        if (cancelled) return
        setText((prev) => prev + fullText[i])
        await new Promise((resolve) => setTimeout(resolve, 50))
      }
      if (!cancelled) {
        setTimeout(() => {
          setShowSubtitle(true)
        }, 200)
      }
    }
    typeWriter()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="relative min-h-screen">
      <div className="relative z-10">
        <div className="flex flex-col space-y-16">
          <div>
            <HomeYasuo onDiscover={handleDiscover} />
            <div ref={learnRef} id="learn">
              <LearnPageFeature />
            </div>
          </div>
            
          <SearchPageFeature />
          <Jax />
          <section className="mt-8">
            <StreamersInfiniteCarousel />
          </section>

        </div>
      </div>
    </div>
  );
}

export function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { pathname } = useLocation()
  const navbarSticky = pathname === "/"
  const contentMargin = pathname === "/" ? "mt-0" : "mt-10"

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
        className="font-jetbrains subpixel-antialiased bg-liquirice text-flash w-full min-h-full flex justify-center overflow-y-scroll scrollbar-hide"
      >
        <div className="xl:w-[65%] xl:px-0 w-full px-4 flex flex-col items-center">
          <Navbar sticky={navbarSticky} />
          <div className={`${contentMargin} w-full`}>{children}</div>
          <Footer className="mt-32" />
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
            <Routes>
              <Route path="/" element={<RootLayout><HomePage /></RootLayout>} />
              <Route path="/summoners/:region/:slug" element={<RootLayout><SummonerPage /></RootLayout>} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route
                path="/learn"
                element={
                  <AuthGuard>
                    <LearnPage />
                  </AuthGuard>
                }
              />
              <Route path="/champions/:champId" element={<RootLayout><ChampionDetailPage /></RootLayout>} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/matches/:matchId" element={<MatchPage />} />
              <Route path="/champions" element={<ChampionPage />} />
              <Route path="/leaderboards" element={<RootLayout><LeaderboardPage /></RootLayout>} />
              <Route path="/items/:itemId" element={<RootLayout><ItemPage /></RootLayout>} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/pricing" element={<RootLayout> <PricingPlans /> </RootLayout>}/>
              <Route path="/playground" element={<RootLayout> <PlaygroundPage /> </RootLayout>}/>
            </Routes>
          </ChampionPickerProvider>
        </LiveViewerProvider>
      </AuthProvider>
  )
}

export default App
