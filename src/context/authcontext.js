import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
const AuthContext = createContext({
    session: null,
    loading: true,
    nametag: null,
    region: null,
    plan: null,
    puuid: null,
    avatarUrl: null,
    isAdmin: false,
    refreshProfile: async () => { },
});
export const AuthProvider = ({ children }) => {
    const [session, setSession] = useState(null);
    const [region, setRegion] = useState(null);
    const [loading, setLoading] = useState(true);
    const [nametag, setNametag] = useState(null);
    const [plan, setPlan] = useState(null);
    const [puuid, setPuuid] = useState(null);
    const [avatarUrl, setAvatarUrl] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    // evita che risposte lente sovrascrivano uno stato più recente
    const requestIdRef = useRef(0);
    const currentUserIdRef = useRef(null);
    const resetProfile = () => {
        setNametag(null);
        setRegion(null);
        setPlan(null);
        setPuuid(null);
        setAvatarUrl(null);
        setIsAdmin(false);
    };
    const setSessionAndProfile = async (newSession) => {
        const newUserId = newSession?.user?.id ?? null;
        // Same user — just refresh the session object, skip the DB re-fetch
        if (newUserId && newUserId === currentUserIdRef.current) {
            setSession(newSession);
            return;
        }
        currentUserIdRef.current = newUserId;
        const requestId = ++requestIdRef.current;
        setSession(newSession);
        if (!newUserId) {
            resetProfile();
            setLoading(false);
            return;
        }
        setLoading(true);
        const { data, error } = await supabase
            .from("profile_players")
            .select("nametag, region, plan, puuid, avatar_url, is_admin", { head: false })
            .eq("profile_id", newUserId)
            .single();
        // se nel frattempo è arrivata una richiesta più nuova, ignora questa risposta
        if (requestId !== requestIdRef.current)
            return;
        if (!error && data) {
            console.log("[AuthContext] Profilo caricato:", {
                nametag: data.nametag,
                region: data.region,
                plan: data.plan,
                puuid: data.puuid,
                avatar_url: data.avatar_url,
                is_admin: data.is_admin,
            });
            setNametag(data.nametag ?? null);
            setRegion(data.region ?? null);
            setPlan(data.plan ?? null);
            setPuuid(data.puuid ?? null);
            setAvatarUrl(data.avatar_url ?? null);
            setIsAdmin(!!data.is_admin);
        }
        else {
            console.warn("[AuthContext] Errore caricamento profilo o nessun dato:", error);
            resetProfile();
        }
        setLoading(false);
    };
    const refreshProfile = async () => {
        const userId = session?.user?.id;
        if (!userId)
            return;
        const { data, error } = await supabase
            .from("profile_players")
            .select("nametag, region, plan, puuid, avatar_url, is_admin", { head: false })
            .eq("profile_id", userId)
            .single();
        if (!error && data) {
            setNametag(data.nametag ?? null);
            setRegion(data.region ?? null);
            setPlan(data.plan ?? null);
            setPuuid(data.puuid ?? null);
            setAvatarUrl(data.avatar_url ?? null);
            setIsAdmin(!!data.is_admin);
        }
    };
    useEffect(() => {
        supabase.auth
            .getSession()
            .then(({ data }) => {
            setSessionAndProfile(data.session);
        })
            .catch((err) => {
            console.error("getSession() failed:", err);
            resetProfile();
            setLoading(false);
        });
        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            setSessionAndProfile(session);
        });
        return () => {
            listener.subscription.unsubscribe();
        };
    }, []);
    return (_jsx(AuthContext.Provider, { value: { session, loading, nametag, region, plan, puuid, avatarUrl, isAdmin, refreshProfile }, children: children }));
};
export const useAuth = () => useContext(AuthContext);
