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
  variant = "status"
}: CyberToastProps) {

  const isError = variant === "error"

  const borderColor = isError ? "#ff3b3b" : "#00d992"
  const textColor = isError ? "#ff3b3b" : "#00d992"
  const shadowColor = isError ? "rgba(255, 59, 59, 0.3)" : "rgba(0, 217, 146, 0.3)"

  return (
    <div className="relative" style={{ perspective: "1000px" }}>
      <div
        className="relative font-mono shadow-lg rounded-md px-6 py-4 w-[320px] border backdrop-blur-sm transform-gpu transition-transform duration-300"
        style={{
          background: "#040A0C",
          color: textColor,
          borderColor,
          transformStyle: "preserve-3d",
          transform: "rotateY(-25deg) translateZ(20px)",
          boxShadow: `0 0 20px ${shadowColor}, inset 0 1px 0 ${shadowColor}`,
        }}
      >
        <div className="flex items-center gap-3 relative z-10">
          <div className="flex-1">
            <p className="text-sm font-medium mb-1">{title}</p>
            {description && (
              <p className="text-xs opacity-60">{description}</p>
            )}
          </div>

          <div className="flex-shrink-0 flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full animate-pulse`}
              style={{ backgroundColor: textColor }}
            />
            <span className="text-xs opacity-80">{tag}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
