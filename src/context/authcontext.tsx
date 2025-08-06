import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import type { Session } from "@supabase/supabase-js"

interface AuthContextType {
  session: Session | null
  loading: boolean
  nametag: string | null
  region: string | null
  plan: string | null // ✅ aggiunto qui
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
  nametag: null,
  region: null,
  plan: null // ✅ inizializzazione
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [region, setRegion] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [nametag, setNametag] = useState<string | null>(null)
  const [plan, setPlan] = useState<string | null>(null) 

  const setSessionAndNametag = async (newSession: Session | null) => {
    setSession(newSession)

    if (newSession?.user?.id) {
      const { data, error } = await supabase
        .from("profile_players")
        .select("nametag, region, plan", { head: false })
        .eq("profile_id", newSession.user.id)
        .single()

      if (!error && data) {
  console.log("[AuthContext] Profilo caricato:", {
    nametag: data.nametag,
    region: data.region,
    plan: data.plan,
  })

  setNametag(data.nametag ?? null)
  setRegion(data.region ?? null)
  setPlan(data.plan ?? null)
} else {
  console.warn("[AuthContext] Errore caricamento profilo o nessun dato:", error)
  setNametag(null)
  setRegion(null)
  setPlan(null)
}
    } else {
      setNametag(null)
      setRegion(null)
      setPlan(null)
    }

    setLoading(false)
  }

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data }) => {
        setSessionAndNametag(data.session)
      })
      .catch((err) => {
        console.error("getSession() failed:", err)
        setLoading(false)
      })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSessionAndNametag(session)
      }
    )

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ session, loading, nametag, region, plan }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
