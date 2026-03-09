import { Separator } from "./ui/separator";

export function Error404() {
    return (
        <div className="p-8 space-y-7">
            <div className="flex flex-col text-flash/80 ">
                <span className="text-[9px]"> :: LDAT4.M4TCH <span className="text-flash/50">05F</span> ::</span>
                <span className="text-[11px]"> STATUS   <span className="text-[11px] text-flash/50 pl-2">TIMED OUT</span></span>
            </div>

            <div className="flex flex-col">
                <span className="text-3xl font-mechano text-[#b11315]"> ERROR </span>
                <div className="flex space-x-2 items-center">
                    <Separator className="w-64 bg-flash/20" />
                    <div className="w-[3px] h-[3px] bg-flash/80" />
                    <div className="w-[3px] h-[3px] bg-flash/60" />
                </div>
                <div className="-ml-2  mt-2 flex gap-2 items-center">
                    <span className="text-[12px] font-mechano text-[#b11315]/70 px-[3px] border border-flash/20"> E </span>
                    <div className="text-[12px] font-geist font-bold text-liquirice bg-flash px-3">NOTHING FOUND</div>
                </div>
            </div>

        </div>
    )
}
