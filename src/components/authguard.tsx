// src/components/AuthGuard.tsx

import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/context/authcontext"

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !session) {
      // Preserve Riot RSO code before redirecting to login
      const params = new URLSearchParams(window.location.search)
      const riotCode = params.get("code")
      if (riotCode) {
        sessionStorage.setItem("riot_rso_code", riotCode)
      }
      navigate("/login")
    }
  }, [loading, session, navigate])

  if (loading || !session) return null

  return <>{children}</>
}
