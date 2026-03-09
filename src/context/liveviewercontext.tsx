// context/liveviewercontext.tsx
import { createContext, useCallback, useContext, useState } from "react"
import { LiveViewer } from "@/components/liveviewer"

type Params = { puuid: string; riotId: string; region: string }

type Ctx = {
  openWith: (params: Params) => void
}

const LiveViewerCtx = createContext<Ctx | undefined>(undefined)

export function LiveViewerProvider({ children }: { children: React.ReactNode }) {
  const [params, setParams] = useState<Params | null>(null)
  const [open, setOpen] = useState(false)

  const openWith = useCallback((p: Params) => {
    setParams(p)
    setOpen(true)
  }, [])

  return (
    <LiveViewerCtx.Provider value={{ openWith }}>
      {children}
      {/* montiamo il LiveViewer “nascosto” e lo controlliamo noi */}
      {params && (
        <LiveViewer
          puuid={params.puuid}
          riotId={params.riotId}
          region={params.region}
          controlledOpen={open}
          onControlledOpenChange={setOpen}
        />
      )}
    </LiveViewerCtx.Provider>
  )
}

export function useLiveViewer() {
  const ctx = useContext(LiveViewerCtx)
  if (!ctx) throw new Error("useLiveViewer must be used within LiveViewerProvider")
  return ctx
}
