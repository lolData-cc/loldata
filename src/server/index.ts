import { serve } from "bun";
import { getMatchesHandler } from "./routes/getMatches";
import { getSummonerHandler } from "./routes/getSummoner"
import { incrementProfileViewHandler } from "./routes/incrementView";
import { getProfileViewsHandler } from "./routes/getViews"
import { getLiveGameHandler } from "./routes/livegame";
import { howToWinHandler } from "./routes/aihelp/howtowin";
import { getMultiRankHandler } from "./routes/multirank"



function withCors(res: Response): Response {
  const headers = new Headers(res.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  return new Response(res.body, {
    status: res.status,
    headers,
  });
}

serve({
  port: 3001,
  async fetch(req) {
    const url = new URL(req.url)
    console.log("📎 PATHNAME:", url.pathname)

    // ✅ Gestione preflight CORS
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    if (url.pathname === "/api/matches" && req.method === "POST") {
      const res = await getMatchesHandler(req);
      return withCors(res);
    }

    if (url.pathname === "/api/summoner" && req.method === "POST") {
      const res = await getSummonerHandler(req)
      return withCors(res)
    }

    if (url.pathname === "/api/profile/view" && req.method === "POST") {
      console.log("📥 Chiamata a /api/profile/view")
      const res = await incrementProfileViewHandler(req)
      return withCors(res)
    }

    if (url.pathname === "/api/profile/views" && req.method === "POST") {
      const res = await getProfileViewsHandler(req)
      return withCors(res)
    }

    if (url.pathname === "/api/livegame" && req.method === "POST") {
      const res = await getLiveGameHandler(req);
      return withCors(res);
    }

    if (url.pathname === "/api/aihelp/howtowin" && req.method === "POST") {
      const res = await howToWinHandler(req);
      return withCors(res);
    }

    if (url.pathname === "/api/multirank" && req.method === "POST") {
      const res = await getMultiRankHandler(req)
      return withCors(res)
    }




    return new Response("Not found", {
      status: 404,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
  },
});
