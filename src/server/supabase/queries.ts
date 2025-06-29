// src/server/supabase/queries.ts
import { supabase } from "./client"

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
