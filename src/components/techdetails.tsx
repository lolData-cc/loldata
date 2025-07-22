import { useEffect, useState } from "react"

export default function UltraTechBackground() {
  const [currentTime, setCurrentTime] = useState("")

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      )
    }

    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed inset-0 z-0 pointer-events-none select-none font-mono overflow-hidden bg-liquorice">
      {/* Scanline / tech glow overlay */}
      <div className="absolute inset-0 animate-pulse-slow bg-gradient-to-b from-transparent via-cyan-300/10 to-transparent" />


      {/* Tech HUD elements (faded) */}
      <div className="absolute inset-0 text-cyan-400 font-mono text-xs opacity-20 blur-sm mix-blend-soft-light">


        {/* Structural Lines */}
        <div className="absolute top-0 left-1/4 w-px h-full bg-cyan-400/10" />
        <div className="absolute top-0 right-1/4 w-px h-full bg-cyan-400/10" />
        <div className="absolute top-1/4 left-0 w-full h-px bg-cyan-400/10" />
        <div className="absolute bottom-1/4 left-0 w-full h-px bg-cyan-400/10" />

        {/* Top Left Readout */}
        <div className="absolute top-8 left-8 space-y-2">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-cyan-400 animate-pulse" />
            <span className="text-cyan-300">EDV 51.2 / H</span>
          </div>
          <div className="text-gray-400">TOT 90.2 / S</div>
          <div className="text-gray-400">TIS 91.3 / H</div>
        </div>

        {/* Top Right Status */}
        <div className="absolute top-8 right-8 text-right space-y-2">
          <div className="text-cyan-300">{currentTime}</div>
          <div className="text-gray-400">CORE VITAL [+]</div>
          <div className="flex items-center justify-end space-x-2">
            <span className="text-gray-400">STATUS</span>
            <div className="w-2 h-2 bg-green-400 animate-pulse" />
          </div>
        </div>

        {/* Center Tech Frame */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="relative">
            <div className="w-24 h-24 border-2 border-cyan-400/30" />
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 w-px h-8 bg-cyan-400/20" />
            <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 text-center">
              <div className="text-cyan-300">STRAIN / -20.7%</div>
            </div>
          </div>
        </div>

        {/* Bottom Left Frame */}
        <div className="absolute bottom-20 left-16">
          <div className="relative">
            <div className="w-16 h-16 border-2 border-cyan-400/30" />
            <div className="absolute -right-8 top-1/2 transform -translate-y-1/2 w-8 h-px bg-cyan-400/20" />
            <div className="absolute -bottom-8 left-0">
              <div className="text-cyan-300">NEU 30% / R</div>
              <div className="text-blue-400 bg-blue-900/20 px-2 py-1 mt-1 rounded">VIEW DETAILS ▼</div>
            </div>
          </div>
        </div>

        {/* Bottom Right Status */}
        <div className="absolute bottom-8 right-8 text-right space-y-3">
          <div className="flex items-center justify-end space-x-2">
            <span className="text-gray-400">EDV 51.2 / H</span>
            <div className="w-2 h-2 bg-cyan-400 animate-pulse" />
          </div>
          <div>
            <div className="text-cyan-300">TRF 12.2 / H SCAN</div>
            <div className="text-blue-400 bg-blue-900/20 px-2 py-1 rounded">VIEW DETAILS ▼</div>
          </div>
        </div>

        {/* Section Labels */}
        <div className="absolute bottom-4 left-1/4 transform -translate-x-1/2">
          <div className="bg-blue-900/20 px-3 py-1 rounded text-cyan-300">SEC 001</div>
        </div>
        <div className="absolute bottom-4 right-1/4 transform translate-x-1/2">
          <div className="bg-blue-900/20 px-3 py-1 rounded text-cyan-300">SEC 002</div>
        </div>

        {/* Corner Indicator */}
        <div className="absolute top-4 left-4 w-3 h-3 border border-cyan-400/30" />
        <div className="absolute bottom-4 right-4 text-right space-y-1">
          <div className="text-cyan-300">XII</div>
          <div className="text-gray-400">DF ON</div>
        </div>

        {/* Decorative Dots */}
        <div className="absolute top-1/3 left-1/3 w-1 h-1 bg-cyan-400 animate-pulse" />
        <div className="absolute top-2/3 right-1/3 w-1 h-1 bg-cyan-400 animate-pulse" />
        <div className="absolute bottom-1/3 left-2/3 w-1 h-1 bg-cyan-400 animate-pulse" />
      </div>
    </div>
  )
}
