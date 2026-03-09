// src/routes/AuthCallback.tsx
import { useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { supabase } from "@/lib/supabaseClient"

export default function AuthCallback() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    let unsub: (() => void) | undefined

    // se Discord ha restituito un errore (es. "access_denied" dopo "Annulla")
    const params = new URLSearchParams(location.search)
    const error = params.get("error")
    if (error) {
      navigate("/login", { replace: true })
      return
    }

    // prova subito a leggere la sessione
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        navigate("/dashboard", { replace: true })
      } else {
        // aspetta l'evento di login (se mai arriverà)
        const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
          if (session) {
            navigate("/dashboard", { replace: true })
          } else {
            // se resta nullo => torna al login
            navigate("/login", { replace: true })
          }
        })
        unsub = () => sub.subscription.unsubscribe()
      }
    })

    return () => { if (unsub) unsub() }
  }, [navigate, location.search])

  return (
    <div className="p-6 text-flash/70 font-jetbrains">
      Reindirizzamento in corso…
    </div>
  )
}
