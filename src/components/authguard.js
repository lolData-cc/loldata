import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
// src/components/AuthGuard.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/authcontext";
export default function AuthGuard({ children }) {
    const { session, loading } = useAuth();
    const navigate = useNavigate();
    useEffect(() => {
        if (!loading && !session) {
            // Preserve Riot RSO code before redirecting to login
            const params = new URLSearchParams(window.location.search);
            const riotCode = params.get("code");
            if (riotCode) {
                sessionStorage.setItem("riot_rso_code", riotCode);
            }
            // remember where the user was headed, so login can return them there
            // (a "pure" /login with no redirect still lands on the dashboard)
            const dest = window.location.pathname + window.location.search;
            navigate(dest && dest !== "/login" ? `/login?redirect=${encodeURIComponent(dest)}` : "/login");
        }
    }, [loading, session, navigate]);
    if (loading || !session)
        return null;
    return _jsx(_Fragment, { children: children });
}
