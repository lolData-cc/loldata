import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useEffect, useState } from "react"
import { assignRoles } from "@/utils/assignRoles"

type Participant = {
  teamId: number
  summonerName: string
  championId: number
  spell1Id: number
  spell2Id: number
  perks: any
}

type LiveGame = {
  participants: Participant[]
}

type LiveViewerProps = {
  puuid: string
}

export function LiveViewer({ puuid }: LiveViewerProps) {
  const [championMap, setChampionMap] = useState<Record<number, string>>({})
  const [game, setGame] = useState<LiveGame | null>(null)
  const [open, setOpen] = useState(false)
  const [aiHelp, setAiHelp] = useState<string | null>(null)
  const [loadingHelp, setLoadingHelp] = useState(false)
  const [selectedTab, setSelectedTab] = useState<string>("statistics")
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
      const gameRes = await fetch("http://localhost:3001/api/livegame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ puuid }),
      });

      const gameData = await (gameRes.status === 204 ? null : gameRes.json());
      if (gameData?.game) {
        setGame(gameData.game);

        const roles = assignRoles(gameData.game.participants);
        setOrderedTeams({
          100: roles[100],
          200: roles[200],
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
        className="w-[70%] max-w-none bg-transparent border-none px-6 text-white top-[5%] translate-y-0"
      >
        <div className="flex justify-between gap-8">
          <div className="bg-blue-900 w-[500px] h-[300px] p-4 overflow-y-auto rounded-md">
            <h3 className="text-center text-lg mb-2">BLUE TEAM</h3>
            {(["top", "jungle", "mid", "bot", "support"] as const).map(role => {
              const p = orderedTeams[100][role]
              return p ? (
                <div key={p.summonerName} className="text-sm py-1">
                  {role.toUpperCase()}: {p.summonerName} - Champion: {championMap[p.championId] || p.championId}

                </div>
              ) : null
            })}
          </div>

          <div className="text-center text-white font-bold text-xl flex items-center justify-center">
            VERSUS
          </div>

          <div className="bg-red-900 w-[500px] h-[300px] p-4 overflow-y-auto rounded-md">
            <h3 className="text-center text-lg mb-2">RED TEAM</h3>
            {(["top", "jungle", "mid", "bot", "support"] as const).map(role => {
              const p = orderedTeams[200][role]
              return p ? (
                <div key={p.summonerName} className="text-sm py-1">
                  {role.toUpperCase()}: {p.summonerName} – Champion: {championMap[p.championId] || p.championId}
                </div>
              ) : null
            })}
          </div>
        </div>

        <div className="mt-6 flex flex-col items-end gap-4">
          <div className="w-full bg-[#1f1f1f] text-white p-4 rounded text-sm shadow-lg border border-white/10 max-h-[300px] flex flex-col">
  <Tabs
    defaultValue="statistics"
    value={selectedTab}
    onValueChange={(value) => {
      setSelectedTab(value)
      if (value === "howtowin" && !aiHelp) {
        generateAiHelp()
      }
    }}
    className="bg-none flex flex-col h-full"
  >
    {/* Tabs header */}
    <TabsList className="bg-[#1f1f1f] space-x-4 font-jetbrains justify-start">
      <TabsTrigger
                  value="statistics"
                  className="group flex items-center space-x-2 px-2 py-1 rounded-sm text-white bg-[#1f1f1f] hover:bg-[#2a2a2a]
                data-[state=active]:bg-[#11382E] data-[state=active]:text-white "
                >
                  <div className="">STATISTICS</div>
                </TabsTrigger>

                <TabsTrigger
                  value="howtowin"
                  className="group flex items-center space-x-2 px-2 py-1 rounded-sm text-white bg-[#1f1f1f] hover:bg-[#2a2a2a]
                data-[state=active]:bg-[#11382E] data-[state=active]:text-white"
                >
                  <div className="">HOW TO WIN</div>
                  <div className="px-1 py-0 text-[#00D992] rounded-sm bg-[#11382E] group-data-[state=active]:bg-[#00D992] group-data-[state=active]:text-[#11382E]">
                    AI
                  </div>
                </TabsTrigger>

                <TabsTrigger
                  value="matchups"
                  className="group flex items-center space-x-2 px-2 py-1 rounded-sm text-white bg-[#1f1f1f] hover:bg-[#2a2a2a]
                data-[state=active]:bg-[#11382E] data-[state=active]:text-white"
                >
                  <div>MATCHUPS</div>
                  <div className="px-1 py-0 text-[#00D992] rounded-sm bg-[#11382E] group-data-[state=active]:bg-[#00D992] group-data-[state=active]:text-[#11382E]">
                    AI
                  </div>
                </TabsTrigger>
                <TabsTrigger
                  value="whattobuild"
                  className="group flex items-center space-x-2 px-2 py-1 rounded-sm text-white bg-[#1f1f1f] hover:bg-[#2a2a2a]
                data-[state=active]:bg-[#11382E] data-[state=active]:text-white"
                >
                  <div>WHAT TO BUILD</div>
                  <div className="px-1 py-0 text-[#00D992] rounded-sm bg-[#11382E] group-data-[state=active]:bg-[#00D992] group-data-[state=active]:text-[#11382E]">
                    AI
                  </div>
                </TabsTrigger>
    </TabsList>

    {/* Contenuto scrollabile */}
    <div className="mt-4 px-2 overflow-y-auto max-h-[230px]">
      <TabsContent
        value="statistics"
        className="font-geist text-[12px] leading-6"
      >
        {/* testo */}
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
      <TabsContent value="matchups">{aiHelp}</TabsContent>
    </div>
  </Tabs>
</div>



        </div>
      </DialogContent>

    </Dialog>
  )
}
