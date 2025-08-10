// components/RecentGamesSummary.tsx
import { PieChart, Pie, Cell } from "recharts";
import { MatchWithWin } from "@/assets/types/riot";

export function RecentGamesSummary({
    matches,
    summonerPuuid,
}: {
    matches: MatchWithWin[]
    summonerPuuid?: string
}) {
    const recent = matches.slice(0, 10);
    const total = recent.length;

    const stats = recent.reduce(
        (acc, m) => {
            const p = m.match.info.participants.find(p => p.puuid === summonerPuuid);
            if (!p) return acc;
            acc.kills += p.kills;
            acc.deaths += p.deaths;
            acc.assists += p.assists;
            acc.killParticipation.push(p.challenges?.killParticipation ?? 0);
            acc.roles.push((p as any).teamPosition || "UNKNOWN");
            acc.wins += m.win ? 1 : 0;
            return acc;
        },
        {
            kills: 0,
            deaths: 0,
            assists: 0,
            killParticipation: [] as number[],
            roles: [] as string[],
            wins: 0,
        }
    );

    const avgKda =
        stats.deaths === 0
            ? "Perfect"
            : ((stats.kills + stats.assists) / stats.deaths).toFixed(2);
    const avgKillParticipation =
        stats.killParticipation.length > 0
            ? (stats.killParticipation.reduce((a, b) => a + b, 0) / stats.killParticipation.length) * 100
            : 0;
    const roundedKP = Math.round(avgKillParticipation);

    const roleFrequency = stats.roles.reduce((acc, role) => {
        acc[role] = (acc[role] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const mostPlayedRole = Object.entries(roleFrequency).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
    const wr = Math.round((stats.wins / total) * 100);

    return (
        <div>
            <div className="flex flex-col text-sm text-flash w-full px-2">
                <div className="flex gap-2 justify-between px-4">
                    <div>
                        <span className="text-flash/50">Avg KDA:</span>{" "}
                        <span className="text-white">{avgKda}</span>
                    </div>
                    <div>
                        <span className="text-flash/50">Main Role:</span>{" "}
                        <span className="text-white">{mostPlayedRole}</span>
                    </div>
                </div>
                <div className="flex justify-between px-4 items-center ">
                    <div>
                        <span className="text-flash/50">Avg KP%:</span>{" "}
                        <span className="text-white">{roundedKP}%</span>
                    </div>
                    <div>
                        <div className="flex flex-col items-center justify-center">
                            <PieChart width={100} height={100}>
                                <Pie
                                    data={[
                                        { name: "Wins", value: stats.wins },
                                        { name: "Losses", value: total - stats.wins },
                                    ]}
                                    innerRadius={30}
                                    outerRadius={40}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {["#00d992", "#333333"].map((color, index) => (
                                        <Cell key={`cell-${index}`} fill={color} />
                                    ))}
                                </Pie>
                            </PieChart>
                            <div className="text-white text-xs mt-[-60px]">{wr}% WR</div>
                        </div>
                    </div>
                </div>


                {/* <div className="flex">

                    <div className="flex flex-col items-center justify-center">
                        <PieChart width={100} height={100}>
                            <Pie
                                data={[
                                    { name: "Wins", value: stats.wins },
                                    { name: "Losses", value: total - stats.wins },
                                ]}
                                innerRadius={30}
                                outerRadius={40}
                                dataKey="value"
                                stroke="none"
                            >
                                {["#00D18D", "#444444"].map((color, index) => (
                                    <Cell key={`cell-${index}`} fill={color} />
                                ))}
                            </Pie>
                        </PieChart>
                        <div className="text-white text-sm mt-[-60px]">{wr}% WR</div>
                    </div>
                </div> */}

            </div>
        </div>



    );

}
