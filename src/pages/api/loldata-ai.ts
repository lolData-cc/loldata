// src/pages/api/loldata-ai.ts
// import type { NextApiRequest, NextApiResponse } from "next"

// URL diverso in base all'ambiente
const UPSTREAM_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000/chat/ask"     // 👈 in locale
    : "https://ai.loldata.cc/chat/ask";    // 👈 in produzione (com'era prima)

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" })
    return
  }

  try {
    const upstream = await fetch(UPSTREAM_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    })

    const text = await upstream.text()
    res.status(upstream.status).send(text)
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Upstream error" })
  }
}
