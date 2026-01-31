import { createContext, useContext, useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import type { Session } from "@supabase/supabase-js"

interface AuthContextType {
  session: Session | null
  loading: boolean
  nametag: string | null
  region: string | null
  plan: string | null
  puuid: string | null
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
  nametag: null,
  region: null,
  plan: null,
  puuid: null,
  isAdmin: false,
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [region, setRegion] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [nametag, setNametag] = useState<string | null>(null)
  const [plan, setPlan] = useState<string | null>(null)
  const [puuid, setPuuid] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  // evita che risposte lente sovrascrivano uno stato più recente
  const requestIdRef = useRef(0)

  const resetProfile = () => {
    setNametag(null)
    setRegion(null)
    setPlan(null)
    setPuuid(null)
    setIsAdmin(false)
  }

  const setSessionAndProfile = async (newSession: Session | null) => {
    const requestId = ++requestIdRef.current

    setSession(newSession)

    if (!newSession?.user?.id) {
      resetProfile()
      setLoading(false)
      return
    }

    setLoading(true)

    const { data, error } = await supabase
      .from("profile_players")
      .select("nametag, region, plan, puuid, is_admin", { head: false })
      .eq("profile_id", newSession.user.id)
      .single()

    // se nel frattempo è arrivata una richiesta più nuova, ignora questa risposta
    if (requestId !== requestIdRef.current) return

    if (!error && data) {
      console.log("[AuthContext] Profilo caricato:", {
        nametag: data.nametag,
        region: data.region,
        plan: data.plan,
        puuid: data.puuid,
        is_admin: data.is_admin,
      })

      setNametag(data.nametag ?? null)
      setRegion(data.region ?? null)
      setPlan(data.plan ?? null)
      setPuuid(data.puuid ?? null)
      setIsAdmin(!!data.is_admin)
    } else {
      console.warn("[AuthContext] Errore caricamento profilo o nessun dato:", error)
      resetProfile()
    }

    setLoading(false)
  }

  useEffect(() => {
    if (!supabase) {
      console.warn("[AuthContext] Supabase not initialized - missing env vars")
      resetProfile()
      setLoading(false)
      return
    }

    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSessionAndProfile(data.session)
      })
      .catch((err) => {
        console.error("getSession() failed:", err)
        resetProfile()
        setLoading(false)
      })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionAndProfile(session)
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{ session, loading, nametag, region, plan, puuid, isAdmin }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
