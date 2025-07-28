import { API_BASE_URL } from "@/config"

export async function checkUserFlags(name: string, tag: string): Promise<{
  isPro: boolean;
  isStreamer: boolean;
}> {
  const nametag = `${name}#${tag}`.toLowerCase();

  try {
    const res = await fetch(`${API_BASE_URL}/api/pro/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nametag }),
    });

    if (!res.ok) return { isPro: false, isStreamer: false };

    const data = await res.json();
    console.log("🎯 Risposta da /api/pro/check:", data);

    return {
      isPro: !!data.pro,
      isStreamer: !!data.streamer, // <--- qui potrebbe essere undefined
    };
  } catch (err) {
    console.error("❌ Error fetching user flags:", err);
    return { isPro: false, isStreamer: false };
  }
}
