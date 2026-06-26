import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// components/RecentGamesSummary.tsx
import { PieChart, Pie, Cell } from "recharts";
export function RecentGamesSummary({ matches, summonerPuuid, }) {
    const recent = matches.slice(0, 10);
    const total = recent.length;
    const stats = recent.reduce((acc, m) => {
        const p = m.match.info.participants.find(p => p.puuid === summonerPuuid);
        if (!p)
            return acc;
        acc.kills += p.kills;
        acc.deaths += p.deaths;
        acc.assists += p.assists;
        acc.killParticipation.push(p.challenges?.killParticipation ?? 0);
        acc.roles.push(p.teamPosition || "UNKNOWN");
        acc.wins += m.win ? 1 : 0;
        return acc;
    }, {
        kills: 0,
        deaths: 0,
        assists: 0,
        killParticipation: [],
        roles: [],
        wins: 0,
    });
    const avgKda = stats.deaths === 0
        ? "Perfect"
        : ((stats.kills + stats.assists) / stats.deaths).toFixed(2);
    const avgKillParticipation = stats.killParticipation.length > 0
        ? (stats.killParticipation.reduce((a, b) => a + b, 0) / stats.killParticipation.length) * 100
        : 0;
    const roundedKP = Math.round(avgKillParticipation);
    const roleFrequency = stats.roles.reduce((acc, role) => {
        acc[role] = (acc[role] || 0) + 1;
        return acc;
    }, {});
    const mostPlayedRole = Object.entries(roleFrequency).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
    const wr = Math.round((stats.wins / total) * 100);
    return (_jsx("div", { children: _jsxs("div", { className: "flex flex-col text-sm text-flash w-full px-2", children: [_jsxs("div", { className: "flex gap-2 justify-between px-4", children: [_jsxs("div", { children: [_jsx("span", { className: "text-flash/50", children: "Avg KDA:" }), " ", _jsx("span", { className: "text-white", children: avgKda })] }), _jsxs("div", { children: [_jsx("span", { className: "text-flash/50", children: "Main Role:" }), " ", _jsx("span", { className: "text-white", children: mostPlayedRole })] })] }), _jsxs("div", { className: "flex justify-between px-4 items-center ", children: [_jsxs("div", { children: [_jsx("span", { className: "text-flash/50", children: "Avg KP%:" }), " ", _jsxs("span", { className: "text-white", children: [roundedKP, "%"] })] }), _jsx("div", { children: _jsxs("div", { className: "flex flex-col items-center justify-center", children: [_jsx(PieChart, { width: 100, height: 100, children: _jsx(Pie, { data: [
                                                { name: "Wins", value: stats.wins },
                                                { name: "Losses", value: total - stats.wins },
                                            ], innerRadius: 30, outerRadius: 40, dataKey: "value", stroke: "none", children: ["#00d992", "#333333"].map((color, index) => (_jsx(Cell, { fill: color }, `cell-${index}`))) }) }), _jsxs("div", { className: "text-white text-xs mt-[-60px]", children: [wr, "% WR"] })] }) })] })] }) }));
}
