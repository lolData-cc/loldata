// AnimatedSearchTrigger.tsx
import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils" // se non hai cn, sostituisci con una semplice join di classi
import { Search } from "lucide-react"

export type AnimatedSearchTriggerProps = {
  label?: string
  className?: string
  iconOnlyClassName?: string
  showShortcut?: boolean
  shortcut?: string
} & React.ButtonHTMLAttributes<HTMLButtonElement>

/**
 * Pulsante trigger riutilizzabile per <DialogTrigger asChild> con micro-animazioni.
 * - Tutta l'animazione è incapsulata qui.
 * - Reattivo: su mobile mostra solo l'icona, su md+ mostra label.
 */
export const AnimatedSearchTrigger = React.forwardRef<HTMLButtonElement, AnimatedSearchTriggerProps>(
  (
    {
      label = "SEARCH A PLAYER",
      className,
      iconOnlyClassName,
      showShortcut = true,
      shortcut = "CTRL+K",
      ...props
    },
    ref
  ) => {
    return (
      <motion.button
        ref={ref}
        type="button"
        aria-haspopup="dialog"
        // NB: aria-expanded verrà gestito dal Dialog se serve; qui può restare non controllato
        className={cn(
          // base styles
          "relative isolate inline-flex items-center justify-center rounded-sm font-jetbrains cursor-clicker",
          "border border-flash/10 bg-jade/10 text-jade shadow-sm ring-1 ring-white/5",
          "transition-colors duration-300",
          // sizing (desktop)
          "px-3 py-2 h-full md:px-3 md:py-2",
          className
        )}
        initial={{ y: 0, boxShadow: "0 0 0 rgba(0,0,0,0)" }}
        whileHover={{ y: -2 }}
        whileTap={{ y: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        {...props}
      >
        {/* Glow morbido sotto (on hover) */}
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-sm -z-10"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          style={{
            boxShadow: "0 12px 30px rgba(16, 185, 129, 0.15)", // jade-ish
          }}
        />

        {/* Effetto "sheen" diagonale al passaggio */}
        <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-sm">
          <motion.span
            className="absolute -inset-y-8 -left-16 w-24 rotate-12 bg-white/20 blur-md"
            initial={{ x: -40, opacity: 0 }}
            whileHover={{ x: 260, opacity: 0.9 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </span>

        {/* Contenuto responsive */}
        <span className={cn("hidden md:inline-flex items-center gap-2")}> {label} </span>
        <span className={cn("md:hidden inline-flex", iconOnlyClassName)}>
          <Search className="w-3 h-3" />
        </span>

        {/* Scia bordo su hover */}
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-sm"
          initial={{ borderColor: "rgba(255,255,255,0.06)" }}
          whileHover={{ borderColor: "rgba(16,185,129,0.35)" }}
          transition={{ duration: 0.25 }}
          style={{ border: "1px solid" }}
        />

        {/* Shortcut pill (solo desktop) */}
        {showShortcut && (
          <span className="ml-2 hidden md:inline-flex items-center gap-1 text-xs text-citrine/80 bg-citrine/20 px-1.5 py-0.5 border border-citrine/10 rounded-sm">
            <kbd className="font-mono">{shortcut}</kbd>
          </span>
        )}
      </motion.button>
    )
  }
)
AnimatedSearchTrigger.displayName = "AnimatedSearchTrigger"

// -------------------------------------------------------------
// USO NEL TUO FILE SearchDialog.tsx
// Sostituisci i due <DialogTrigger asChild> con:
/*
  <DialogTrigger asChild>
    <AnimatedSearchTrigger />
  </DialogTrigger>
*/

// Se vuoi mantenere classi custom del tuo tema:
/*
  <DialogTrigger asChild>
    <AnimatedSearchTrigger
      className="bg-jade/10 text-jade hover:bg-jade/20 px-3 py-2"
    />
  </DialogTrigger>
*/

// Opzionale: disattivare pill di shortcut o cambiare testo
/*
  <AnimatedSearchTrigger showShortcut={false} label="CERCA GIOCATORE" />
*/
