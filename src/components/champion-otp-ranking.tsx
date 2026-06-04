import { useState } from "react";
import { useChampionOtpRanking, type OtpPlayer } from "@/hooks/useChampionOtpRanking";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { getRankImage } from "@/utils/rankIcons";
import { cdnBaseUrl, PERK_CDN } from "@/config";

const REGIONS = ["ALL", "EUW", "NA", "KR"] as const;

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


export function ChampionOtpRanking({ championName, latestPatch }: { championName: string; latestPatch: string }) {
  const [region, setRegion] = useState<string>("ALL");
  const { data, loading, error } = useChampionOtpRanking(championName, region);
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      {/* Region filter */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono text-flash/30 tracking-[0.15em] uppercase mr-2 cursor-custom">REGION</span>
        {REGIONS.map((r) => (
          <button
            key={r}
            onClick={() => setRegion(r)}
            className={cn(
              "px-3 py-1.5 text-[11px] font-mono tracking-[0.1em] uppercase rounded-sm transition-all duration-200 cursor-clicker",
              "border",
              region === r
                ? "border-jade/40 bg-jade/10 text-jade shadow-[0_0_8px_rgba(0,217,146,0.15)]"
                : "border-flash/10 bg-flash/[0.02] text-flash/30 hover:text-flash/50 hover:border-flash/20"
            )}
          >
            {r}
          </button>
        ))}
        {data && (
          <span className="ml-auto text-[10px] font-mono text-flash/20 tracking-[0.1em]">
            {data.totalOtps} OTPs FOUND
          </span>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-sm bg-flash/[0.02] border border-flash/[0.04]">
              <Skeleton className="w-6 h-6 bg-white/5" />
              <Skeleton className="w-8 h-8 rounded-sm bg-white/5" />
              <Skeleton className="h-4 w-24 bg-white/5" />
              <Skeleton className="h-4 w-16 bg-white/5 ml-auto" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-center py-8 text-red-400/60 font-mono text-sm">
          Failed to load OTP ranking
        </div>
      )}

      {/* Empty */}
      {!loading && !error && data?.players.length === 0 && (
        <div className="text-center py-12">
          <p className="text-flash/30 font-mono text-sm tracking-[0.1em]">
            NO OTPS FOUND FOR THIS CHAMPION
          </p>
          <p className="text-flash/15 font-mono text-[10px] mt-2 tracking-wider">
            MINIMUM 10 GAMES WITH 40% PLAYRATE REQUIRED
          </p>
        </div>
      )}

      {/* Player list */}
      {!loading && data && data.players.length > 0 && (
        <div className="space-y-1">
          {/* Header row */}
          <div className="flex items-center gap-3 px-3 py-2 text-[9px] font-mono text-flash/25 tracking-[0.15em] uppercase">
            <span className="w-8 text-center">#</span>
            <span className="w-8" />
            <span className="flex-1 min-w-0">PLAYER</span>
            <span className="w-20 text-center">RANK</span>
            <span className="w-14 text-center">WR%</span>
            <span className="w-16 text-center">KDA</span>
            <span className="w-14 text-center">GAMES</span>
            <span className="w-16 text-center">PLAYRATE</span>
            <span className="w-10 text-center">ITEM</span>
            <span className="w-20 text-center">RUNES</span>
          </div>

          {data.players.map((p) => (
            <div
              key={p.puuid}
              onClick={() => navigate(`/summoners/${(p.region ?? "euw").toLowerCase()}/${encodeURIComponent(p.name)}-${encodeURIComponent(p.tag)}`)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-sm cursor-clicker transition-all duration-200",
                "border border-flash/[0.04] hover:border-jade/20",
                "bg-flash/[0.015] hover:bg-jade/[0.03]",
                p.rank <= 3 && "border-jade/10 bg-jade/[0.02]"
              )}
            >
              {/* Rank number */}
              <span className={cn(
                "w-8 text-center font-orbitron text-[13px] font-bold tabular-nums",
                p.rank === 1 ? "text-amber-300" : p.rank === 2 ? "text-gray-300" : p.rank === 3 ? "text-orange-400" : "text-flash/25"
              )}>
                {p.rank}
              </span>

              {/* Icon */}
              <img
                src={`${cdnBaseUrl()}/img/profileicon/${p.profileIconId ?? 29}.png`}
                alt=""
                className="w-8 h-8 rounded-sm object-cover"
              />

              {/* Name */}
              <div className="flex-1 min-w-0">
                <span className="text-[13px] text-flash/80 font-mono truncate block">
                  {p.name}<span className="text-flash/20">#{p.tag}</span>
                </span>
                <span className="text-[9px] text-flash/20 font-mono tracking-wider">
                  {p.champPlayrate}% PLAYRATE
                </span>
              </div>

              {/* Tier icon + LP */}
              <div className="w-20 flex items-center justify-center gap-1.5">
                <img
                  src={getRankImage(p.tier)}
                  alt={p.tier}
                  className="w-6 h-6 object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <span className={cn("text-[11px] font-mono font-semibold tabular-nums", TIER_COLORS[p.tier] ?? "text-flash/40")}>
                  {p.lp}
                </span>
              </div>

              {/* WR */}
              <span className={cn(
                "w-14 text-center text-[12px] font-mono font-semibold tabular-nums",
                p.champWinrate >= 60 ? "text-jade" : p.champWinrate >= 52 ? "text-flash/60" : "text-red-400/70"
              )}>
                {p.champWinrate}%
              </span>

              {/* KDA */}
              <div className="w-16 text-center">
                <span className={cn(
                  "text-[12px] font-mono font-semibold tabular-nums",
                  p.kda >= 4 ? "text-jade" : p.kda >= 3 ? "text-amber-400" : p.kda >= 2 ? "text-flash/60" : "text-red-400/70"
                )}>
                  {p.kda >= 99 ? "Perfect" : p.kda.toFixed(1)}
                </span>
              </div>

              {/* Games */}
              <span className="w-14 text-center text-[11px] font-mono text-flash/40 tabular-nums">
                {p.champGames}
              </span>

              {/* Playrate */}
              <span className="w-16 text-center text-[11px] font-mono text-flash/40 tabular-nums">
                {p.champPlayrate}%
              </span>

              {/* First Item */}
              <div className="w-10 flex items-center justify-center">
                {p.firstItem ? (
                  <img
                    src={`${cdnBaseUrl()}/img/item/${p.firstItem}.png`}
                    alt=""
                    className="w-6 h-6 rounded-sm border border-flash/10"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <span className="text-[10px] text-flash/15">--</span>
                )}
              </div>

              {/* Runes: keystone icon + secondary tree icon */}
              <div className="w-20 flex items-center justify-center gap-1.5">
                {p.keystone ? (
                  <>
                    <img
                      src={getKeystoneIconUrl(p.keystone)}
                      alt={KEYSTONE_NAMES[p.keystone] ?? ""}
                      title={KEYSTONE_NAMES[p.keystone] ?? ""}
                      className="w-6 h-6 rounded-full"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                    {p.secondaryStyle && (
                      <img
                        src={getStyleIconUrl(p.secondaryStyle)}
                        alt={STYLE_NAMES[p.secondaryStyle] ?? ""}
                        title={STYLE_NAMES[p.secondaryStyle] ?? ""}
                        className="w-4 h-4 rounded-full opacity-50"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    )}
                  </>
                ) : (
                  <span className="text-[10px] text-flash/15">--</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
