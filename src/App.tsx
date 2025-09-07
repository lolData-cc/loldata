import { Routes, Route, useLocation } from "react-router-dom"
import { useState, useEffect } from "react";
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
      {/* <div className="fixed inset-0 z-0">
        <div className="relative w-full h-screen overflow-hidden">
          <img
            src="/img/sion.png"
            alt="bg"
            className="absolute top-20 left-0 w-full h-auto object-cover object-top -translate-y-10"
          />
        </div>
        <div className="absolute inset-0 bg-black/75 backdrop-blur-" />
        <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" />
      </div> */}

      <div className="relative z-10">
        <div className="flex flex-col space-y-32">
          <div>
            <HomeYasuo />

            {/* <div className="relative w-full flex justify-center mt-12">
              <div className="absolute top-[20%] left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-flash/40 to-transparent z-0 pointer-events-none" />
              <div className="absolute top-[35%] left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-flash/40 to-transparent z-0 pointer-events-none" />
              <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-flash/40 to-transparent z-0 pointer-events-none transform -translate-y-1/2" />
              <div className="absolute top-[65%] left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-flash/40 to-transparent z-0 pointer-events-none" />
              <div className="absolute top-[80%] left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-flash/40 to-transparent z-0 pointer-events-none" />

              <img
                src="/demos/learndemo.png"
                alt=""
                className="w-[65%] relative z-10 shadow-[0_15px_40px_rgba(0,0,0,0.85)]"
                loading="lazy"
                decoding="async"
                draggable={false}
              />
            </div> */}
          </div>

          <LearnPageFeature />

          {/* <PricingPlans /> */}
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
          <div className="mt-10 w-full">{children}</div>
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
            <Route path="/items/:itemId" element={<RootLayout><ItemPage /></RootLayout>} />
            <Route path="/auth/callback" element={<AuthCallback />} />
          </Routes>
        </ChampionPickerProvider>
      </LiveViewerProvider>
    </AuthProvider>
  )
}

export default App
