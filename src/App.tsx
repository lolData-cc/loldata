import { Routes, Route } from "react-router-dom"
import { useState, useEffect } from "react";
import { Navbar } from "@/components/navbar"
import SummonerPage from "@/pages/summonerpage"




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
    
    <div className="py-8 text-center">
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
      <div className="absolute top-[20%] left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-flash/20 to-transparent z-0 pointer-events-none" />
      <div className="absolute top-[35%] left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-flash/20 to-transparent z-0 pointer-events-none" />
      <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-flash/20 to-transparent z-0 pointer-events-none transform -translate-y-1/2" />
      <div className="absolute top-[65%] left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-flash/20 to-transparent z-0 pointer-events-none" />
      <div className="absolute top-[80%] left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-flash/20 to-transparent z-0 pointer-events-none" />

      <img
        src="/demos/learndemo.png"
        alt=""
        className="w-[60%] relative z-10"
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
    <div
      className="font-jetbrains antialiased bg-liquirice text-flash w-full min-h-screen flex justify-center no-scrollbar"
    >
      <div className="xl:w-[65%] xl:px-0 w-full px-4 mt-0 flex flex-col items-center space-y-10">
        <Navbar />
        {children}
      </div>
    </div>
  );
}




function App() {
  return (
    <Routes>
      <Route path="/" element={<RootLayout><HomePage /></RootLayout>} />
      <Route path="/summoners/:region/:slug" element={<RootLayout><SummonerPage /></RootLayout>} />
    </Routes>
  )
}

export default App
