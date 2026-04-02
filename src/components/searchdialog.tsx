// #region imports
import { useEffect, useState, useRef, useCallback } from "react"
import type React from "react"
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Star, Zap } from 'lucide-react'
import { formatRank } from "@/utils/rankConverter"
import { getRankImage } from "@/utils/rankIcons"
import { API_BASE_URL } from "@/config"
import { supabase } from "@/lib/supabaseClient"
import { BorderBeam } from "./ui/border-beam"
import { SavedProfiles } from "./savedprofiles"
import { showCyberToast } from "@/lib/toast-utils"
// #endregion

type SearchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  // #region constants
  const [input, setInput] = useState("")
  const navigate = useNavigate()
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [region, setRegion] = useState("EUW")
  const [regionPopoverOpen, setRegionPopoverOpen] = useState(false)
  const [savedProfiles, setSavedProfiles] = useState<any[]>([])

  // Autocomplete debounce + abort
  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchAutocomplete = useCallback(async (query: string) => {
    // Cancel any in-flight request
    abortRef.current?.abort()

    const [partialName] = query.split("#")
    if (partialName.trim().length < 2) {
      setSuggestions([])
      setLoadingSuggestions(false)
      return
    }

    setLoadingSuggestions(true)
    const controller = new AbortController()
    abortRef.current = controller

    const searchTerm = partialName.trim()

    // Fetch API results + pro players in parallel
    const [apiRes, proRes] = await Promise.all([
      fetch(`${API_BASE_URL}/api/autocomplete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), region: region.toUpperCase() }),
        signal: controller.signal,
      }).then((r) => r.json()).catch((err) => {
        if (err.name !== "AbortError") console.error("Autocomplete fetch:", err)
        return { results: [] }
      }),
      supabase
        .from("pro_players")
        .select("username, nickname, profile_image_url, team")
        .or(`nickname.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%`)
        .limit(3)
        .then(({ data }) => data ?? []),
    ])

    if (controller.signal.aborted) return

    // Build pro suggestions (shown first)
    const proSuggestions = proRes.map((p: any) => {
      const [name, tag] = (p.username || "").split("#")
      return {
        name: name || "",
        tag: tag || "",
        rank: null,
        icon_id: null,
        region: region.toUpperCase(),
        _isPro: true,
        _nickname: p.nickname,
        _avatar: p.profile_image_url,
        _team: p.team,
      }
    })

    // Deduplicate: remove API results that match a pro
    const proKeys = new Set(proSuggestions.map((p: any) => `${p.name}#${p.tag}`.toLowerCase()))
    const apiFiltered = (apiRes.results ?? []).filter((s: any) => !proKeys.has(`${s.name}#${s.tag}`.toLowerCase()))

    setSuggestions([...proSuggestions, ...apiFiltered])
    setLoadingSuggestions(false)
  }, [region])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  // #region functions
  const handleSearch = () => {
    let nameRaw = "";
    let tagRaw = "";

    if (input.includes("#")) {
      [nameRaw, tagRaw] = input.split("#");
    } else {
      nameRaw = input;
      tagRaw = "EUW";
    }

    const name = nameRaw.trim();
    let tag = (tagRaw || "").trim();

    if (!name) return;
    if (!tag) tag = "EUW";

    const formattedName = name.replace(/\s+/g, "+");
    const formattedTag = tag.toUpperCase();
    const slug = `${formattedName}-${formattedTag}`;

    navigate(`/summoners/${region.toLowerCase()}/${slug}`);
    onOpenChange(false);
    setInput("");
  };

  // Save profiles 
  useEffect(() => {
    if (typeof window === "undefined") return

    const stored = localStorage.getItem("savedProfiles")
    if (stored) {
      try {
        setSavedProfiles(JSON.parse(stored))
      } catch {
        // se è corrotto, lo resetto
        localStorage.removeItem("savedProfiles")
      }
    }
  }, [])

  const isProfileSaved = (sugg: any) => {
    return savedProfiles.some(
      (p) =>
        p.name === sugg.name &&
        p.tag === sugg.tag &&
        p.region === (sugg.region || region).toUpperCase()
    )
  }

  const handleToggleSaveProfile = (
    e: React.MouseEvent<HTMLDivElement>,
    sugg: any
  ) => {
    e.stopPropagation() // non far partire il navigate del div padre

    const profileRegion = (sugg.region || region).toUpperCase()
    const key = `${sugg.name}-${sugg.tag}-${profileRegion}`

    setSavedProfiles((prev) => {
      const exists = prev.some((p) => p.key === key)

      // se sto cercando di AGGIUNGERE (non rimuovere) e ho già 5 profili -> blocco
      if (!exists && prev.length >= 5) {
        showCyberToast({
          title: "Limit reached",
          description: "You can save up to 5 profiles.",
          tag: "ERR",
          variant: "error"
        })
        return prev
      }

      let next

      if (exists) {
        // rimuovo il profilo se è già salvato
        next = prev.filter((p) => p.key !== key)
      } else {
        // aggiungo normalmente
        next = [
          ...prev,
          {
            key,
            name: sugg.name,
            tag: sugg.tag,
            region: profileRegion,
            icon_id: sugg.icon_id,
            rank: sugg.rank,
          },
        ]
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("savedProfiles", JSON.stringify(next))
      }

      return next
    })
  }


  const handleShowSavedProfiles = () => {
    const regionUpper = region.toUpperCase()
    const filtered = savedProfiles.filter(
      (p) => p.region === regionUpper
    )

    setInput("")          // <-- svuota la textbox
    setSuggestions(filtered)
  }


  // #endregion
  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen)
      if (!isOpen) {
        setInput("")
        setSuggestions([])
      }
    }} >
      <div className="hidden md:block">
        <DialogTrigger asChild>
          <div className="font-jetbrains bg-jade/10 text-jade hover:bg-jade/20 items-center py-2 h-full px-3 rounded-sm cursor-clicker">
            SEARCH A PLAYER
          </div>
        </DialogTrigger>
      </div>
      <div className="md:hidden">
        <DialogTrigger asChild>
          <div className="p-1.5 bg-jade/20 text-jade rounded-sm cursor-clicker">
            <Search className="w-3 h-3" />
          </div>
        </DialogTrigger>
      </div>

      <DialogContent className="w-full max-w-xl bg-transparent shadow-none top-60 [&>button]:hidden flex flex-col items-center">
        <div className="w-full relative">
          <div className="font-jetbrains bg-liquirice/90 top-60 select-none border-flash/10 border px-7 py-5 rounded-md">
            <BorderBeam duration={8} size={100} />
            <DialogHeader >
              <DialogTitle className=" text-flash flex justify-between items-center">
                <div>
                  Search a player
                </div>
                <div className="flex items-center space-x-2">
                  <SavedProfiles onClick={handleShowSavedProfiles} />
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
                </div>
              </DialogTitle>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSearch()
              }}
              className="space-y-4 pt-4"
            >
              <div className="flex gap-2">
                <Input
                  placeholder="Your username + #TAG"
                  value={input}
                  onChange={(e) => {
                    const value = e.target.value
                    setInput(value)

                    // Clear previous debounce
                    if (debounceRef.current) clearTimeout(debounceRef.current)

                    const [partialName] = value.split("#")
                    if (partialName.trim().length < 2) {
                      abortRef.current?.abort()
                      setSuggestions([])
                      setLoadingSuggestions(false)
                      return
                    }

                    // Debounce 400ms to reduce requests during typing
                    debounceRef.current = setTimeout(() => {
                      fetchAutocomplete(value)
                    }, 400)
                  }}
                  className="bg-black/20 border border-flash/10 hover:border-flash/20 focus:outline-none focus:ring-1 focus:ring-flash/20 rounded text-flash placeholder:text-flash/20 w-[80%]"
                />
                <Popover open={regionPopoverOpen} onOpenChange={setRegionPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-[20%] justify-between bg-black/20 border border-flash/10 text-flash hover:border-flash/20"
                    >
                      {region}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="pointer-events-auto z-[9999] w-[90px] p-0 bg-liquirice/90 border-flash/20 cursor-clicker">

                    <Command>
                      <CommandList>
                        <CommandEmpty>No region found.</CommandEmpty>
                        <CommandGroup>
                          {["EUW", "NA", "KR"].map((r) => (
                            <CommandItem
                              key={r}
                              value={r}
                              onSelect={() => {
                                setRegion(r)
                                setRegionPopoverOpen(false)
                              }}
                            >
                              {r}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <DialogFooter className="pt-2">
                <Button
                  type="submit">
                  SEARCH
                </Button>
              </DialogFooter>
            </form>



          </div>
          <div>
            {suggestions.length > 0 && !regionPopoverOpen && (
              <div
                className="absolute w-full mt-2 left-0 top-full max-h-128 overflow-y-auto flex flex-col gap-2 z-40"
              >
                {suggestions.map((sugg, idx) => (
                  <div
                    key={idx}
                    className={`cursor-clicker h-16 bg-liquirice/90 border text-flash px-7 py-2 rounded-md flex justify-between items-center ${sugg._isPro ? "border-jade/20 hover:border-jade/40" : "border-flash/10 hover:border-flash/30"}`}
                    onClick={() => {
                      const formattedName = sugg.name.replace(/\s+/g, "+")
                      const formattedTag = sugg.tag.toUpperCase()
                      const slug = `${formattedName}-${formattedTag}`

                      const targetRegion = (sugg.region || region).toLowerCase()

                      navigate(`/summoners/${targetRegion}/${slug}`)
                      onOpenChange(false)
                      setInput("")
                      setSuggestions([])
                    }}
                  >
                    {sugg._isPro ? (
                      /* Pro player result */
                      <div className="flex items-center gap-3">
                        {sugg._avatar ? (
                          <img src={sugg._avatar} alt="" className="w-9 h-9 rounded-md object-cover border border-jade/20" />
                        ) : (
                          <div className="w-9 h-9 rounded-md bg-black/40 border border-jade/15 flex items-center justify-center">
                            <svg viewBox="0 0 64 52" className="w-5 h-4">
                              <circle cx="32" cy="16" r="9" fill="rgba(0,217,146,0.15)" stroke="rgba(0,217,146,0.25)" strokeWidth="1" />
                              <path d="M16 48c0-8.8 7.2-16 16-16s16 7.2 16 16" fill="rgba(0,217,146,0.1)" stroke="rgba(0,217,146,0.2)" strokeWidth="1" />
                            </svg>
                          </div>
                        )}
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-flash text-sm font-bold">{sugg._nickname || sugg.name}</span>
                            <span
                              className="text-[7px] font-black px-[4px] py-[1px] rounded-[2px] tracking-wide shrink-0"
                              style={{
                                background: "linear-gradient(135deg, #00d992, #00b8ff)",
                                color: "#040A0C",
                              }}
                            >
                              PRO
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-flash/50 text-[12px] font-mono">{sugg.name}#{sugg.tag}</span>
                            {sugg._team && <span className="text-jade/50 text-[11px] font-mono">· {sugg._team}</span>}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Normal result */
                      <div className="flex items-center">
                        <div className="w-[200px] shrink-0 flex items-center gap-1 min-w-0">
                          <span className="text-flash text-sm font-medium truncate">{sugg.name}</span>
                          <span className="text-flash/50 text-[11px] font-medium shrink-0">#{sugg.tag}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <img
                            src={getRankImage(sugg.rank)}
                            alt={sugg.rank ?? "Unranked"}
                            className="w-5 h-5 object-contain"
                          />
                          <span className="text-xs text-flash/40 font-jetbrains whitespace-nowrap">
                            {sugg.rank ?? "Unranked"}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-4">
                      {!sugg._isPro && (
                        <div
                          onClick={(e) => handleToggleSaveProfile(e, sugg)}
                          className={`relative z-10 rounded-sm p-1 cursor-pointer transition ${isProfileSaved(sugg) ? "bg-jade/20" : "hover:bg-jade/20"}`}
                        >
                          <Star className="h-4 w-4 text-jade" />
                        </div>
                      )}
                      {sugg._isPro ? (
                        sugg._avatar ? null : null
                      ) : (
                        <img
                          src={`https://cdn2.loldata.cc/16.1.1/img/profileicon/${sugg.icon_id}.png`}
                          alt="icon"
                          className="w-8 h-8 rounded-full"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </DialogContent>

    </Dialog>
  )
}
