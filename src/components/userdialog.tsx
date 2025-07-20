import { UserRound } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabaseClient"
import type { Session } from "@supabase/supabase-js"

export function UserDialog() {
    const [session, setSession] = useState<Session | null>(null)
    const [initialLoading, setInitialLoading] = useState(true)
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)

    const navigate = useNavigate()

    useEffect(() => {
        const fetchSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            setSession(session)
            setInitialLoading(false)
        }

        fetchSession()

        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
        })

        return () => listener.subscription.unsubscribe()
    }, [])

    async function handleLogin() {
        setLoading(true)
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        setLoading(false)

        if (error) {
            alert("Login failed: " + error.message)
        } else {
            navigate("/dashboard")
        }
    }

    if (initialLoading) return null

    if (session) {
        return (
            <Button
                className="text-flash/50 px-3 border border-flash/50 hover:bg-flash/10 rounded-sm bg-liquirice font-jetbrains py-1.5"
                onClick={() => navigate("/dashboard")}
            >
                DASHBOARD
            </Button>
        )
    }

    return (
        <Dialog>
            <DialogTrigger className="text-flash/50 rounded px-2">
                <div className="text-flash/50 px-3 border border-flash/50 hover:bg-flash/10 rounded-sm bg-liquirice font-jetbrains py-1.5">
                    <span className="font-jetbrains">LOG IN</span>
                </div>
            </DialogTrigger>
            <DialogContent className="flex flex-col text-flash font-jetbrains border border-flash/20 w-[350px]">
                <DialogHeader>
                    <DialogTitle className="text-2xl">LOG IN</DialogTitle>
                    <DialogDescription>
                        To access lolData <span className="underline text-jade">features</span>
                    </DialogDescription>

                    <div className="flex flex-col space-y-2 pt-4">
                        <span className="text-sm">Email</span>
                        <Input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col space-y-2">
                        <div className="flex text-sm gap-2 items-center">
                            <span>Password - </span>
                            <span className="text-flash/40">Forgot it?</span>
                        </div>
                        <Input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <DialogFooter className="pt-2">
                        <Button
                            variant="default"
                            size="sm"
                            className="w-full rounded-sm py-2"
                            onClick={handleLogin}
                            disabled={loading}
                        >
                            {loading ? "Logging in..." : "LOGIN"}
                        </Button>
                    </DialogFooter>
                </DialogHeader>
            </DialogContent>
        </Dialog>
    )
}
