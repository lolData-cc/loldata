import { Skeleton } from "@/components/ui/skeleton"

export function OverviewSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Stat cards row */}
      <div className="grid grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-black/30 border border-flash/[0.06] rounded-sm p-3 h-20">
            <Skeleton className="h-2 w-16 bg-flash/10 mb-3" />
            <Skeleton className="h-5 w-12 bg-flash/10" />
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-black/30 border border-flash/[0.06] rounded-sm p-3 h-44">
        <Skeleton className="h-2 w-24 bg-flash/10 mb-3" />
        <Skeleton className="h-32 w-full bg-flash/[0.05]" />
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-black/30 border border-flash/[0.06] rounded-sm p-3 h-24">
          <Skeleton className="h-2 w-20 bg-flash/10 mb-3" />
          <Skeleton className="h-3 w-full bg-flash/[0.05] mb-1.5" />
          <Skeleton className="h-3 w-3/4 bg-flash/[0.05]" />
        </div>
        <div className="bg-black/30 border border-flash/[0.06] rounded-sm p-3 h-24">
          <Skeleton className="h-2 w-20 bg-flash/10 mb-3" />
          <Skeleton className="h-3 w-full bg-flash/[0.05] mb-1.5" />
          <Skeleton className="h-3 w-3/4 bg-flash/[0.05]" />
        </div>
      </div>
    </div>
  )
}
