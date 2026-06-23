// ExplorerPage — the node query builder as its own full-screen route
// (/learn/explorer). No Learn tablist here: just the navbar and a single
// diamond back-button to return to /learn, so the canvas owns the whole stage.

import { useNavigate } from "react-router-dom"
import { Navbar } from "@/components/navbar"
import ExplorerCanvas from "@/components/explorer/ExplorerCanvas"

export default function ExplorerPage() {
    const navigate = useNavigate()

    return (
        <div className="font-jetbrains subpixel-antialiased bg-liquirice text-flash w-full h-screen flex flex-col overflow-hidden">
            {/* Navbar */}
            <div className="w-full flex justify-center">
                <div className="w-full lg:w-[65%]"><Navbar /></div>
            </div>

            {/* Full-bleed canvas; its own control rail carries the back-button */}
            <div className="relative flex-1 min-h-0 overflow-hidden pt-16 md:pt-0">
                <ExplorerCanvas onBack={() => navigate("/learn")} />
            </div>
        </div>
    )
}
