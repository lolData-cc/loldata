import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      // Keep the dismiss timer running even when the tab is in the
      // background. Sonner 2.x pauses timers on `visibilitychange:hidden`
      // by default, which means leaving the tab in another window
      // causes auto-refresh toasts (every 10 min) to pile up and only
      // start counting down when you come back. Forcing this to false
      // makes a toast with duration=3000 always disappear after 3s.
      pauseWhenPageIsHidden={false}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background bg-liquirice group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground"
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
