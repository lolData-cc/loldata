  "use client"

  import type React from "react"
  import { Button } from "./ui/button"
  import { FlickeringGrid } from "./ui/flickering-grid"
  import { Separator } from "./ui/separator"

  type Props = { onDiscover?: () => void }

  export const HomeYasuo: React.FC<Props> = ({ onDiscover }) => {
    const handleCyberpunkScroll = () => {
      // Create glitch overlay effect
      const glitchOverlay = document.createElement("div")
      glitchOverlay.style.cssText = `
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 9999;
        background: linear-gradient(0deg, transparent 0%, rgba(0, 217, 146, 0.1) 50%, transparent 100%);
        animation: scanline 0.6s ease-out;
      `

      // Add scanline animation
      const style = document.createElement("style")
      style.textContent = `
        @keyframes scanline {
          0% { transform: translateY(-100%); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(100%); opacity: 0; }
        }
        @keyframes glitch {
          0%, 100% { transform: translate(0); }
          20% { transform: translate(-2px, 2px); }
          40% { transform: translate(-2px, -2px); }
          60% { transform: translate(2px, 2px); }
          80% { transform: translate(2px, -2px); }
        }
      `
      document.head.appendChild(style)
      document.body.appendChild(glitchOverlay)

      // Add glitch effect to body
      document.body.style.animation = "glitch 0.3s ease-in-out"

      // Perform the scroll with custom easing
      const targetElement = document.getElementById("learn")
      if (targetElement) {
        const startPosition = window.pageYOffset
        const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset
        const distance = targetPosition - startPosition
        const duration = 800 // milliseconds
        let start: number | null = null

        // Cyberpunk easing function - sharp and digital
        const easeInOutCubic = (t: number): number => {
          return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
        }

        const animation = (currentTime: number) => {
          if (start === null) start = currentTime
          const timeElapsed = currentTime - start
          const progress = Math.min(timeElapsed / duration, 1)

          // Add slight random jitter for digital feel
          const jitter = Math.random() * 2 - 1
          const easedProgress = easeInOutCubic(progress)

          window.scrollTo(0, startPosition + distance * easedProgress + jitter)

          if (timeElapsed < duration) {
            requestAnimationFrame(animation)
          } else {
            // Cleanup
            setTimeout(() => {
              glitchOverlay.remove()
              document.body.style.animation = ""
            }, 100)
          }
        }

        requestAnimationFrame(animation)
      }

      // Remove overlay after animation
      setTimeout(() => {
        glitchOverlay.remove()
        style.remove()
      }, 1000)

      // Call original handler if provided
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
          {/* Dots dietro */}
          <FlickeringGrid
            className="absolute inset-0 z-0 [mask-image:radial-gradient(600px_circle_at_center,white,transparent)]"
            squareSize={4}
            gridGap={6}
            color="#00d992"
            maxOpacity={0.5}
            flickerChance={0.1}
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
              className="transition-all hover:shadow-[0_0_20px_rgba(0,217,146,0.5)] hover:scale-105"
            >
              DISCOVER
            </Button>
          </div>
        </div>
        <Separator className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen border-t border-flash/20" />
      </div>
    )
  }
