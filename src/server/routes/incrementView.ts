// src/server/routes/incrementView.ts
import { incrementProfileViews } from "../supabase/queries"

export async function incrementProfileViewHandler(req: Request): Promise<Response> {
  const { name, tag } = await req.json()

  if (!name || !tag) return new Response("Missing params", { status: 400 })

  try {
    await incrementProfileViews(name, tag)
    return new Response("OK", { status: 200 })
  } catch (e) {
    console.error("Errore Supabase:", e)
    return new Response("Errore interno", { status: 500 })
  }
}
