import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      // Note on background-tab pile-up: Sonner 2.x hardcodes a
      // visibility-based pause on dismiss timers (no public prop to
      // disable), so toasts queued while the tab is hidden don't
      // count down until you come back. The actual user-pain — N
      // identical "Lobby refreshed" toasts stacked after a long away
      // — is solved by passing a stable `id` to showCyberToast: each
      // new emission replaces the previous one instead of stacking.
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
