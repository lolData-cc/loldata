import { Routes, Route } from "react-router-dom"
import { useState, useEffect } from "react";
import { Navbar } from "@/components/navbar"
import { supabase } from "@/lib/supabaseClient" // 👈 Importa PRIMA
import { Footer } from "@/components/footer"
import SummonerPage from "@/pages/summonerpage"
import DashboardPage from "@/pages/dashboard"
import LearnPage from "@/pages/learnpage"
import LoginPage from "@/pages/loginpage"
import { Toaster } from "sonner"
import AuthGuard from "@/components/authguard"

if (typeof window !== "undefined") {
  // @ts-expect-error: expose supabase on window for console debugging
window.supabase = supabase
}
// #region contexts
import { AuthProvider } from "@/context/authcontext"
//

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

function HomePage() {
  const [text, setText] = useState("")
  const [showSubtitle, setShowSubtitle] = useState(false)
  const fullText = "Welcome to lolData"

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
    <div className="w-full relative">

      <div className="py-4 text-center">
        <p className="text-jade text-6xl">{text}</p>
        <p
          className={`
          text-flash/50 text-xl pt-2 transition-opacity duration-1000
          ${showSubtitle ? "opacity-100" : "opacity-0"}
        `}
        >
          The new frontier of League of Legends improvement <br />
          featuring your personal AI assistant
        </p>
      </div>

      <div className="relative w-full flex justify-center mt-12">
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
      </div>
    </div>
  )
}

export function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Toaster position="top-right"  />
      <div
        className="font-jetbrains subpixel-antialiased bg-liquirice text-flash w-full min-h-full flex justify-center overflow-y-scroll scrollbar-hide"
      >
        <div className="xl:w-[65%] xl:px-0 w-full px-4 flex flex-col items-center ">
          <Navbar/>
          <div className="mt-10 w-full">{children}</div>
          <Footer className="mt-32" />
        </div>
      </div>
    </>
  );
}
function App() {
  return (
    <AuthProvider>
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
        <Route path="/login" element={<RootLayout><LoginPage /></RootLayout>} />
      </Routes>
    </AuthProvider>
  )
}

export default App
