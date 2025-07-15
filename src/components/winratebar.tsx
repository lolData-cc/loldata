import React from "react";

interface WinrateBarProps {
  wins: number;
  losses: number;
}

function interpolateColor(start: string, end: string, factor: number) {
  const s = parseInt(start.slice(1), 16);
  const e = parseInt(end.slice(1), 16);

  const sr = (s >> 16) & 0xff;
  const sg = (s >> 8) & 0xff;
  const sb = s & 0xff;

  const er = (e >> 16) & 0xff;
  const eg = (e >> 8) & 0xff;
  const eb = e & 0xff;

  const r = Math.round(sr + (er - sr) * factor);
  const g = Math.round(sg + (eg - sg) * factor);
  const b = Math.round(sb + (eb - sb) * factor);

  return `rgb(${r}, ${g}, ${b})`;
}

const WinrateBar: React.FC<WinrateBarProps> = ({ wins, losses }) => {
  const total = wins + losses;

  if (total === 0) {
    return (
      <div className="text-flash/60 text-xs mb-1 text-center">NO GAMES</div>
    );
  }

  const winrate = Math.round((wins / total) * 100);

  let textColor = "text-flash/60";
  let barStyle = "bg-green-500";
  let customColor: string | null = null;

  if (winrate >= 80) {
    textColor = "text-yellow-300";
    barStyle = "bg-yellow-400";
  } else if (winrate >= 60 && winrate < 80) {
    // Interpolazione tra 50% e 79%
    const factor = (winrate - 50) / (79 - 50);
    customColor = interpolateColor("#175E4C", "#00D992", factor);
  } else if (winrate >= 46 && winrate < 60) {
    const factor = (winrate - 46) / (79 - 46);
    customColor = interpolateColor("#175E4C", "#00D992", factor);
  } else if (winrate < 45) {
    textColor = "text-red-600";
    barStyle = "bg-red-600";
  }

  return (
    <div className="space-y-1.5 text-right">
      <div className="text-xs mb-1 text-center font-jetbrains">
        <span className={customColor ? "" : textColor} style={customColor ? { color: customColor } : {}}>
          {`${winrate}%`}
        </span>{" "}
        <span className="text-flash/60">{`(${total} GAMES)`}</span>
      </div>

      <div className="flex items-center gap-1">
        <div className="flex flex-1 h-0.5 rounded overflow-hidden">
          <div
            className={customColor ? "" : barStyle}
            style={{
              width: `${(wins / total) * 100}%`,
              backgroundColor: customColor ?? undefined,
            }}
          />
          <div
            className="bg-gray-700"
            style={{
              width: `${(losses / total) * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default WinrateBar;
