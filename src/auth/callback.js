import { jsx as _jsx } from "react/jsx-runtime";
// src/routes/AuthCallback.tsx
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { consumeStashedRedirect } from "@/lib/authRedirect";
export default function AuthCallback() {
    const navigate = useNavigate();
    const location = useLocation();
    useEffect(() => {
        let unsub;
        // se Discord ha restituito un errore (es. "access_denied" dopo "Annulla")
        const params = new URLSearchParams(location.search);
        const error = params.get("error");
        if (error) {
            navigate("/login", { replace: true });
            return;
        }
        // prova subito a leggere la sessione
        supabase.auth.getSession().then(({ data }) => {
            if (data.session) {
                navigate(consumeStashedRedirect(), { replace: true });
            }
            else {
                // aspetta l'evento di login (se mai arriverà)
                const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
                    if (session) {
                        navigate(consumeStashedRedirect(), { replace: true });
                    }
                    else {
                        // se resta nullo => torna al login
                        navigate("/login", { replace: true });
                    }
                });
                unsub = () => sub.subscription.unsubscribe();
            }
        });
        return () => { if (unsub)
            unsub(); };
    }, [navigate, location.search]);
    return (_jsx("div", { className: "p-6 text-flash/70 font-jetbrains", children: "Reindirizzamento in corso\u2026" }));
}
