"use client"

import type React from "react"
import { Button } from "./ui/button"
import { FlickeringGrid } from "./ui/flickering-grid"
import { Separator } from "./ui/separator"

type Props = { onDiscover?: () => void }

export const HomeYasuo: React.FC<Props> = ({ onDiscover }) => {
  const handleCyberpunkScroll = () => {
    // Hexagonal grid overlay
    const hexGrid = document.createElement("div")
    hexGrid.style.cssText = `
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 10000;
      background-image: 
        linear-gradient(30deg, rgba(0, 217, 146, 0.03) 12%, transparent 12.5%, transparent 87%, rgba(0, 217, 146, 0.03) 87.5%, rgba(0, 217, 146, 0.03)),
        linear-gradient(150deg, rgba(0, 217, 146, 0.03) 12%, transparent 12.5%, transparent 87%, rgba(0, 217, 146, 0.03) 87.5%, rgba(0, 217, 146, 0.03)),
        linear-gradient(30deg, rgba(0, 217, 146, 0.03) 12%, transparent 12.5%, transparent 87%, rgba(0, 217, 146, 0.03) 87.5%, rgba(0, 217, 146, 0.03)),
        linear-gradient(150deg, rgba(0, 217, 146, 0.03) 12%, transparent 12.5%, transparent 87%, rgba(0, 217, 146, 0.03) 87.5%, rgba(0, 217, 146, 0.03));
      background-size: 80px 140px;
      background-position: 0 0, 0 0, 40px 70px, 40px 70px;
      animation: hexPulse 0.8s ease-in-out;
    `
    document.body.appendChild(hexGrid)

    // Edge glow effect
    const edgeGlow = document.createElement("div")
    edgeGlow.style.cssText = `
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 10001;
      box-shadow: inset 0 0 100px rgba(0, 217, 146, 0.2), inset 0 0 50px rgba(0, 217, 146, 0.1);
      animation: edgePulse 0.8s ease-in-out;
    `
    document.body.appendChild(edgeGlow)

    // Scanline overlay
    const scanlineOverlay = document.createElement("div")
    scanlineOverlay.style.cssText = `
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 10002;
      background: repeating-linear-gradient(
        0deg,
        rgba(0, 217, 146, 0.03) 0px,
        rgba(0, 217, 146, 0.03) 1px,
        transparent 1px,
        transparent 2px
      );
    `
    document.body.appendChild(scanlineOverlay)

    // Primary scan beam
    const scanBeam = document.createElement("div")
    scanBeam.style.cssText = `
      position: fixed;
      left: 0;
      right: 0;
      height: 80px;
      pointer-events: none;
      z-index: 10003;
      background: linear-gradient(180deg, 
        transparent 0%, 
        rgba(0, 217, 146, 0.15) 30%,
        rgba(0, 217, 146, 0.25) 50%, 
        rgba(0, 217, 146, 0.15) 70%,
        transparent 100%
      );
      box-shadow: 0 0 30px rgba(0, 217, 146, 0.3);
      animation: scanBeam 0.8s cubic-bezier(0.87, 0, 0.13, 1);
    `
    document.body.appendChild(scanBeam)

    // Secondary scan beam (delayed)
    const scanBeam2 = document.createElement("div")
    scanBeam2.style.cssText = `
      position: fixed;
      left: 0;
      right: 0;
      height: 40px;
      pointer-events: none;
      z-index: 10003;
      background: linear-gradient(180deg, 
        transparent 0%, 
        rgba(0, 217, 146, 0.1) 40%,
        rgba(0, 217, 146, 0.15) 50%, 
        rgba(0, 217, 146, 0.1) 60%,
        transparent 100%
      );
      animation: scanBeam2 0.8s cubic-bezier(0.87, 0, 0.13, 1) 0.15s;
    `
    document.body.appendChild(scanBeam2)

    // Circuit trace lines
    const circuitContainer = document.createElement("div")
    circuitContainer.style.cssText = `
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 9999;
      overflow: hidden;
    `

    // Create circuit lines
    for (let i = 0; i < 4; i++) {
      const circuit = document.createElement("div")
      const isVertical = i % 2 === 0
      const position = 20 + i * 25

      circuit.style.cssText = `
        position: absolute;
        ${isVertical ? `left: ${position}%; top: 0; width: 1px; height: 100%;` : `top: ${position}%; left: 0; width: 100%; height: 1px;`}
        background: linear-gradient(${isVertical ? "180deg" : "90deg"}, 
          transparent 0%, 
          rgba(0, 217, 146, 0.4) 50%, 
          transparent 100%
        );
        opacity: 0;
        animation: circuitTrace 0.6s ease-out ${i * 0.1}s;
      `
      circuitContainer.appendChild(circuit)
    }
    document.body.appendChild(circuitContainer)

    // Data stream effect
    const dataStream = document.createElement("div")
    dataStream.style.cssText = `
      position: fixed;
      right: 20px;
      top: 0;
      width: 100px;
      height: 100%;
      pointer-events: none;
      z-index: 10004;
      font-family: 'Courier New', monospace;
      font-size: 10px;
      color: rgba(0, 217, 146, 0.3);
      overflow: hidden;
      opacity: 0;
      animation: dataStreamFade 0.8s ease-in-out;
    `

    const dataChars = "01アイウエオカキクケコ"
    for (let i = 0; i < 15; i++) {
      const char = document.createElement("div")
      char.textContent = dataChars[Math.floor(Math.random() * dataChars.length)]
      char.style.cssText = `
        position: absolute;
        top: ${Math.random() * 100}%;
        left: ${Math.random() * 80}px;
        animation: dataFlow 0.8s linear ${Math.random() * 0.3}s;
      `
      dataStream.appendChild(char)
    }
    document.body.appendChild(dataStream)

    // Enhanced particles with varied sizes and speeds
    const particleContainer = document.createElement("div")
    particleContainer.style.cssText = `
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 9998;
      overflow: hidden;
    `

    for (let i = 0; i < 20; i++) {
      const particle = document.createElement("div")
      const size = Math.random() * 2 + 0.5
      const left = Math.random() * 100
      const delay = Math.random() * 0.4
      const duration = 0.6 + Math.random() * 0.4

      particle.style.cssText = `
        position: absolute;
        left: ${left}%;
        top: -10px;
        width: ${size}px;
        height: ${size}px;
        background: #00d992;
        opacity: ${0.3 + Math.random() * 0.3};
        box-shadow: 0 0 ${size * 3}px rgba(0, 217, 146, 0.5);
        border-radius: ${Math.random() > 0.5 ? "50%" : "0"};
        animation: particleFall ${duration}s linear ${delay}s;
      `
      particleContainer.appendChild(particle)
    }
    document.body.appendChild(particleContainer)

    // Glitch frames at key moments
    const glitchOverlay = document.createElement("div")
    glitchOverlay.style.cssText = `
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 10005;
      opacity: 0;
      animation: glitchFlash 0.8s ease-in-out;
    `
    document.body.appendChild(glitchOverlay)

    const style = document.createElement("style")
    style.textContent = `
      @keyframes hexPulse {
        0%, 100% { opacity: 0; }
        50% { opacity: 1; }
      }
      @keyframes edgePulse {
        0%, 100% { opacity: 0; }
        30%, 70% { opacity: 1; }
      }
      @keyframes scanBeam {
        0% { transform: translateY(-100%); opacity: 0; }
        10% { opacity: 1; }
        90% { opacity: 1; }
        100% { transform: translateY(100vh); opacity: 0; }
      }
      @keyframes scanBeam2 {
        0% { transform: translateY(-100%); opacity: 0; }
        10% { opacity: 1; }
        90% { opacity: 1; }
        100% { transform: translateY(100vh); opacity: 0; }
      }
      @keyframes circuitTrace {
        0% { opacity: 0; transform: scaleY(0); }
        50% { opacity: 1; }
        100% { opacity: 0; transform: scaleY(1); }
      }
      @keyframes dataStreamFade {
        0%, 100% { opacity: 0; }
        30%, 70% { opacity: 1; }
      }
      @keyframes dataFlow {
        0% { transform: translateY(0); opacity: 0; }
        10% { opacity: 1; }
        90% { opacity: 1; }
        100% { transform: translateY(100vh); opacity: 0; }
      }
      @keyframes particleFall {
        0% { transform: translateY(0) scale(1) rotate(0deg); opacity: 0.6; }
        100% { transform: translateY(100vh) scale(0.2) rotate(180deg); opacity: 0; }
      }
      @keyframes glitchFlash {
        0%, 100% { opacity: 0; }
        10% { opacity: 0.05; background: linear-gradient(90deg, transparent 0%, rgba(0, 217, 146, 0.1) 50%, transparent 100%); transform: translateX(0); }
        11% { transform: translateX(-5px); }
        12% { transform: translateX(5px); }
        13% { transform: translateX(0); opacity: 0; }
        40% { opacity: 0.03; background: linear-gradient(180deg, transparent 0%, rgba(0, 217, 146, 0.08) 50%, transparent 100%); }
        41% { opacity: 0; }
      }
    `
    document.head.appendChild(style)

    const targetElement = document.getElementById("learn")
    if (targetElement) {
      const startPosition = window.pageYOffset
      const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset
      const distance = targetPosition - startPosition
      const duration = 800
      let start: number | null = null

      // Sharp cyberpunk easing
      const easeOutExpo = (t: number): number => {
        return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
      }

      const animation = (currentTime: number) => {
        if (start === null) start = currentTime
        const timeElapsed = currentTime - start
        const progress = Math.min(timeElapsed / duration, 1)

        // Micro jitter for digital feel, but only during movement
        const jitter = progress < 0.95 ? Math.random() * 1 - 0.5 : 0
        const easedProgress = easeOutExpo(progress)

        window.scrollTo(0, startPosition + distance * easedProgress + jitter)

        if (timeElapsed < duration) {
          requestAnimationFrame(animation)
        } else {
          // Ensure exact final position
          window.scrollTo(0, targetPosition)

          // Start cleanup
          setTimeout(() => {
            scanBeam.remove()
            scanBeam2.remove()
            scanlineOverlay.remove()
            hexGrid.remove()
            edgeGlow.remove()
            circuitContainer.remove()
            dataStream.remove()
            particleContainer.remove()
            glitchOverlay.remove()
          }, 200)
        }
      }

      requestAnimationFrame(animation)
    }

    // Final cleanup
    setTimeout(() => {
      scanBeam.remove()
      scanBeam2.remove()
      scanlineOverlay.remove()
      hexGrid.remove()
      edgeGlow.remove()
      circuitContainer.remove()
      dataStream.remove()
      particleContainer.remove()
      glitchOverlay.remove()
      style.remove()
    }, 1400)

    if (onDiscover) {
      onDiscover()
    }
  }

  return (
    <div className="relative w-full">
      <div
        className="
     relative w-full mx-auto
     max-w-screen-2xl           
    h-[70vh] md:h-[80vh] lg:h-[93vh]  
     overflow-hidden rounded-lg
   "
      >
        <FlickeringGrid
          className="absolute inset-0 z-0 [mask-image:radial-gradient(600px_circle_at_center,white,transparent)]"
          squareSize={4}
          gridGap={6}
          color="#00d992"
          maxOpacity={0.7}
          flickerChance={0.2}
          width={1388}
          height={800}
        />

        {/* Immagine sopra i dots */}
        <div
          className="
            absolute inset-0 z-10
            bg-[url(/img/Yasuo_3.png)] bg-cover bg-center grayscale
          "
          aria-hidden
        />

        {/* Contenuto in primo piano */}
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2.5 p-2.5 select-none">
          <div className="[text-shadow:0px_4px_32px_#00d992] font-jetbrains font-medium text-jade text-3xl sm:text-4xl md:text-5xl leading-normal text-center px-4">
            The future of Improvement
          </div>

          <p className="[text-shadow:0px_4px_31.7px_#eae7e7] font-jetbrains font-light text-[#eae6e6] text-base sm:text-lg md:text-xl text-center leading-normal px-4">
            The new frontier of League of Legends improvement
            <br />
            featuring your personal AI assistant
          </p>

          <Button
            variant="solid"
            onClick={handleCyberpunkScroll}
            className="relative transition-all hover:shadow-[0_0_30px_rgba(0,217,146,0.8),0_0_60px_rgba(0,217,146,0.4)] hover:scale-110 hover:brightness-125 active:scale-95"
          >
            <span className="relative z-10">DISCOVER</span>
          </Button>
        </div>
      </div>
      <Separator className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen border-t border-flash/20" />
    </div>
  )
}
