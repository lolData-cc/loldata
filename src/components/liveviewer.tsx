import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog"

type LiveViewerProps = {
  puuid: string
}

export function LiveViewer({ puuid }: LiveViewerProps) {

    console.log("LiveViewer received puuid:", puuid)

    
  return (
    <Dialog>
      <DialogTrigger className="absolute bottom-[-10px] left-28 -translate-x-1/2 bg-[#00D992] text-[#11382E] text-xs px-2 py-1 rounded-md shadow-md whitespace-nowrap">
        LIVE NOW
      </DialogTrigger>

      <DialogContent className="w-[70%] max-w-none flex justify-between items-start bg-transparent border-none px-6 space-x-24 text-white">
        <div className="bg-red-400 w-[500px] h-[400px] flex items-center justify-center text-sm font-mono text-black">
          {puuid}
        </div>
        <div className="text-center text-white">
          VERSUS
        </div>
        <div className="bg-blue-500 w-[500px] h-[400px]flex items-center justify-center text-sm font-mono text-black">
          {puuid}
        </div>
      </DialogContent>
    </Dialog>
  )
}
