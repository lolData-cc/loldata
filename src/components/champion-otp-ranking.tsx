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

  /**
   * One grid shared by the skeleton and the real card, so the two cannot drift
   * into a shape that shifts when the data lands.
   *
   * WARNING: this stopped being a TABLE. Eight columns of 11px text at one
   * weight is a spreadsheet, and it was unreadable for the ordinary reason —
   * nothing on the row was bigger than anything else, so there was no way in.
   * A card leads with the player and their win rate, and lets the rest be
   * small.
   */
  const cols =
    "grid grid-cols-[2.4rem_17rem_8.5rem_minmax(0,1fr)_7rem] items-center gap-4";

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

      {/* WARNING: NO light outline. A `border-flash/10` box drew a pale rectangle
          around the one part of this page that should read as a list of people,
          and this project does not put white lines around things. The rows are
          separated by space and a jade hairline instead. */}
      <div className="space-y-1.5">
        {loading && (
          /* The skeleton IS the row geometry, not an approximation of it: same
             grid, same heights, so nothing shifts when the data lands. */
          <div>
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className={cn(cols, "rounded-[4px] bg-[rgba(6,12,14,0.45)] px-3 py-3")}
              >
                <Skeleton className="mx-auto h-4 w-4 rounded-[2px] bg-flash/[0.05]" />
                <div className="flex items-center gap-2.5">
                  <Skeleton className="h-9 w-9 rounded-full bg-flash/[0.05]" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-40 rounded-[2px] bg-flash/[0.05]" />
                    <Skeleton className="h-1.5 w-24 rounded-[1px] bg-flash/[0.05]" />
                  </div>
                </div>
                <Skeleton className="h-8 w-28 rounded-[2px] bg-flash/[0.05]" />
                <div className="space-y-1.5">
                  <Skeleton className="h-5 w-24 rounded-[2px] bg-flash/[0.05]" />
                  <Skeleton className="h-[3px] w-full rounded-[1px] bg-flash/[0.05]" />
                  <Skeleton className="h-2 w-40 rounded-[1px] bg-flash/[0.05]" />
                </div>
                <Skeleton className="mx-auto h-7 w-16 rounded-[2px] bg-flash/[0.05]" />
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
                  "otp-row group relative cursor-clicker rounded-[4px] px-3 py-3 transition-colors duration-200",
                  "bg-[rgba(6,12,14,0.45)] hover:bg-jade/[0.055]",
                  // The podium is lit from inside rather than outlined, so the
                  // best three read as brighter and not as bordered.
                  p.rank <= 3 && "bg-[rgba(0,217,146,0.045)]"
                )}
              >
                {/* The rail: the only thing marking the top three, and it is a
                    line of light, not a box. */}
                {p.rank <= 3 && (
                  <span
                    aria-hidden
                    className="absolute inset-y-1 left-0 w-[2px] rounded-full"
                    style={{ background: "linear-gradient(180deg, #00d992, rgba(0,217,146,0.15))" }}
                  />
                )}

                <span
                  className={cn(
                    "text-center font-chakrapetch font-bold tabular-nums transition-colors duration-200",
                    p.rank <= 3
                      ? "text-[19px] text-jade"
                      : "text-[14px] text-flash/30 group-hover:text-flash/55"
                  )}
                >
                  {p.rank}
                </span>

                {/* WHO. The largest type on the row, because a list of players
                    that leads with anything else is a list of numbers. */}
                <div className="flex min-w-0 items-center gap-2.5">
                  <img
                    src={`${cdnBaseUrl()}/img/profileicon/${p.profileIconId ?? 29}.png`}
                    alt=""
                    loading="lazy"
                    className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-inset ring-jade/20"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-chakrapetch text-[15px] font-bold leading-tight text-flash/90 transition-colors duration-200 group-hover:text-flash">
                      {p.name}
                      <span className="font-jetbrains text-[11px] font-normal text-flash/30">#{p.tag}</span>
                    </p>
                    {/* The playrate as a LENGTH as well as a number: "44.6%" is
                        read, a bar is seen, and the whole point of it is how
                        much of their play is this one champion. */}
                    <div className="mt-1 flex items-center gap-2">
                      <span className="h-[3px] w-[52px] shrink-0 overflow-hidden rounded-full bg-flash/[0.07]">
                        <span
                          className="block h-full rounded-full bg-jade/60"
                          style={{ width: `${Math.min(100, p.champPlayrate)}%` }}
                        />
                      </span>
                      <span className="whitespace-nowrap font-jetbrains text-[9px] uppercase tracking-[0.14em] text-flash/30 tabular-nums">
                        {p.champPlayrate}% of {p.totalGames} games
                      </span>
                    </div>
                  </div>
                </div>

                {/* RANK, as a word and not only as a score. "1998" alone says
                    nothing to anyone who does not already know the ladder. */}
                <div className="flex items-center gap-2">
                  <img
                    src={getRankImage(p.tier)}
                    alt={p.tier}
                    loading="lazy"
                    className="h-8 w-8 shrink-0 object-contain"
                    style={{ filter: "drop-shadow(0 2px 5px rgba(0,0,0,0.8))" }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.visibility = "hidden";
                    }}
                  />
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "truncate font-chakrapetch text-[12px] font-bold uppercase leading-none tracking-wide",
                        TIER_COLORS[p.tier] ?? "text-flash/55"
                      )}
                    >
                      {p.tier.toLowerCase()}
                    </p>
                    <p className="mt-1 font-jetbrains text-[10px] text-flash/35 tabular-nums">
                      {p.lp} LP
                    </p>
                  </div>
                </div>

                {/* HOW THEY DO. The win rate is the headline of the row, with
                    the same number drawn as a bar underneath it, and the record
                    it is made of said plainly. */}
                <div>
                  <div className="flex items-baseline gap-2">
                    <span
                      className={cn(
                        "font-chakrapetch text-[20px] font-bold leading-none tabular-nums",
                        p.champWinrate >= 60
                          ? "text-jade"
                          : p.champWinrate >= 52
                            ? "text-flash/85"
                            : "text-[#ff6286]"
                      )}
                    >
                      {p.champWinrate}
                      <span className="text-[12px]">%</span>
                    </span>
                    <span className="font-jetbrains text-[10px] tracking-[0.06em] tabular-nums">
                      <span className="text-jade/75">{p.champWins}W</span>
                      <span className="text-flash/20"> · </span>
                      <span className="text-[#ff6286]/75">{p.champGames - p.champWins}L</span>
                    </span>
                    <span className="ml-auto font-jetbrains text-[9px] uppercase tracking-[0.14em] text-flash/25 tabular-nums">
                      {p.champGames} games
                    </span>
                  </div>
                  <span className="mt-1.5 block h-[3px] overflow-hidden rounded-full bg-[#ff6286]/25">
                    <span
                      className="block h-full rounded-full bg-jade"
                      style={{ width: `${Math.min(100, Math.max(0, p.champWinrate))}%` }}
                    />
                  </span>
                  <p className="mt-1.5 font-jetbrains text-[9.5px] uppercase tracking-[0.12em] text-flash/30 tabular-nums">
                    <span className="text-flash/55">
                      {p.kda >= 99 ? "perfect" : p.kda.toFixed(1)}
                    </span>{" "}
                    kda
                    <span className="text-flash/15"> · </span>
                    {p.avgKills.toFixed(1)}/{p.avgDeaths.toFixed(1)}/{p.avgAssists.toFixed(1)}
                    <span className="text-flash/15"> · </span>
                    <span className="text-flash/45">{p.avgCsPerMin.toFixed(1)}</span> cs/m
                  </p>
                </div>

                {/* WHAT THEY RUN. Bigger than before: at 24px these are three
                    pictures you can recognise, where at 16 they were three
                    smudges nobody could name. */}
                <div className="flex items-center justify-end gap-1.5">
                  {p.keystone ? (
                    <img
                      src={getKeystoneIconUrl(p.keystone)}
                      alt={KEYSTONE_NAMES[p.keystone] ?? ""}
                      title={KEYSTONE_NAMES[p.keystone] ?? ""}
                      loading="lazy"
                      className="h-7 w-7 rounded-full"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.visibility = "hidden";
                      }}
                    />
                  ) : (
                    <span className="w-7 text-center font-jetbrains text-[10px] text-flash/15">·</span>
                  )}
                  {p.secondaryStyle ? (
                    <img
                      src={getStyleIconUrl(p.secondaryStyle)}
                      alt={STYLE_NAMES[p.secondaryStyle] ?? ""}
                      title={STYLE_NAMES[p.secondaryStyle] ?? ""}
                      loading="lazy"
                      className="h-5 w-5 rounded-full opacity-60"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.visibility = "hidden";
                      }}
                    />
                  ) : (
                    <span className="w-5" />
                  )}
                  {p.firstItem ? (
                    <img
                      src={`${cdnBaseUrl()}/img/item/${p.firstItem}.png`}
                      alt=""
                      title="First item"
                      loading="lazy"
                      className="h-7 w-7 rounded-[3px] ring-1 ring-inset ring-jade/20"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.visibility = "hidden";
                      }}
                    />
                  ) : (
                    <span className="w-7 text-center font-jetbrains text-[10px] text-flash/15">·</span>
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
