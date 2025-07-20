import { Routes, Route } from "react-router-dom"

import { Navbar } from "@/components/navbar"
import SummonerPage from "@/pages/summonerpage"


function HomePage() {

  return (
    <div className="w-full">
      <div className="p-6">
        <p className="text-white text-xl">Benvenuto su LolData</p>
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
