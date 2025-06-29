// src/server/routes/getMatches.ts
import { getAccountByRiotId, getMatchIdsByPuuid, getMatchDetails } from "../riot";

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function getMatchesHandler(req: Request): Promise<Response> {
  try {
    const body = await req.json()
    const { name, tag } = body

    if (!name || !tag) {
      console.error("Missing name or tag")
      return new Response("Missing name or tag", { status: 400 })
    }

    const account = await getAccountByRiotId(name, tag)
    const matchIds = await getMatchIdsByPuuid(account.puuid, 5)

    const matchesWithWin = []

    for (const matchId of matchIds) {
      try {
        const match = await getMatchDetails(matchId)

        const participant = match.info.participants.find(
          (p: any) => p.puuid === account.puuid
        )

        const win = participant?.win ?? false
        const championName = participant?.championName ?? "Unknown"

        matchesWithWin.push({ match, win, championName })

        await delay(150) // 🔁 Attendi 150ms prima della prossima richiesta
      } catch (err) {
        console.error("❌ Errore nel match ID:", matchId, err)
      }
    }

    return Response.json({ matches: matchesWithWin })
  } catch (err) {
    console.error("❌ Errore nel backend:", err)
    return new Response("Internal server error", { status: 500 })
  }
}
