import { Routes, Route } from "react-router-dom"

import { Navbar } from "@/components/navbar"
import SummonerPage from "@/pages/summonerpage"

import "./App.css"

function HomePage() {
  return (
    <div className="w-full max-w-none m-0 p-0">
      <Navbar />

      
      <div className="p-6">
        <p className="text-white text-xl">Benvenuto su LolData</p>
      </div>

    </div>
    
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/summoners/:region/:slug" element={<SummonerPage />} />
    </Routes>
  )
}

export default App
