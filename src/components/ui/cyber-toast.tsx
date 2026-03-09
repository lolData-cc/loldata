"use client"

import { useEffect, useState } from "react"

type CyberToastProps = {
  title: string
  description?: string
  tag?: string
  variant?: "status" | "error"
}

export function CyberToast({
  title,
  description,
  tag = "SYS",
  variant = "status",
}: CyberToastProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50)
    return () => clearTimeout(timer)
  }, [])

  const isError = variant === "error"
  const accentColor = isError ? "#ff3b3b" : "#00d992"
  const glowColor = isError ? "rgba(255, 59, 59, 0.4)" : "rgba(0, 217, 146, 0.4)"
  const subtleGlow = isError ? "rgba(255, 59, 59, 0.15)" : "rgba(0, 217, 146, 0.15)"

  return (
    <div
      className="relative font-mono"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateX(0)" : "translateX(20px)",
        transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {/* Outer glow effect */}
      <div
        className="absolute -inset-[1px] rounded-lg opacity-60 blur-sm"
        style={{
          background: `linear-gradient(135deg, ${accentColor}, transparent 60%)`,
        }}
      />

      {/* Main container */}
      <div
        className="relative rounded-lg px-5 py-4 w-[340px] overflow-hidden"
        style={{
          background: "#040A0C",
          border: `1px solid ${accentColor}`,
          boxShadow: `
            0 0 20px ${subtleGlow},
            0 0 40px ${subtleGlow},
            inset 0 0 30px ${subtleGlow}
          `,
        }}
      >
        {/* Animated scan line */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(
              to bottom,
              transparent 0%,
              ${subtleGlow} 50%,
              transparent 100%
            )`,
            backgroundSize: "100% 8px",
            animation: "scanline 3s linear infinite",
            opacity: 0.5,
          }}
        />

        {/* Corner accents */}
        <div
          className="absolute top-0 left-0 w-3 h-3"
          style={{
            borderTop: `2px solid ${accentColor}`,
            borderLeft: `2px solid ${accentColor}`,
          }}
        />
        <div
          className="absolute top-0 right-0 w-3 h-3"
          style={{
            borderTop: `2px solid ${accentColor}`,
            borderRight: `2px solid ${accentColor}`,
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-3 h-3"
          style={{
            borderBottom: `2px solid ${accentColor}`,
            borderLeft: `2px solid ${accentColor}`,
          }}
        />
        <div
          className="absolute bottom-0 right-0 w-3 h-3"
          style={{
            borderBottom: `2px solid ${accentColor}`,
            borderRight: `2px solid ${accentColor}`,
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex items-start gap-4">
          {/* Status indicator */}
          <div className="flex-shrink-0 mt-1">
            <div className="relative">
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: accentColor,
                  boxShadow: `0 0 8px ${glowColor}, 0 0 16px ${glowColor}`,
                  animation: "pulse-glow 2s ease-in-out infinite",
                }}
              />
            </div>
          </div>

          {/* Text content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded"
                style={{
                  color: accentColor,
                  background: subtleGlow,
                  border: `1px solid ${accentColor}`,
                }}
              >
                {tag}
              </span>
            </div>
            <p
              className="text-sm font-medium leading-tight"
              style={{ color: accentColor }}
            >
              {title}
            </p>
            {description && (
              <p
                className="text-xs mt-1.5 leading-relaxed"
                style={{ color: `${accentColor}99` }}
              >
                {description}
              </p>
            )}
          </div>

          {/* Decorative element */}
          <div className="flex-shrink-0 flex flex-col gap-1 opacity-40">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-[2px] rounded-full"
                style={{
                  width: `${12 - i * 3}px`,
                  backgroundColor: accentColor,
                  animation: `flicker ${1 + i * 0.5}s ease-in-out infinite`,
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Bottom accent line */}
        <div
          className="absolute bottom-0 left-0 h-[2px]"
          style={{
            background: `linear-gradient(90deg, ${accentColor}, transparent)`,
            animation: "expand-line 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            animationDelay: "0.1s",
            width: "0%",
          }}
        />
      </div>

      <style jsx>{`
        @keyframes scanline {
          0% {
            transform: translateY(-100%);
          }
          100% {
            transform: translateY(100%);
          }
        }

        @keyframes pulse-glow {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(0.9);
          }
        }

        @keyframes flicker {
          0%,
          100% {
            opacity: 0.4;
          }
          50% {
            opacity: 1;
          }
        }

        @keyframes expand-line {
          to {
            width: 70%;
          }
        }
      `}</style>
    </div>
  )
}
