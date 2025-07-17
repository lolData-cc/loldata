import { supabase } from "./client";
export async function saveLiveGame(puuid, participants) {
    const { error } = await supabase
        .from("live_games")
        .insert([{ puuid, participants, created_at: new Date().toISOString() }]);
    if (error) {
        console.error("Errore nel salvataggio live game:", error);
        throw new Error(error.message);
    }
}
export async function getChampionData(championId) {
    console.log("🔎 Cerco champion ID:", championId, typeof championId);
    const { data, error } = await supabase
        .from("champions")
        .select("*")
        .filter("id", "eq", championId.toString()) // compat stringa
        .maybeSingle();
    if (!data) {
        console.warn("⚠️  Nessun dato ricevuto da Supabase per:", championId);
        console.log("⬅️ Response da Supabase:", { data, error });
    }
    if (error) {
        console.error("❌ Errore nel recupero champion:", error);
        throw new Error(error.message);
    }
    if (!data) {
        throw new Error(`Champion ID ${championId} non trovato`);
    }
    return data;
}
export async function getRolesMap() {
    const { data, error } = await supabase
        .from("champions")
        .select("id, roles");
    if (error) {
        console.error("❌ Errore Supabase:", error);
        throw new Error("Impossibile caricare i ruoli dei champion");
    }
    const map = {};
    for (const champ of data || []) {
        map[champ.id] = champ.roles;
    }
    return map;
}
export async function getMatchupTips(champ1Id, champ2Id) {
    const { data, error } = await supabase
        .from("matchups")
        .select("tips")
        .or(`champ1id.eq.${champ1Id},champ2id.eq.${champ2Id}`)
        .or(`champ1id.eq.${champ2Id},champ2id.eq.${champ1Id}`)
        .limit(1)
        .single();
    if (error) {
        console.error("❌ Supabase matchup error:", error);
        return null;
    }
    return data?.tips || null;
}
