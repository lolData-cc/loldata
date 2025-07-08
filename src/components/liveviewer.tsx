import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useEffect, useState } from "react"

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
  const [game, setGame] = useState<LiveGame | null>(null)
  const [open, setOpen] = useState(false)
  const [aiHelp, setAiHelp] = useState<string | null>(null)
  const [loadingHelp, setLoadingHelp] = useState(false)

  useEffect(() => {
    if (!open) return

    fetch("http://localhost:3001/api/livegame", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ puuid }),
    })
      .then(res => res.status === 204 ? null : res.json())
      .then(data => {
        if (data?.game) setGame(data.game)
      })
      .catch(console.error)
  }, [open, puuid])

  const blueTeam = game?.participants.filter(p => p.teamId === 100) || []
  const redTeam = game?.participants.filter(p => p.teamId === 200) || []

  const handleHelpClick = async () => {
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
            {blueTeam.map(p => (
              <div key={p.summonerName} className="text-sm py-1">
                {p.summonerName} – Champ ID: {p.championId}
              </div>
            ))}
          </div>

          <div className="text-center text-white font-bold text-xl flex items-center justify-center">
            VERSUS
          </div>

          <div className="bg-red-900 w-[500px] h-[300px] p-4 overflow-y-auto rounded-md">
            <h3 className="text-center text-lg mb-2">RED TEAM</h3>
            {redTeam.map(p => (
              <div key={p.summonerName} className="text-sm py-1">
                {p.summonerName} – Champ ID: {p.championId}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-col items-end gap-4">
          <button
            onClick={handleHelpClick}
            className="bg-yellow-500 text-black text-sm px-3 py-1 rounded hover:bg-yellow-400"
          >
            {loadingHelp ? "Thinking..." : "HELP"}
          </button>

          {aiHelp && (
            <div className="w-full bg-[#1f1f1f] text-white p-4 rounded text-sm whitespace-pre-wrap max-h-[300px] overflow-y-auto shadow-lg border border-white/10">
              <Tabs defaultValue="howtowin" className="bg-none">
                <TabsList className="bg-[#1f1f1f] space-x-4">
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

                <TabsContent value="howtowin" className="font-thin">ciao</TabsContent>
                <TabsContent value="matchups">qui matchups</TabsContent>
              </Tabs>

            </div>
          )}


        </div>
      </DialogContent>

    </Dialog>
  )
}
