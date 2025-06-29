import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="text-[#00D992] bg-[#122322] hover:bg-[#11382E] rounded">
          SEARCH A PLAYER
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#171717] border-none top-40 translate-y-0 select-none">
        <DialogHeader>
          <DialogTitle className="font-thin text-md">SEARCH A PLAYER</DialogTitle>
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
            className="bg-[#060F11] border border-gray-800 shadow-sm shadow-black/20 focus:outline-none focus:ring-1 focus:ring-gray-700 rounded-sm"
          />

          <DialogFooter>
            <Button
              type="submit"
              className="bg-gradient-to-r from-[#10352B] to-[#122322] text-[#00D992] hover:opacity-90 px-10 rounded-sm border-none shadow-none"
            >
              SEARCH
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
