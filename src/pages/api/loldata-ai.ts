// src/pages/api/loldata-ai.ts
import type { NextApiRequest, NextApiResponse } from "next"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" })
    return
  }

  try {
    const upstream = await fetch("https://ai.loldata.cc/chat/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    })

    const text = await upstream.text()
    res.status(upstream.status).send(text)
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Upstream error" })
  }
}
