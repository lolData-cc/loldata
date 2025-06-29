import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

export function LiveViewer() {
    return (
        <Dialog>
            <DialogTrigger className="absolute bottom-[-10px] left-28 -translate-x-1/2 bg-[#00D992] text-[#11382E] text-xs px-2 py-1 rounded-md shadow-md whitespace-nowrap">LIVE NOW</DialogTrigger>
            <DialogContent className="w-[70%] max-w-none flex justify-between items-start bg-transparent border-none px-6 space-x-24">
  <div className="bg-red-400 w-[500px] h-[400px] relative -top-24">
    ciao
  </div>
  <div className="text-center relative top-28">
    VERSUS
  </div>
  <div className="bg-blue-500 w-[500px] h-[400px] relative top-24">
    cane
  </div>
</DialogContent>

        </Dialog>
    )
}
