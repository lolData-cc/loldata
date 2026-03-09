import { Play } from "lucide-react";

export default function PlaygroundPage() {
    return (
        <div className="p-8">
            <span className="text-xs ml-12">001</span>
            <div
                className="
          relative isolate w-72 group
          [--cut:18px]        /* taglio dell'angolo */
          [--bw:2px]          /* spessore 'bordo' */
          text-white
          before:content-[''] before:absolute before:inset-0
          before:bg-white/10
          before:[clip-path:polygon(0_0,100%_0,100%_calc(100%-var(--cut)),calc(100%-var(--cut))_100%,0_100%)]
          after:content-[''] after:absolute after:inset-[var(--bw)]
          after:bg-neutral-900
          after:[clip-path:polygon(0_0,100%_0,100%_calc(100%-calc(var(--cut)-var(--bw))),calc(100%-calc(var(--cut)-var(--bw)))_100%,0_100%)]
          hover:after:bg-[#EB9451] cursor-clicker
        "
            >
                <div className="flex justify-between items-center">
                    <div className="relative z-10 p-4 font-scifi text-jade group-hover:text-liquirice">
                        PROFILE PAGE
                    </div>
                    <Play className="w-4 h-4 relative z-10 fill-jade text-jade group-hover:text-liquirice group-hover:fill-liquirice"/>
                </div>

            </div>
        </div>
    );
}