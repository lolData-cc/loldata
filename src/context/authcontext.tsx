import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import type { Session } from "@supabase/supabase-js"

interface AuthContextType {
  session: Session | null
  loading: boolean
  nametag: string | null
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
  nametag: null,
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [nametag, setNametag] = useState<string | null>(null)

  // 🔁 Setta sessione e nametag
  const setSessionAndNametag = async (newSession: Session | null) => {
    setSession(newSession)

    if (newSession?.user?.id) {
      const { data, error } = await supabase
        .from("profile_players")
        .select("nametag")
        .eq("profile_id", newSession.user.id)
        .single()

      if (!error && data?.nametag) {
        setNametag(data.nametag)
      } else {
        setNametag(null)
      }
    } else {
      setNametag(null)
    }

    setLoading(false)
  }

  useEffect(() => {
    // 1️⃣ Primo tentativo: getSession()
    supabase.auth.getSession()
      .then(({ data }) => {
        setSessionAndNametag(data.session)
      })
      .catch((err) => {
        console.error("getSession() failed:", err)
        setLoading(false)
      })

    // 2️⃣ Secondo: onAuthStateChange (garantito al boot)
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
    <AuthContext.Provider value={{ session, loading, nametag }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
