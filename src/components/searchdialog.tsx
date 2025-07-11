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
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export function SearchDialog() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const navigate = useNavigate()

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

  return (
    <Dialog open={open} onOpenChange={setOpen} >
      <DialogTrigger asChild>
        <Button variant="default" size="sm">
          SEARCH A PLAYER
        </Button>
      </DialogTrigger>
      <DialogContent className="w-1/3 font-jetbrains bg-liquirice top-60 select-none">
        <DialogHeader >
          <DialogTitle className=" text-flash">Search a player</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSearch()
          }}
          className="space-y-4"
        >
          <Input
            placeholder="Your username + #TAG"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="bg-black/10 border border-jade/10 focus:outline-none focus:ring-1 focus:ring-jade/20 rounded text-flash placeholder:text-flash/20"
          />

          <DialogFooter>
            <Button
              variant="default"
              type="submit"
            >
              SEARCH
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
