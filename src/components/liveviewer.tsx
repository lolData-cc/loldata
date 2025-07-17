import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useEffect, useState } from "react"
import { formatChampName } from "@/utils/formatchampname";
import { formatRank } from '@/utils/rankConverter';
import { API_BASE_URL } from "@/config"
import  WinrateBar from "@/components/winratebar"

type Participant = {
  teamId: number
  summonerName: string
  championId: number
  riotId: string
  spell1Id: number
  spell2Id: number
  perks: any
}

type LiveGame = {
  participants: Participant[]
  gameType: string
  gameQueueConfigId: number
}

type LiveViewerProps = {
  puuid: string
  riotId: string
}

export function LiveViewer({ puuid, riotId }: LiveViewerProps) {
  const [championMap, setChampionMap] = useState<Record<number, string>>({})
  const [game, setGame] = useState<LiveGame | null>(null)
  const [open, setOpen] = useState(false)
  const [aiHelp, setAiHelp] = useState<string | null>(null)
  const [ranks, setRanks] = useState<Record<string, { rank: string; wins: number; losses: number; lp: number }>>({})
  const [loadingHelp, setLoadingHelp] = useState(false)
  const [selectedTab, setSelectedTab] = useState<string>("statistics")
  const [matchupAdvice, setMatchupAdvice] = useState<string | null>(null)
  const [orderedTeams, setOrderedTeams] = useState<{
    100: Partial<Record<"top" | "jungle" | "mid" | "bot" | "support", Participant>>,
    200: Partial<Record<"top" | "jungle" | "mid" | "bot" | "support", Participant>>,
  }>({ 100: {}, 200: {} })




  const generateAiHelp = async () => {

    if (!redTeam.length) return
    setLoadingHelp(true)

    const response = await fetch("http://localhost:3001/api/aihelp/howtowin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enemyChampionIds: redTeam.map(p => p.championId) }),
    })

    const data = await response.json()
    setAiHelp(data?.advice || "Nessun consiglio trovato.")
    setLoadingHelp(false)
  }


  useEffect(() => {
    if (!open) return;
    const fetchGameAndChamps = async () => {
      try {
        const gameRes = await fetch(`${API_BASE_URL}/api/livegame`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ puuid }),
        });

        const gameData = await (gameRes.status === 204 ? null : gameRes.json());
        if (gameData?.game) {
          setGame(gameData.game);

          const riotIds = gameData.game.participants.map((p: Participant) => p.riotId)

          const rankRes = await fetch(`${API_BASE_URL}/api/multirank`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ riotIds }),
          })

          const rankData = await rankRes.json()
          type RankInfo = {
            riotId: string
            rank: string
            wins: number
            losses: number
            lp: number
          }

          const rankMap: Record<string, { rank: string; wins: number; losses: number; lp: number }> = {}
          rankData.ranks.forEach((r: RankInfo) => {
            rankMap[r.riotId] = {
              rank: r.rank,
              wins: r.wins,
              losses: r.losses,
              lp: r.lp
            }
          })
          setRanks(rankMap)

          const rolesRes = await fetch(`${API_BASE_URL}/api/assignroles`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ participants: gameData.game.participants }),
          });

          const rolesData = await rolesRes.json();

          setOrderedTeams({
            100: rolesData.roles[100],
            200: rolesData.roles[200],
          });

          

        }

        const champRes = await fetch("https://cdn.loldata.cc/15.13.1/data/en_US/champion.json");
        const champData = await champRes.json();
        const idToName: Record<number, string> = {}

        Object.values(champData.data).forEach((champ: any) => {
          idToName[parseInt(champ.key)] = champ.name
        })

        setChampionMap(idToName)

      } catch (err) {
        console.error(err);
      }
    };

    fetchGameAndChamps();
  }, [open, puuid]);

  const blueTeam = game?.participants.filter(p => p.teamId === 100) || []
  const redTeam = game?.participants.filter(p => p.teamId === 200) || []

  return (
    <Dialog onOpenChange={setOpen}>
      <DialogTrigger className="absolute bottom-[-10px] left-28 -translate-x-1/2 bg-[#00D992] text-[#11382E] text-xs px-2 py-1 rounded-md shadow-md whitespace-nowrap">
        LIVE NOW
      </DialogTrigger>
      <DialogContent
        className="w-[70%] max-w-none bg-transparent border-none px-6 text-white top-[5%] translate-y-0 [&>button:last-child]:hidden"
      >
        <div className="flex justify-between gap-8">
          <div className="text-[11px] bg-liquirice/90 w-[45%] h-[300px] p-4 overflow-y-auto rounded-md border border-white/10 ">
            <h3 className="text-center text-lg mb-2 font-jetbrains">BLUE TEAM</h3>
            <div className="flex flex-col space-y-3 ">
              {(["top", "jungle", "mid", "bot", "support"] as const).map(role => {
                const p = orderedTeams[100][role]

                return p ? (
                  <div
                    key={p.summonerName}
                    className={`flex justify-between items-center ${p.riotId === riotId ? "bg-jade/25 rounded-sm" : ""}`}
                  >
                    <div className="flex items-center gap-2 w-[50%]">
                      <img
                        src={`https://cdn.loldata.cc/15.13.1/img/champion/${formatChampName(championMap[p.championId])}.png`}
                        className="w-9 h-9 rounded-lg"
                      />
                      <div className="flex flex-col gap-1">
                        <img
                          src={`https://cdn.loldata.cc/15.13.1/img/summonerspells/${p.spell1Id}.png`}
                          className="w-4 h-4 rounded-sm"
                        />
                        <img
                          src={`https://cdn.loldata.cc/15.13.1/img/summonerspells/${p.spell2Id}.png`}
                          className="w-4 h-4 rounded-sm"
                        />
                      </div>
                      <span className="ml-2 uppercase font-jetbrains">{p.riotId}</span>
                    </div>

                    <div className="flex gap-1 space-x-1 text-white/80 font-jetbrains text-left w-[35%]">
                      <img
                         src={`https://cdn.loldata.cc/15.13.1/img/miniranks/${formatRank(ranks[p.riotId]?.rank)}.png`}
                        className="w-4 h-4 rounded-sm"
                      />
                      <span>{ranks[p.riotId]?.rank || "..."} {ranks[p.riotId]?.lp}</span>
                    </div>

                    <div className="w-[25%] pr-2">
                      <WinrateBar wins={ranks[p.riotId]?.wins || 0} losses={ranks[p.riotId]?.losses || 0} />
                    </div>





                  </div>
                ) : null

              })}
            </div>
          </div>

          <div className="text-center text-white font-bold text-xl flex flex-col items-center justify-center">
            <div>VS</div>
            <span className="uppercase font-jetbrains text-[11px]">{game?.gameType}</span>
          </div>

            <div className="text-[11px] bg-liquirice/90 w-[45%] h-[300px] p-4 overflow-y-auto rounded-md border border-white/10">
            <h3 className="text-center text-lg mb-2 font-jetbrains">RED TEAM</h3>
            <div className="flex flex-col space-y-3">
              {(["top", "jungle", "mid", "bot", "support"] as const).map(role => {
                const p = orderedTeams[200][role]
                return p ? (
                  <div
                    key={p.summonerName}
                    className={`flex items-center justify-between rounded ${p.riotId === riotId ? "bg-jade/10" : ""
                      }`}
                  >
                    <div className="flex items-center gap-1 w-[50%]">
                      <img
                        src={`https://cdn.loldata.cc/15.13.1/img/champion/${formatChampName(championMap[p.championId])}.png`}
                        className="w-9 h-9 rounded-lg"
                      />
                      <div className="flex flex-col gap-1">
                        <img
                          src={`https://cdn.loldata.cc/15.13.1/img/summonerspells/${p.spell1Id}.png`}
                          className="w-4 h-4 rounded-sm"
                        />
                        <img
                          src={`https://cdn.loldata.cc/15.13.1/img/summonerspells/${p.spell2Id}.png`}
                          className="w-4 h-4 rounded-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-1 font-jetbrains ml-2">
                        <span className="uppercase font-jetbrains">{p.riotId}</span>
                      </div>
                    </div>

                    <div className="flex gap-1 space-x-1 text-white/80 font-jetbrains text-left w-[35%]">
                      <img
                         src={`https://cdn.loldata.cc/15.13.1/img/miniranks/${formatRank(ranks[p.riotId]?.rank)}.png`}
                        className="w-4 h-4 rounded-sm"
                      />
                      <span>{ranks[p.riotId]?.rank || "..."} {ranks[p.riotId]?.lp}</span>
                    </div>

                    <div className="w-[25%] pr-2">
                      <WinrateBar wins={ranks[p.riotId]?.wins || 0} losses={ranks[p.riotId]?.losses || 0} />
                    </div>
                  </div>
                ) : null
              })}
            </div>
          </div>

        </div>


        <div className="mt-6 flex flex-col items-end gap-4">
          <div className="w-full bg-liquirice text-white p-4 rounded text-sm shadow-lg border border-white/10 max-h-[300px] flex flex-col">
            <Tabs
              defaultValue="statistics"
              value={selectedTab}
              onValueChange={(value) => {
                setSelectedTab(value)
                if (value === "howtowin" && !aiHelp) {
                  generateAiHelp()
                }

                // if (value === "matchups" && !matchupAdvice) {
                //   generateMatchupAdvice()
                // }
              }}
              className="bg-none flex flex-col h-full"
            >
              {/* Tabs header */}
              <TabsList className="bg-liquirice space-x-4 font-jetbrains justify-start">
                <TabsTrigger
                  value="statistics"
                  className="group flex items-center space-x-2 px-2 py-1 rounded-sm text-white bg-liquirice hover:bg-[#2a2a2a]
                data-[state=active]:bg-[#11382E] data-[state=active]:text-white "
                >
                  <div>STATISTICS</div>
                </TabsTrigger>

                <TabsTrigger
                  value="howtowin"
                  className="group flex items-center space-x-2 px-2 py-1 rounded-sm text-white bg-liquirice hover:bg-[#2a2a2a]
                data-[state=active]:bg-[#11382E] data-[state=active]:text-white"
                >
                  <div>HOW TO WIN</div>
                  <div className="px-1 text-jade rounded-sm bg-[#11382E] group-data-[state=active]:bg-[#00D992] group-data-[state=active]:text-[#11382E]">
                    AI
                  </div>
                </TabsTrigger>

                <TabsTrigger
                  value="matchups"
                  className="group flex items-center space-x-2 px-2 py-1 rounded-sm text-white bg-liquirice hover:bg-[#2a2a2a]
                data-[state=active]:bg-[#11382E] data-[state=active]:text-white"
                >
                  <div>MATCHUP</div>
                  <div className="px-1 py-0 text-jade rounded-sm bg-[#11382E] group-data-[state=active]:bg-jade group-data-[state=active]:text-[#11382E]">
                    AI
                  </div>
                </TabsTrigger>
                <TabsTrigger
                  value="whattobuild"
                  className="group flex items-center space-x-2 px-2 py-1 rounded-sm text-white bg-liquirice hover:bg-[#2a2a2a]
                data-[state=active]:bg-[#11382E] data-[state=active]:text-white"
                >
                  <div>WHAT TO BUILD</div>
                  <div className="px-1 py-0 text-[#00D992] rounded-sm bg-[#11382E] group-data-[state=active]:bg-[#00D992] group-data-[state=active]:text-[#11382E]">
                    AI
                  </div>
                </TabsTrigger>
              </TabsList>

              <div className="mt-4 px-2 overflow-y-auto max-h-[230px] scrollbar-hide">
                <TabsContent
                  value="statistics"
                  className="font-geist text-[12px] leading-6"
                >
                </TabsContent>
                <TabsContent
                  value="howtowin"
                  className="font-geist text-[12px] leading-6 whitespace-pre-wrap"
                >
                  {loadingHelp ? (
                    <div className="animate-pulse text-white/60">AI is thinking...</div>
                  ) : (
                    aiHelp || "No advice generated."
                  )}
                </TabsContent>
                <TabsContent
                  value="matchups"
                  className="font-geist text-[12px] leading-6 whitespace-pre-wrap"
                >
                  {matchupAdvice || "Nessun consiglio matchup trovato."}
                </TabsContent>
              </div>
            </Tabs>
          </div>



        </div>
      </DialogContent>

    </Dialog>
  )
}
