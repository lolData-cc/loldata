import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabaseClient"
import { useAuth } from "@/context/authcontext"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader,
  DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

export function UserDialog() {
  const { session, loading } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loggingIn, setLoggingIn] = useState(false)
  const navigate = useNavigate()

  async function handleLogin() {
    setLoggingIn(true)
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    setLoggingIn(false)
    if (error) {
      alert("Login failed: " + error.message)
    } else {
      navigate("/dashboard")
    }
  }

  if (loading) return null

  if (session) {
    return (
      <Button
        className="text-flash/70 px-3 border border-flash/50 hover:bg-flash/10 rounded-sm bg-liquirice font-jetbrains py-1.5"
        onClick={() => navigate("/dashboard")}
      >
        DASHBOARD
      </Button>
    )
  }

  return (
    <Dialog>
      <DialogTrigger className="text-flash/70 rounded px-2 cursor-clicker">
        <div className="text-flash/50 px-3 border border-flash/50 hover:bg-flash/10 rounded-sm bg-liquirice font-jetbrains py-1.5">
          <span className="font-jetbrains">LOG IN</span>
        </div>
      </DialogTrigger>
      <DialogContent className="flex flex-col text-flash/70 font-jetbrains border border-flash/20 w-[350px]">
        <DialogHeader>
          <DialogTitle className="text-2xl cursor">LOG IN</DialogTitle>
          <DialogDescription>
            To access lolData <span className="underline text-jade">features</span>
          </DialogDescription>

          <div className="flex flex-col space-y-2 pt-4">
            <span className="text-sm">Email</span>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="flex flex-col space-y-2">
            <div className="flex text-sm gap-2 items-center">
              <span>Password - </span>
              <span className="text-flash/40">Forgot it?</span>
            </div>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          <DialogFooter className="pt-2">
            <Button
              variant="default"
              size="sm"
              className="w-full rounded-sm py-2"
              onClick={handleLogin}
              disabled={loggingIn}
            >
              {loggingIn ? "Logging in..." : "LOGIN"}
            </Button>
          </DialogFooter>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}
