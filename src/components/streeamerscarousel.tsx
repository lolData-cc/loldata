import { Eye } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

type LiveStreamer = {
    id: string;
    twitch_login: string;
    title: string | null;
    thumbnail_url: string | null;
    viewer_count: number | null;
    profile_image_url: string | null;
    lol_nametag: string | null;   // 👈 nuovo
    region: string | null;        // 👈 nuovo
};

const API_BASE =
    import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, "") || "http://localhost:3001";

const SCROLL_DURATION_S = 35;

const TILE_W_FRAC_DESKTOP = 0.25;
const TILE_W_FRAC_TABLET = 0.75;
const TILE_W_FRAC_MOBILE = 0.9;

const TILE_H_PX = 280;

function buildSlugFromNametag(nametag: string) {
    // "Name With Spaces#EUW" -> "NameWithSpaces-EUW"
    const [name, tag] = nametag.split("#");
    if (!name || !tag) return null;
    const formattedName = name.replace(/\s+/g, "");
    const formattedTag = tag.toUpperCase();
    return `${formattedName}-${formattedTag}`;
}

export default function StreamersInfiniteCarousel() {
    const [items, setItems] = useState<LiveStreamer[]>([]);
    const [loading, setLoading] = useState(true);
    const [vw, setVw] = useState<number>(
        typeof window !== "undefined" ? window.innerWidth : 1280
    );
    const navigate = useNavigate();

    useEffect(() => {
        const onResize = () => setVw(window.innerWidth);
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    const fetchLive = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/api/streamers/live`, { cache: "no-store" });
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();

            const live = (data.live ?? []).map((x: any) => ({
                id: x.id,
                twitch_login: x.twitch_login,
                title: x.title ?? x.twitch_login,
                thumbnail_url: x.thumbnail_url ?? null,
                viewer_count: x.viewer_count ?? null,
                profile_image_url: x.profile_image_url ?? null,
                lol_nametag: x.lol_nametag ?? null,   // 👈
                region: x.region ?? null,             // 👈
            })) as LiveStreamer[];

            live.sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));
            setItems(live);
        } catch (e) {
            console.error(e);
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchLive(); }, [fetchLive]);

    // se non ci sono live, non renderizzare nulla
    if (!loading && items.length === 0) return null;

    // strip per loop continuo
    const tileWpx =
        vw >= 1024
            ? Math.round(vw * TILE_W_FRAC_DESKTOP)
            : vw >= 640
                ? Math.round(vw * TILE_W_FRAC_TABLET)
                : Math.round(vw * TILE_W_FRAC_MOBILE);

    const base = items.length > 0 ? items : [];
    let strip: LiveStreamer[] = [];
    if (base.length > 0) {
        const targetWidth = vw + tileWpx;
        const baseWidth = base.length * tileWpx;
        const times = Math.max(1, Math.ceil(targetWidth / baseWidth));
        strip = Array.from({ length: times }, () => base).flat();
    }
    const track = strip.length ? [...strip, ...strip] : [];

    return (
        <section
            className="relative w-screen"
            style={{ marginLeft: "calc(50% - 50vw)", marginRight: "calc(50% - 50vw)" }}
        >
            <style>{`
        @keyframes streamers-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .scroll-track { display: flex; animation: streamers-scroll ${SCROLL_DURATION_S}s linear infinite; will-change: transform; white-space: nowrap; }
        .scroll-paused:hover .scroll-track { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) { .scroll-track { animation: none; } }
      `}</style>

            <div className="scroll-paused relative select-none overflow-hidden bg-liquirice border-y border-flash/10">
                {/* Fade sinistro */}
                <div className="pointer-events-none absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-liquirice via-liquirice/80 to-transparent z-10" />

                {/* Fade destro */}
                <div className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-liquirice via-liquirice/80 to-transparent z-10" />

                {/* Contenuto scorrevole */}
                <div className="scroll-track">
                    {loading && <SkeletonRow height={TILE_H_PX} width={tileWpx} />}
                    {!loading &&
                        track.map((s, i) => {
                            const hasProfile = !!s.lol_nametag && !!s.region;
                            const slug = hasProfile ? buildSlugFromNametag(s.lol_nametag!) : null;
                            const regionLc = s.region?.toLowerCase();

                            return (
                                <a
                                    key={`${s.id}-${i}`}
                                    href={`https://twitch.tv/${s.twitch_login}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="relative inline-flex overflow-hidden group shrink-0 cursor-clicker"
                                    style={{
                                        width: tileWpx,
                                        minWidth: tileWpx,
                                        maxWidth: tileWpx,
                                        height: TILE_H_PX,
                                        flex: `0 0 ${tileWpx}px`,
                                    }}
                                    draggable={false}
                                >
                                    {/* Background: live thumbnail (B/N -> colore on hover) */}
                                    {s.thumbnail_url && (
                                        <img
                                            src={s.thumbnail_url}
                                            alt={s.title ?? s.twitch_login}
                                            className="absolute inset-0 w-full h-full object-cover filter grayscale group-hover:grayscale-0 transition-[filter] duration-300"
                                        />
                                    )}

                                    {/* overlay scuro (attenuato on hover) */}
                                    <div className="absolute inset-0 z-[1] bg-black/60 opacity-90 group-hover:opacity-30 transition-opacity duration-300 pointer-events-none" />
                                    <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/80 via-black/50 to-transparent opacity-95 group-hover:opacity-30 transition-opacity duration-300 pointer-events-none" />

                                    {/* Contenuto */}
                                    <div className="relative z-[2] w-full h-full p-4 flex flex-col">
                                        {/* TOP: avatar + testo */}
                                        <div className="flex items-start gap-3">
                                            <img
                                                src={s.profile_image_url ?? "/placeholder-avatar.png"}
                                                alt={s.twitch_login}
                                                className="h-12 w-12 rounded-lg object-cover border border-flash/20"
                                            />
                                            <div className="min-w-0">
                                                <div className="text-flash/80 font-jetbrains uppercase tracking-wide text-xl transition-colors  text-jade font-bold">
                                                    {s.twitch_login}
                                                </div>
                                                <div className="w-[80%] leading-tight text-sm break-words truncate transition-colors group-hover:text-flash pt-0.5 text-flash/60 font-jetbrains uppercase ">
                                                    {s.title}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex-1" />

                                        {/* Bottom bar */}
                                        <div className="flex items-end justify-between">
                                            <div className="text-flash/60 text-sm flex items-center gap-1">
                                                <Eye className="w-3.5 h-3.5" />
                                                {s.viewer_count != null ? s.viewer_count.toLocaleString() : "—"}
                                            </div>

                                            {hasProfile && slug && regionLc ? (
                                                <button
                                                    className="inline-flex items-center gap-2 px-3 py-2 rounded-sm bg-[#041f1a] text-jade transition-colors font-jetbrains uppercase text-xs"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
                                                        navigate(`/summoners/${regionLc}/${slug}`);
                                                    }}
                                                >
                                                    PROFILE
                                                </button>
                                            ) : null}
                                        </div>
                                    </div>
                                </a>
                            );
                        })}
                </div>
            </div>
        </section>
    );
}

function SkeletonRow({ height, width }: { height: number; width: number }) {
    const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
    const targetWidth = vw + width;
    const minTiles = Math.ceil(targetWidth / width);
    const tiles = Array.from({ length: minTiles * 2 }, (_, i) => i);
    return (
        <>
            {tiles.map((i) => (
                <div
                    key={i}
                    className="inline-flex bg-flash/5 animate-pulse shrink-0"
                    style={{
                        width,
                        minWidth: width,
                        maxWidth: width,
                        height,
                        flex: `0 0 ${width}px`,
                        borderRight: "1px solid rgba(255,255,255,0.15)",
                    }}
                />
            ))}
        </>
    );
}
