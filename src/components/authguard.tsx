// src/components/AuthGuard.tsx

import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/context/authcontext"

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !session) {
      navigate("/login")
    }
  }, [loading, session, navigate])

  if (loading) return null

  return <>{children}</>
}
