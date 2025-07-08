// src/server/supabase/queries.ts
import { supabase } from "./client"

type Participant = {
  teamId: number
  summonerName: string
  championId: number
  spell1Id: number
  spell2Id: number
  perks: any
}
export async function incrementProfileViews(name: string, tag: string) {
  const { data, error: fetchError } = await supabase
    .from("profiles")
    .select("views")
    .eq("name", name)
    .eq("tag", tag)
    .single()

  if (fetchError && fetchError.code !== "PGRST116") {
    throw new Error(fetchError.message)
  }

  const currentViews = data?.views ?? 0

  const { error: updateError } = await supabase
    .from("profiles")
    .upsert({ name, tag, views: currentViews + 1 })

  if (updateError) throw new Error(updateError.message)
}

export async function saveLiveGame(puuid: string, participants: Participant[]) {
  const { error } = await supabase
    .from("live_games")
    .insert([{ puuid, participants, created_at: new Date().toISOString() }])

  if (error) {
    console.error("Errore nel salvataggio live game:", error)
    throw new Error(error.message)
  }
}


export async function getChampionData(championId: number) {
  console.log("🔎 Cerco champion ID:", championId, typeof championId)

  const { data, error } = await supabase
    .from("champions")
    .select("*")
    .filter("id", "eq", championId.toString()) // compat stringa
    .maybeSingle()

  if (!data) {
    console.warn("⚠️  Nessun dato ricevuto da Supabase per:", championId)
    console.log("⬅️ Response da Supabase:", { data, error })
  }

  if (error) {
    console.error("❌ Errore nel recupero champion:", error)
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error(`Champion ID ${championId} non trovato`)
  }

  return data
}
