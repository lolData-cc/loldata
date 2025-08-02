import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useEffect, useState } from "react"
import splashPositionMap from "@/converters/splashPositionMap"
import { useParams } from "react-router-dom"
import { useAuth } from "@/context/authcontext"
import { cn } from "@/lib/utils"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import queueMap from "@/converters/queueMap"
import { formatDate } from "@/converters/dateMap"
import { useLocation } from "react-router-dom"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from "@/components/ui/tabs"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList
} from "recharts"
import { styleText } from "util"


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001"

export default function MatchPage() {
  const { matchId } = useParams()
  const { region } = useAuth() // 🔁 usa il region dell’utente loggato o cambia in modo statico
  const location = useLocation()
  const focusedPlayerPuuid = location.state?.focusedPlayerPuuid as string | undefined
  const [match, setMatch] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const getAverage = (key: string, participants: any[]) => {
    const total = participants.reduce((sum, p) => sum + (p[key] || 0), 0)
    return Math.round(total / participants.length)
  }

  useEffect(() => {
    async function fetchMatch() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/matchinfo`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matchId, region }),
        })

        if (!res.ok) {
          throw new Error("Errore durante la fetch del match")
        }

        const data = await res.json()
        setMatch(data.match)
      } catch (err) {
        console.error(err)
        setError("Match non trovato o errore di rete.")
      }
    }

    if (matchId && region) fetchMatch()
  }, [matchId, region])

  if (error) return <p className="text-red-500">{error}</p>
  if (!match) return null

  const participants = match.info?.participants ?? []

  const totalKillsBlue = participants
    .filter((p: any) => p.teamId === 100)
    .reduce((sum, p) => sum + p.kills, 0)

  const totalKillsRed = participants
    .filter((p: any) => p.teamId === 200)
    .reduce((sum, p) => sum + p.kills, 0)

  const blueWon = participants.some((p: any) => p.teamId === 100 && p.win)
  const redWon = participants.some((p: any) => p.teamId === 200 && p.win)
  const blueTeam = participants.filter((p) => p.teamId === 100)
  const redTeam = participants.filter((p) => p.teamId === 200)

  const getKP = (p: any, team: any[]) => {
    const teamKills = team.reduce((sum, curr) => sum + curr.kills, 0)
    return teamKills === 0 ? "0%" : `${Math.round(((p.kills + p.assists) / teamKills) * 100)}%`
  }

  const renderItems = (p: any) => {
    return (
      <div className="flex flex-wrap gap-0.5">
        {Array.from({ length: 7 }, (_, i) => {
          const id = p[`item${i}`]
          return id > 0 ? (
            <img
              key={i}
              src={`https://cdn.loldata.cc/15.13.1/img/item/${id}.png`}
              className="w-5 h-5 rounded-sm"
            />
          ) : (
            <div key={i} className="w-5 h-5 bg-black/30 rounded-sm" />
          )
        })}
      </div>
    )
  }
  return (

    <div className="text-flash space-y-6">
      <div className="relative w-full h-[400px]">
        {participants.length > 0 && (() => {
          const randomChamp = participants[Math.floor(Math.random() * participants.length)].championName;
          const objectPosition = splashPositionMap[randomChamp] || "15%"; // default

          return (
            <img
              src={`https://cdn.loldata.cc/15.13.1/img/champion/${randomChamp}_0.jpg`}
              alt="Splash art casuale"
              className="absolute inset-0 w-full h-full object-cover rounded-md shadow-lg"
              style={{ objectPosition: `center ${objectPosition}` }}
            />
          );
        })()}

        <div className="absolute inset-0 bg-liquirice/60 rounded-md"></div>

        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 mt-24 font-jetbrains gap-2">
          <h1 className="text-flash/40 text-xs font-bold font-geist">
            {formatDate(match.info?.gameStartTimestamp)}
          </h1>

          <div className="flex text-3xl text-jade items-center gap-16">
            <span className={cn(blueWon ? "" : "text-pine/80")}>BLUE TEAM</span>
            <span className="text-6xl">{totalKillsBlue}:{totalKillsRed}</span>
            <span className={cn(redWon ? "" : "text-pine/80")}>RED TEAM</span>
          </div>
          <h1 className="text-jade text-sm font-bold uppercase"> {queueMap[match.info?.queueId] || "Unknown Queue"} </h1>

        </div>

        <div className="relative z-10 w-full bg-liquirice/80 rounded-md">
          <div className="w-[65%] mx-auto">
            <Navbar />
          </div>
        </div>
      </div>
      <div className="w-[65%] mx-auto">
        <h1 className="text-xl font-bold pb-2 mb-2 font-jetbrains uppercase text-flash/40">Scoreboard</h1>
        <div className="flex flex-col md:flex-row gap-6 w-full">
          <div className="flex-1 overflow-x-auto font-geist">
            <Table className="w-full table-fixed text-xs border border-[#2b2a2b]">
              <TableHeader className="bg-[#1b1b1b] text-flash/50 uppercase font-jetbrains ">
                <TableRow>
                  <TableHead className="w-[30%] border-none">Player</TableHead>
                  <TableHead className="w-[15%] border-none">KDA</TableHead>
                  <TableHead className="w-[30%] border-none">Items</TableHead>
                  <TableHead className="w-[10%] border-none">Gold</TableHead>
                  <TableHead className="w-[10%] border-none">KP%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blueTeam.map((p) => (
                  <TableRow key={p.puuid} className="bg-[#121212]">
                    <TableCell className="flex items-center gap-2 border-none">
                      <img
                        src={`https://cdn.loldata.cc/15.13.1/img/champion/${p.championName}.png`}
                        className="w-6 h-6 rounded-sm"
                      />
                      <div>
                        <span
                          className={cn(
                            p.puuid === focusedPlayerPuuid ? "text-jade font-bold" : ""
                          )}
                        >
                          {p.riotIdGameName ?? "Unknown"}
                        </span>
                        <div className="flex gap-1 mt-1">
                          <img src={`https://cdn.loldata.cc/15.13.1/img/summonerspells/${p.summoner1Id}.png`} className="w-4 h-4" />
                          <img src={`https://cdn.loldata.cc/15.13.1/img/summonerspells/${p.summoner2Id}.png`} className="w-4 h-4" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="border-none">{p.kills}/{p.deaths}/{p.assists}</TableCell>
                    <TableCell className="border-none">{renderItems(p)}</TableCell>
                    <TableCell className="text-center border-none">{p.goldEarned}</TableCell>
                    <TableCell className="text-center border-none">{getKP(p, blueTeam)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex-1 overflow-x-auto">
            <Table className="w-full table-fixed text-xs  text-right font-geist">
              <TableHeader className="bg-[#1b1b1b] text-flash/50 font-jetbrains uppercase">
                <TableRow>
                  <TableHead className="p-2 w-[10%] border-none">KP%</TableHead>
                  <TableHead className="w-[10%] border-none">GOLD</TableHead>
                  <TableHead className="w-[30%] border-none">Items</TableHead>
                  <TableHead className="w-[15%] border-none">KDA</TableHead>
                  <TableHead className="w-[30%] border-none text-right pr-4">PLAYER</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {redTeam.map((p) => (
                  <TableRow key={p.puuid} className="bg-[#121212]">
                    <TableCell className="text-center border-none">{getKP(p, redTeam)}</TableCell>
                    <TableCell className="text-center border-none">{p.goldEarned}</TableCell>
                    <TableCell className="border-none">{renderItems(p)}</TableCell>
                    <TableCell className="text-center border-none">{p.kills}/{p.deaths}/{p.assists}</TableCell>
                    <TableCell className="flex items-center gap-2 justify-end border-none">
                      <div className="text-right">
                        <span
                          className={cn(
                            p.puuid === focusedPlayerPuuid ? "text-jade font-bold" : ""
                          )}
                        >
                          {p.riotIdGameName ?? "Unknown"}
                        </span>
                        <div className="flex gap-1 justify-end mt-1">
                          <img src={`https://cdn.loldata.cc/15.13.1/img/summonerspells/${p.summoner1Id}.png`} className="w-4 h-4" />
                          <img src={`https://cdn.loldata.cc/15.13.1/img/summonerspells/${p.summoner2Id}.png`} className="w-4 h-4" />
                        </div>
                      </div>
                      <img
                        src={`https://cdn.loldata.cc/15.13.1/img/champion/${p.championName}.png`}
                        className="w-6 h-6 rounded-sm"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* STATISTICS */}
        <h1 className="text-xl font-bold pb-2 mb-2 font-jetbrains uppercase text-flash/40 mt-8">Statistics</h1>
        <Tabs defaultValue={focusedPlayerPuuid || participants[0]?.puuid} className="w-full">
          <div className="flex min-h-[300px] space-x-4"> {/* ⬅️ imposta altezza minima */}
            {/* BLUE SIDE: TabsTrigger */}
            <TabsList className="flex flex-col gap-1 w-[20%] p-2 rounded-md h-full border-flash/20 border bg-[#121212] font-jetbrains">
              {participants.map((p) => (
                <TabsTrigger
                  key={p.puuid}
                  value={p.puuid}
                  className="flex items-center gap-2 text-left text-flash/50 px-3 py-2 rounded hover:bg-[#1B1B1B] data-[state=active]:bg-[#1B1B1B] data-[state=active]:text-flash w-full justify-start"
                >
                  <img
                    src={`https://cdn.loldata.cc/15.13.1/img/champion/${p.championName}.png`}
                    className="w-6 h-6 rounded-sm"
                  />
                  <span
                    className={cn(
                      p.puuid === focusedPlayerPuuid ? "text-jade font-bold" : ""
                    )}
                  >
                    {p.riotIdGameName ?? "Unknown"}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* RED SIDE: TabsContent */}
            <div className="w-[70%] p-4 rounded-md h-full">
              {participants.map((p) => (
                <TabsContent key={p.puuid} value={p.puuid} className="font-geist uppercase">
                  {[
                    { label: "Damage Dealt", key: "totalDamageDealtToChampions" },
                    { label: "Damage Taken", key: "totalDamageTaken" },
                    { label: "Heal", key: "totalHeal" },
                    { label: "Damage to Objectives", key: "damageDealtToObjectives" },
                    { label: "Vision Score", key: "visionScore" },
                    { label: "Wards Placed", key: "wardsPlaced" },
                    { label: "Wards Killed", key: "wardsKilled" },
                  ].map(({ label, key }) => {
                    const playerValue = p[key] ?? 0
                    const avgValue = getAverage(key, participants)

                    const chartData = [
                      {
                        name: label,
                        Player: playerValue,
                        Average: avgValue
                      }
                    ]

                    return (
                      <div key={key} className="mb-4">
                        <p className="text-white text-xs font-medium mb-1">{label}</p>
                        <ResponsiveContainer width="100%" height={19}>
                          <BarChart
                            layout="vertical"
                            data={chartData}
                            margin={{ top: 0, right: 60, left: 0, bottom: 0 }}
                            barGap={8}
                          >
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="name" hide />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "#0f0f0f",
                                border: "1px solid #333",
                                borderRadius: "4px",
                                padding: "8px",
                                fontFamily: "Geist, sans-serif",
                                fontSize: "12px",
                                color: "#ffffff",
                                zIndex: 9999,
                              }}
                              wrapperStyle={{ zIndex: 9999 }}
                              cursor={{ fill: "transparent" }}
                            />
                            <Bar dataKey="Player" fill="#00d992" barSize={8} radius={[0, 8, 8, 0]} stackId="a">
                              <LabelList className="font-geist" dataKey="Player" position="right" fill="#fff" fontSize={12} />
                            </Bar>
                            <Bar dataKey="Average" fill="#148460" barSize={8} radius={[0, 8, 8, 0]} stackId="b">
                              <LabelList className="font-geist" dataKey="Average" position="right" fill="#fff" fontSize={12} />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )
                  })}
                </TabsContent>
              ))}
            </div>
          </div>
        </Tabs>
        <Footer className="mt-24" />
      </div>
    </div>
  )
}
