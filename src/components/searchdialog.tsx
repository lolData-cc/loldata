// #region imports
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  TooltipProvider,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Zap } from 'lucide-react'
import { formatRank } from "@/utils/rankConverter"
import { API_BASE_URL } from "@/config"
// #endregion

type SearchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SearchDialog({onOpenChange}: SearchDialogProps) {
  // #region constants
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const navigate = useNavigate()
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  // #endergion

  // #region functions
  const handleSearch = () => {
    if (!input.includes("#")) return
    const [nameRaw, tagRaw] = input.split("#")
    const name = nameRaw.trim()
    const tag = tagRaw.trim()

    if (!name || !tag) return

    const formattedName = name.replace(/\s+/g, "")
    const formattedTag = tag.toUpperCase()
    const region = formattedTag.toLowerCase()
    const slug = `${formattedName}-${formattedTag}`

    navigate(`/summoners/${region}/${slug}`)
    setOpen(false)
    setInput("")
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen(true)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])
  // #endregion
  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (!isOpen) {
        setInput("")
        setSuggestions([])
      }

    }} >
      <DialogTrigger asChild>
        <Button variant="default" size="sm">
          SEARCH A PLAYER
        </Button>
      </DialogTrigger>
      <DialogContent className="w-full max-w-xl bg-transparent top-60 [&>button]:hidden flex flex-col items-center">
        <div className="w-full relative">
          <div className="font-jetbrains bg-liquirice/90 top-60 select-none border-flash/10 border px-7 py-5 rounded-md">
            <DialogHeader >
              <DialogTitle className=" text-flash flex justify-between items-center">
                <div>
                  Search a player
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex text-citrine/80 bg-citrine/20 px-1.5 py-0.5 border-citrine/10 border space-x-1 rounded-sm items-center cursor-default">
                        <Zap className="w-3.5 h-3.5" />
                        <div className="text-sm pr-1">CTRL+K</div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs max-w-xs">
                      You can now use the <kbd className="px-1 py-0.5 bg-muted rounded font-mono text-xs">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-muted rounded font-mono text-xs">K</kbd> shortcut to open the searchbox faster.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

              </DialogTitle>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSearch()
              }}
              className="space-y-4 pt-4"
            >
              <Input
                placeholder="Your username + #TAG"
                value={input}
                onChange={(e) => {
                  const value = e.target.value
                  setInput(value)

                  const [partialName] = value.split("#")
                  if (partialName.length < 4) {
                    setSuggestions([])
                    return
                  }

                  setLoadingSuggestions(true)
                  fetch(`${API_BASE_URL}/api/assignroles`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ query: partialName.trim() }),
                  })
                    .then((res) => res.json())
                    .then((data) => setSuggestions(data.results))
                    .catch((err) => console.error("Autocomplete fetch:", err))
                    .finally(() => setLoadingSuggestions(false))
                }}
                className="bg-black/20 border border-flash/10 hover:border-flash/20 focus:outline-none focus:ring-1 focus:ring-flash/20 rounded text-flash placeholder:text-flash/20"
              />

              <DialogFooter className="pt-2">
                <Button
                  variant="default"
                  type="submit">
                  SEARCH
                </Button>
              </DialogFooter>
            </form>



          </div>
          <div>
            {suggestions.length > 0 && (
              <div className="flex flex-col gap-2 max-h-128 overflow-y-auto mt-2 space-y-2">
                {suggestions.length > 0 && (
                  <div className="absolute w-full mt-2 z-50 left-0 top-full max-h-128 overflow-y-auto flex flex-col gap-2">
                    {suggestions.map((sugg, idx) => (
                      <div
                        key={idx}
                        className="cursor-clicker h-16 bg-liquirice/90 border border-flash/10 hover:border-flash/30 text-flash px-7 py-2 rounded-md flex justify-between items-center"
                        onClick={() => {
                          const formattedName = sugg.name.replace(/\s+/g, "")
                          const formattedTag = sugg.tag.toUpperCase()
                          const region = formattedTag.toLowerCase()
                          const slug = `${formattedName}-${formattedTag}`

                          navigate(`/summoners/${region}/${slug}`)
                          setOpen(false)
                          setInput("")
                          setSuggestions([])
                        }}
                      >
                        <div className="flex justify-between gap-4 items-center">
                          <div>
                            <div className="flex justify-between items-center">
                              <span className="text-flash text-sm font-medium">{sugg.name}</span>
                              <span className="text-flash/50 text-[11px] font-medium">#{sugg.tag}</span>
                            </div>

                          </div>
                          <div className="flex justify-between gap-2">
                            <img
                              src={`https://cdn.loldata.cc/15.13.1/img/miniranks/${formatRank(sugg.rank)}.png`}
                              className="w-4 h-4 rounded-sm"
                            />
                            <span className="text-xs text-flash/40 font-jetbrains">{sugg.rank}</span>
                          </div>
                        </div>


                        <img
                          src={`https://cdn.loldata.cc/15.13.1/img/profileicon/${sugg.icon_id}.png`}
                          alt="icon"
                          className="w-8 h-8 rounded-full"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>

    </Dialog>
  )
}
