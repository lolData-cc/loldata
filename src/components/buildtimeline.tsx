import { useRef } from "react"

export default function BuildTimeline({ participantId, timeline }: { participantId: number, timeline: any }) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const itemEvents = timeline?.info?.frames
    ?.flatMap((frame: any) => frame.events)
    .filter((e: any) =>
      ["ITEM_PURCHASED", "ITEM_UNDO", "ITEM_SOLD"].includes(e.type) &&
      e.participantId === participantId
    ) || []

  // Gruppi raggruppati per timestamp
  const groupedEvents: { timestamp: number, bought: number[], sold: number[] }[] = []

  for (const event of itemEvents) {
    const lastGroup = groupedEvents[groupedEvents.length - 1]

    const isNewGroup = !lastGroup || Math.abs(event.timestamp - lastGroup.timestamp) > 3000

    if (isNewGroup) {
      groupedEvents.push({
        timestamp: event.timestamp,
        bought: [],
        sold: [],
      })
    }

    const currentGroup = groupedEvents[groupedEvents.length - 1]

    if (event.type === "ITEM_PURCHASED") {
      currentGroup.bought.push(event.itemId)
    } else if (event.type === "ITEM_UNDO") {
      currentGroup.bought = currentGroup.bought.filter(id => id !== event.itemBefore)
    } else if (event.type === "ITEM_SOLD") {
      currentGroup.sold.push(event.itemId)
    }
  }

  const getItemCounts = (items: number[]) => {
    const counts: Record<number, number> = {}
    for (const id of items) {
      counts[id] = (counts[id] || 0) + 1
    }
    return counts
  }

  return (
    <div>
      <div className="relative bg-cement border-flash/20 border rounded-sm py-5">
        <div
          ref={scrollRef}
          className="flex gap-32 overflow-x-auto scrollbar-hide pl-12 pr-8"
        >
          {groupedEvents.map((group, idx) => {
            const boughtCounts = getItemCounts(group.bought)

            return (
              <div key={idx} className="flex flex-col items-center min-w-[60px]">
                <div className="flex gap-3 mb-1 justify-center">
                  {/* ITEM ACQUISTATI */}
                  {Object.entries(boughtCounts).map(([id, count]) => (
                    <div key={`buy-${id}`} className="relative w-8 h-8">
                      <img
                        src={`https://cdn.loldata.cc/15.13.1/img/item/${id}.png`}
                        className="w-8 h-8 rounded"
                        title={`Item ${id}`}
                      />
                      {count > 1 && (
                        <span className="absolute bottom-0 right-0 text-[10px] bg-black/80 text-white rounded px-1 leading-none">
                          ×{count}
                        </span>
                      )}
                    </div>
                  ))}

                  {/* ITEM VENDUTI */}
                  {group.sold.map((id) => (
                    <div key={`sold-${id}`} className="relative w-8 h-8 opacity-60">
                      <img
                        src={`https://cdn.loldata.cc/15.13.1/img/item/${id}.png`}
                        className="w-8 h-8 rounded grayscale"
                        title={`Item ${id} (Sold)`}
                      />
                      <span className="absolute bottom-0 right-0 text-[10px] bg-red-700 text-white rounded px-1 leading-none">
                        SOLD
                      </span>
                    </div>
                  ))}
                </div>
                <span className="text-xs text-flash/40 font-mono">
                  {Math.floor(group.timestamp / 60000)}:{String(Math.floor((group.timestamp % 60000) / 1000)).padStart(2, '0')}
                </span>
              </div>
            )
          })}
        </div>
      </div>

          {/* Freccette scroll */}
          <div className="mt-2 flex justify-between">
              <button
                  onClick={() => scrollRef.current?.scrollBy({ left: -300, behavior: "smooth" })}
                  className="bg-jade/20 rounded hover:bg-jade/25 cursor-clicker text-jade px-2 w-[15%]"
              >
                  <div className="flex justify-start pl-4">
                      ←
                  </div>

              </button>
              <button
                  onClick={() => scrollRef.current?.scrollBy({ left: 300, behavior: "smooth" })}
                  className="bg-jade/20 rounded hover:bg-jade/40 cursor-clicker text-jade ml-2 px-2 w-[15%]"
              >
                  <div className="flex justify-end pr-4">
                      →
                  </div>

              </button>
          </div>
      </div>
  )
}
