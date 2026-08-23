import { API_BASE_URL } from "@/config";
export async function checkUserFlags(name, tag) {
    try {
        const res = await fetch(`${API_BASE_URL}/api/pro/check`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, tag }), // <— inviamo name+tag
        });
        if (!res.ok)
            return { isPro: false, isStreamer: false };
        const data = await res.json();
        return { isPro: !!data.pro, isStreamer: !!data.streamer };
    }
    catch (e) {
        console.error(e);
        return { isPro: false, isStreamer: false };
    }
}
