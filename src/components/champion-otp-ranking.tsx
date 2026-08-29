import { useState } from "react";
import { useChampionOtpRanking, type OtpPlayer } from "@/hooks/useChampionOtpRanking";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { getRankImage } from "@/utils/rankIcons";
import { cdnBaseUrl, PERK_CDN } from "@/config";

// The box crawls the EU ladder (EUW + EUNE). Keep in sync with REGION_TO_PLATFORM
// in the backend getChampionOtpRanking handler.
const REGIONS = ["ALL", "EUW", "EUNE"] as const;

const TIER_COLORS: Record<string, string> = {
  CHALLENGER: "text-amber-300",
  GRANDMASTER: "text-red-400",
  MASTER: "text-purple-400",
  DIAMOND: "text-cyan-300",
  EMERALD: "text-emerald-400",
  PLATINUM: "text-teal-300",
  GOLD: "text-yellow-400",
  SILVER: "text-gray-300",
  BRONZE: "text-orange-400",
  IRON: "text-stone-400",
};

const KEYSTONE_NAMES: Record<number, string> = {
  8005: "Press the Attack", 8008: "Lethal Tempo", 8021: "Fleet Footwork", 8010: "Conqueror",
  8112: "Electrocute", 8124: "Predator", 8128: "Dark Harvest", 9923: "Hail of Blades",
  8214: "Summon Aery", 8229: "Arcane Comet", 8230: "Phase Rush",
  8351: "Glacial Augment", 8360: "Unsealed Spellbook", 8369: "First Strike",
  8437: "Grasp of the Undying", 8439: "Aftershock", 8465: "Guardian",
};

const STYLE_NAMES: Record<number, string> = {
  8000: "Precision", 8100: "Domination", 8200: "Sorcery", 8300: "Inspiration", 8400: "Resolve",
};

const STYLE_COLORS: Record<number, string> = {
  8000: "text-yellow-400", 8100: "text-red-400", 8200: "text-blue-400", 8300: "text-cyan-300", 8400: "text-green-400",
};

// Keystone perk ID → actual keystone icon path on ddragon
const KEYSTONE_ICON_PATHS: Record<number, string> = {
  // Precision
  8005: "Precision/PressTheAttack/PressTheAttack.png",
  8008: "Precision/LethalTempo/LethalTempoTemp.png",
  8010: "Precision/Conqueror/Conqueror.png",
  8021: "Precision/FleetFootwork/FleetFootwork.png",
  // Domination
  8112: "Domination/Electrocute/Electrocute.png",
  8124: "Domination/Predator/Predator.png",
  8128: "Domination/DarkHarvest/DarkHarvest.png",
  9923: "Domination/HailOfBlades/HailOfBlades.png",
  // Sorcery
  8214: "Sorcery/SummonAery/SummonAery.png",
  8229: "Sorcery/ArcaneComet/ArcaneComet.png",
  8230: "Sorcery/PhaseRush/PhaseRush.png",
  // Resolve
  8437: "Resolve/GraspOfTheUndying/GraspOfTheUndying.png",
  8439: "Resolve/VeteranAftershock/VeteranAftershock.png",
  8465: "Resolve/Guardian/Guardian.png",
  // Inspiration
  8351: "Inspiration/GlacialAugment/GlacialAugment.png",
  8360: "Inspiration/UnsealedSpellbook/UnsealedSpellbook.png",
  8369: "Inspiration/FirstStrike/FirstStrike.png",
};

function getKeystoneIconUrl(keystoneId: number): string {
  const path = KEYSTONE_ICON_PATHS[keystoneId];
  if (path) return `${PERK_CDN}/Styles/${path}`;
  return `${PERK_CDN}/Styles/7201_Precision.png`;
}

// Secondary tree style ID → tree icon
const STYLE_ICON_PATHS: Record<number, string> = {
  8000: "7201_Precision.png",
  8100: "7200_Domination.png",
  8200: "7202_Sorcery.png",
  8300: "7203_Whimsy.png",
  8400: "7204_Resolve.png",
};

function getStyleIconUrl(styleId: number): string {
  const path = STYLE_ICON_PATHS[styleId] ?? "7201_Precision.png";
  return `${PERK_CDN}/Styles/${path}`;
}


/**
 * The one-tricks for a champion, ranked by elo.
 *
 * Rewritten from a stack of floating cards into one panel of hairline-separated
 * rows, which is the language the Build tab already speaks on this same page.
 * The old version boxed every player in its own rounded card with a pale ring —
 * fifty rings down the page, and the eye had to re-enter every one of them just
 * to read a table.
 *
 * The playrate used to be printed TWICE on every row (once under the name and
 * again as its own column). It is said once now, under the name, where it reads
 * as a property of the player rather than as a number in a grid.
 */
export function ChampionOtpRanking({ championName, latestPatch }: { championName: string; latestPatch: string }) {
  void latestPatch;
  const [region, setRegion] = useState<string>("ALL");
  const { data, loading, error } = useChampionOtpRanking(championName, region);
  const navigate = useNavigate();

  // One grid definition shared by the headings, the skeleton and the rows, so
  // the three cannot drift apart into a misaligned table.
  const cols =
    "grid grid-cols-[2rem_2rem_minmax(0,1fr)_5.5rem_3.5rem_3.5rem_3.5rem_5.5rem] items-center gap-2";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5">
        <span className="mr-1 font-chakrapetch text-[10px] font-bold uppercase tracking-[0.2em] text-flash/35 cursor-custom">
          Region
        </span>
        {REGIONS.map((r) => (
          <button
            key={r}
            onClick={() => setRegion(r)}
            className={cn(
              "rounded-[3px] px-2.5 py-1 font-chakrapetch text-[10px] font-bold uppercase tracking-[0.18em] transition-colors duration-200 cursor-clicker",
              region === r
                ? "bg-jade/10 text-jade ring-1 ring-inset ring-jade/30"
                : "text-flash/35 hover:bg-jade/[0.04] hover:text-flash/70"
            )}
          >
            {r}
          </button>
        ))}
        {data && !loading && (
          <span className="ml-auto font-jetbrains text-[10px] uppercase tracking-[0.18em] text-flash/30 tabular-nums">
            {data.totalOtps} one-tricks
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-flash/10 bg-[rgba(6,12,14,0.5)]">
        {/* Headings stay mounted through the load, so the table never appears
            out of nothing — only the rows underneath change. */}
        <div
          className={cn(
            cols,
            "border-b border-flash/[0.06] px-3 py-2 font-jetbrains text-[9px] uppercase tracking-[0.18em] text-flash/25"
          )}
        >
          <span className="text-center">#</span>
          <span />
          <span>Player</span>
          <span className="text-center">Rank</span>
          <span className="text-center">Win</span>
          <span className="text-center">KDA</span>
          <span className="text-center">Games</span>
          <span className="text-center">Build</span>
        </div>

        {loading && (
          /* The skeleton IS the row geometry, not an approximation of it: same
             grid, same heights, so nothing shifts when the data lands. */
          <div>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={cn(cols, "border-b border-flash/[0.04] px-3 py-2.5 last:border-0")}>
                <Skeleton className="mx-auto h-3 w-3 rounded-[2px] bg-flash/[0.05]" />
                <Skeleton className="h-7 w-7 rounded-full bg-flash/[0.05]" />
                <Skeleton className="h-3 w-32 rounded-[2px] bg-flash/[0.05]" />
                <Skeleton className="mx-auto h-5 w-16 rounded-[2px] bg-flash/[0.05]" />
                <Skeleton className="mx-auto h-3 w-8 rounded-[2px] bg-flash/[0.05]" />
                <Skeleton className="mx-auto h-3 w-8 rounded-[2px] bg-flash/[0.05]" />
                <Skeleton className="mx-auto h-3 w-8 rounded-[2px] bg-flash/[0.05]" />
                <Skeleton className="mx-auto h-6 w-14 rounded-[2px] bg-flash/[0.05]" />
              </div>
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="px-4 py-10 text-center">
            <p className="font-jetbrains text-[11px] uppercase tracking-[0.18em] text-[#ff6286]">
              Could not load the one-tricks
            </p>
            <p className="mt-1.5 font-jetbrains text-[10px] tracking-[0.14em] text-flash/25">{error}</p>
          </div>
        )}

        {!loading && !error && data?.players.length === 0 && (
          <div className="px-4 py-12 text-center">
            <p className="font-jetbrains text-[11px] uppercase tracking-[0.18em] text-flash/40">
              No one-tricks on {championName}
            </p>
            <p className="mt-2 font-jetbrains text-[10px] uppercase tracking-[0.16em] text-flash/25">
              Master+ · 10 games minimum · 40% of their games on the champion
            </p>
          </div>
        )}

        {!loading && !error && data && data.players.length > 0 && (
          <div>
            {data.players.map((p: OtpPlayer, i: number) => (
              <div
                key={p.puuid}
                onClick={() =>
                  navigate(
                    `/summoners/${(p.region ?? "euw").toLowerCase()}/${encodeURIComponent(p.name)}-${encodeURIComponent(p.tag)}`
                  )
                }
                /* Staggered, and capped: past ~15 rows the delay stops growing,
                   or the bottom of a fifty-row table would arrive a second and a
                   half after the top and read as lag rather than as motion. */
                style={{ animationDelay: `${Math.min(i, 15) * 26}ms` }}
                className={cn(
                  cols,
                  "otp-row group cursor-clicker border-b border-flash/[0.04] px-3 py-2.5 transition-colors duration-200 last:border-0",
                  "hover:bg-jade/[0.05]",
                  p.rank <= 3 && "bg-jade/[0.025]"
                )}
              >
                {/* The podium is a jade numeral, not a tinted box. */}
                <span
                  className={cn(
                    "text-center font-chakrapetch text-[12px] font-bold tabular-nums transition-colors duration-200",
                    p.rank <= 3 ? "text-jade" : "text-flash/30 group-hover:text-flash/55"
                  )}
                >
                  {p.rank}
                </span>

                <img
                  src={`${cdnBaseUrl()}/img/profileicon/${p.profileIconId ?? 29}.png`}
                  alt=""
                  loading="lazy"
                  className="h-7 w-7 rounded-full object-cover ring-1 ring-inset ring-jade/15"
                />

                <div className="min-w-0">
                  <span className="block truncate font-jetbrains text-[12px] text-flash/80 transition-colors duration-200 group-hover:text-flash">
                    {p.name}
                    <span className="text-flash/35">#{p.tag}</span>
                  </span>
                  <span className="font-jetbrains text-[9px] uppercase tracking-[0.16em] text-flash/30 tabular-nums">
                    {p.champPlayrate}% playrate
                  </span>
                </div>

                <div className="flex items-center justify-center gap-1.5">
                  <img
                    src={getRankImage(p.tier)}
                    alt={p.tier}
                    loading="lazy"
                    className="h-5 w-5 shrink-0 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.visibility = "hidden";
                    }}
                  />
                  <span
                    className={cn(
                      "font-jetbrains text-[11px] font-semibold tabular-nums",
                      TIER_COLORS[p.tier] ?? "text-flash/55"
                    )}
                  >
                    {p.lp}
                  </span>
                </div>

                <span
                  className={cn(
                    "text-center font-jetbrains text-[12px] font-semibold tabular-nums",
                    p.champWinrate >= 60
                      ? "text-jade"
                      : p.champWinrate >= 52
                        ? "text-flash/70"
                        : "text-[#ff6286]"
                  )}
                >
                  {p.champWinrate}%
                </span>

                <span
                  className={cn(
                    "text-center font-jetbrains text-[12px] font-semibold tabular-nums",
                    p.kda >= 4
                      ? "text-jade"
                      : p.kda >= 3
                        ? "text-[#FFB615]"
                        : p.kda >= 2
                          ? "text-flash/70"
                          : "text-[#ff6286]"
                  )}
                >
                  {p.kda >= 99 ? "Perfect" : p.kda.toFixed(1)}
                </span>

                <span className="text-center font-jetbrains text-[11px] text-flash/50 tabular-nums">
                  {p.champGames}
                </span>

                {/* Build: what they open with and what they run, together — three
                    small pictures say more here than three more columns would. */}
                <div className="flex items-center justify-center gap-1">
                  {p.firstItem ? (
                    <img
                      src={`${cdnBaseUrl()}/img/item/${p.firstItem}.png`}
                      alt=""
                      loading="lazy"
                      className="h-6 w-6 rounded-[2px] ring-1 ring-inset ring-jade/15"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.visibility = "hidden";
                      }}
                    />
                  ) : (
                    <span className="w-6 text-center font-jetbrains text-[10px] text-flash/20">·</span>
                  )}
                  {p.keystone ? (
                    <img
                      src={getKeystoneIconUrl(p.keystone)}
                      alt={KEYSTONE_NAMES[p.keystone] ?? ""}
                      title={KEYSTONE_NAMES[p.keystone] ?? ""}
                      loading="lazy"
                      className="h-6 w-6 rounded-full"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.visibility = "hidden";
                      }}
                    />
                  ) : (
                    <span className="w-6 text-center font-jetbrains text-[10px] text-flash/20">·</span>
                  )}
                  {p.secondaryStyle ? (
                    <img
                      src={getStyleIconUrl(p.secondaryStyle)}
                      alt={STYLE_NAMES[p.secondaryStyle] ?? ""}
                      title={STYLE_NAMES[p.secondaryStyle] ?? ""}
                      loading="lazy"
                      className="h-4 w-4 rounded-full opacity-55"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.visibility = "hidden";
                      }}
                    />
                  ) : (
                    <span className="w-4" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
