import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef } from "react";
import { cdnBaseUrl } from "@/config";
export default function BuildTimeline({ participantId, timeline }) {
    const scrollRef = useRef(null);
    const itemEvents = timeline?.info?.frames
        ?.flatMap((frame) => frame.events)
        .filter((e) => ["ITEM_PURCHASED", "ITEM_UNDO", "ITEM_SOLD"].includes(e.type) &&
        e.participantId === participantId) || [];
    // Gruppi raggruppati per timestamp
    const groupedEvents = [];
    for (const event of itemEvents) {
        const lastGroup = groupedEvents[groupedEvents.length - 1];
        const isNewGroup = !lastGroup || Math.abs(event.timestamp - lastGroup.timestamp) > 3000;
        if (isNewGroup) {
            groupedEvents.push({
                timestamp: event.timestamp,
                bought: [],
                sold: [],
            });
        }
        const currentGroup = groupedEvents[groupedEvents.length - 1];
        if (event.type === "ITEM_PURCHASED") {
            currentGroup.bought.push(event.itemId);
        }
        else if (event.type === "ITEM_UNDO") {
            currentGroup.bought = currentGroup.bought.filter(id => id !== event.itemBefore);
        }
        else if (event.type === "ITEM_SOLD") {
            currentGroup.sold.push(event.itemId);
        }
    }
    const getItemCounts = (items) => {
        const counts = {};
        for (const id of items) {
            counts[id] = (counts[id] || 0) + 1;
        }
        return counts;
    };
    return (_jsxs("div", { children: [_jsx("div", { className: "relative bg-cement border-flash/20 border rounded-sm py-5", children: _jsx("div", { ref: scrollRef, className: "flex gap-32 overflow-x-auto scrollbar-hide pl-12 pr-8", children: groupedEvents.map((group, idx) => {
                        const boughtCounts = getItemCounts(group.bought);
                        return (_jsxs("div", { className: "flex flex-col items-center min-w-[60px]", children: [_jsxs("div", { className: "flex gap-3 mb-1 justify-center", children: [Object.entries(boughtCounts).map(([id, count]) => (_jsxs("div", { className: "relative w-8 h-8", children: [_jsx("img", { src: `${cdnBaseUrl()}/img/item/${id}.png`, className: "w-8 h-8 rounded", title: `Item ${id}` }), count > 1 && (_jsxs("span", { className: "absolute bottom-0 right-0 text-[10px] bg-black/80 text-white rounded px-1 leading-none", children: ["\u00D7", count] }))] }, `buy-${id}`))), group.sold.map((id) => (_jsxs("div", { className: "relative w-8 h-8 opacity-60", children: [_jsx("img", { src: `${cdnBaseUrl()}/img/item/${id}.png`, className: "w-8 h-8 rounded grayscale", title: `Item ${id} (Sold)` }), _jsx("span", { className: "absolute bottom-0 right-0 text-[10px] bg-red-700 text-white rounded px-1 leading-none", children: "SOLD" })] }, `sold-${id}`)))] }), _jsxs("span", { className: "text-xs text-flash/40 font-mono", children: [Math.floor(group.timestamp / 60000), ":", String(Math.floor((group.timestamp % 60000) / 1000)).padStart(2, '0')] })] }, idx));
                    }) }) }), _jsxs("div", { className: "mt-2 flex justify-between", children: [_jsx("button", { onClick: () => scrollRef.current?.scrollBy({ left: -300, behavior: "smooth" }), className: "bg-jade/20 rounded hover:bg-jade/25 cursor-clicker text-jade px-2 w-[15%]", children: _jsx("div", { className: "flex justify-start pl-4", children: "\u2190" }) }), _jsx("button", { onClick: () => scrollRef.current?.scrollBy({ left: 300, behavior: "smooth" }), className: "bg-jade/20 rounded hover:bg-jade/40 cursor-clicker text-jade ml-2 px-2 w-[15%]", children: _jsx("div", { className: "flex justify-end pr-4", children: "\u2192" }) })] })] }));
}
