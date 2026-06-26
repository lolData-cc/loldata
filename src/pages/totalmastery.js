import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
// totalmastery.tsx
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { API_BASE_URL, getCdnVersion } from "@/config";
import { BorderBeam } from "@/components/ui/border-beam";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger, } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList, } from "@/components/ui/command";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Crown } from "lucide-react";
import UltraTechBackground from "@/components/techdetails";
import { showCyberToast } from "@/lib/toast-utils";
import { motion, AnimatePresence } from "framer-motion";
import { GlassOverlays } from "@/components/ui/glass-overlays";
function uid() {
    return Math.random().toString(36).slice(2, 10);
}
function formatNumber(n) {
    // 4 000 000
    return new Intl.NumberFormat(undefined).format(n);
}
function parseRiotId(v) {
    const raw = v.trim();
    if (!raw.includes("#"))
        return null;
    const [nameRaw, tagRaw] = raw.split("#");
    const name = (nameRaw || "").trim();
    const tag = (tagRaw || "").trim();
    if (!name || !tag)
        return null;
    return { name, tag };
}
export default function TotalMasteryPage() {
    const [accounts, setAccounts] = useState([
        { id: uid(), riotId: "", region: "EUW" },
    ]);
    const [latestPatch, setLatestPatch] = useState("15.13.1");
    const [championMap, setChampionMap] = useState({});
    const [loading, setLoading] = useState(false);
    // results
    const [top3, setTop3] = useState([]);
    // region popovers state per row
    const [regionPopoverOpen, setRegionPopoverOpen] = useState({});
    const glassDark = cn("relative overflow-hidden rounded-md", "bg-black/25 backdrop-blur-lg saturate-150", "shadow-[0_10px_30px_rgba(0,0,0,0.55),inset_0_0_0_0.5px_rgba(255,255,255,0.10),inset_0_1px_0_rgba(255,255,255,0.05)]");
    const glassOverlays = (_jsxs(_Fragment, { children: [_jsx("div", { className: "pointer-events-none absolute -top-28 left-0 w-full h-[360px] z-[1]", style: {
                    background: "radial-gradient(120% 80% at 18% 18%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 32%, rgba(255,255,255,0.03) 52%, rgba(255,255,255,0.0) 72%)",
                } }), _jsx("div", { className: "pointer-events-none absolute inset-0 z-[1]", style: {
                    background: "radial-gradient(140% 120% at 50% 40%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.45) 100%)",
                } }), _jsx("div", { className: "pointer-events-none absolute inset-0 z-[1]", style: {
                    background: "linear-gradient(to bottom, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 38%, rgba(0,0,0,0.40) 100%)",
                } }), _jsx("div", { className: "pointer-events-none absolute -bottom-10 left-0 right-0 h-36 z-[2]", style: {
                    background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0) 70%)",
                } })] }));
    const [hasCalculated, setHasCalculated] = useState(false);
    // fetch latest patch
    useEffect(() => {
        setLatestPatch(getCdnVersion());
    }, []);
    // fetch champion map (id -> name)
    useEffect(() => {
        //TO FIX
        fetch(`https://cdn2.loldata.cc/16.1.1/data/en_US/champion.json`)
            .then((res) => {
            if (!res.ok)
                throw new Error("Failed to load champion.json");
            return res.json();
        })
            .then((data) => {
            const map = {};
            Object.values(data.data).forEach((champ) => {
                const numId = Number(champ.key); // champ.key is numeric id as string
                if (!Number.isNaN(numId))
                    map[numId] = champ.id; // champ.id = "Aatrox"
            });
            setChampionMap(map);
        })
            .catch((err) => {
            console.error("Error loading champions:", err);
        });
    }, [latestPatch]);
    const canCompute = useMemo(() => {
        const filled = accounts.filter((a) => a.riotId.trim().length > 0);
        if (filled.length === 0)
            return false;
        return filled.every((a) => !!parseRiotId(a.riotId));
    }, [accounts]);
    function addAccount() {
        setAccounts((prev) => [...prev, { id: uid(), riotId: "", region: "EUW" }]);
    }
    function removeAccount(id) {
        setAccounts((prev) => prev.filter((a) => a.id !== id));
        setRegionPopoverOpen((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
    }
    function updateAccount(id, patch) {
        setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    }
    async function fetchMasteryList(name, tag, region) {
        // ✅ endpoint atteso: /api/mastery/list
        const res = await fetch(`${API_BASE_URL}/api/mastery/list`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, tag, region }),
        });
        if (!res.ok) {
            const t = await res.text().catch(() => "");
            throw new Error(t || `Mastery fetch failed (${res.status})`);
        }
        const data = await res.json();
        return (data?.masteryList ?? []);
    }
    async function compute() {
        const active = accounts
            .map((a) => ({ ...a, parsed: parseRiotId(a.riotId) }))
            .filter((a) => a.riotId.trim().length > 0);
        if (active.length === 0) {
            showCyberToast({
                title: "No accounts",
                description: "Add at least one account to calculate mastery.",
                tag: "ERR",
                variant: "error",
            });
            return;
        }
        const invalid = active.find((a) => !a.parsed);
        if (invalid) {
            showCyberToast({
                title: "Invalid Riot ID",
                description: "Use the format: name#TAG (example: Acc1#EUW).",
                tag: "ERR",
                variant: "error",
            });
            return;
        }
        setHasCalculated(true);
        setLoading(true);
        setTop3([]);
        setLoading(true);
        setTop3([]);
        try {
            // per-champ total points + breakdown per account
            const totals = new Map();
            const breakdown = new Map();
            await Promise.all(active.map(async (a) => {
                const { name, tag } = a.parsed;
                const list = await fetchMasteryList(name, tag, a.region);
                // key account label
                const accLabel = `${name}#${tag} (${a.region})`;
                for (const m of list) {
                    const id = Number(m.championId);
                    const pts = Number(m.championPoints ?? 0);
                    if (!id || !pts)
                        continue;
                    totals.set(id, (totals.get(id) ?? 0) + pts);
                    const b = breakdown.get(id) ?? {};
                    b[accLabel] = (b[accLabel] ?? 0) + pts;
                    breakdown.set(id, b);
                }
            }));
            const sorted = [...totals.entries()]
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([championId, points]) => ({
                championId,
                championName: championMap[championId] ?? `#${championId}`,
                points,
                perAccount: breakdown.get(championId) ?? {},
            }));
            if (sorted.length === 0) {
                showCyberToast({
                    title: "No mastery data",
                    description: "No mastery points found for the provided accounts.",
                    tag: "INFO",
                });
            }
            setTop3(sorted);
        }
        catch (e) {
            console.error(e);
            showCyberToast({
                title: "Error",
                description: e?.message ?? "Unexpected error while fetching mastery.",
                tag: "ERR",
                variant: "error",
            });
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsxs("div", { className: "relative z-0", children: [_jsx(UltraTechBackground, {}), _jsx("div", { className: "relative flex min-h-screen -mt-4 z-10", children: _jsxs("div", { className: "w-full max-w-5xl mx-auto px-4 py-6", children: [_jsxs("div", { className: cn(glassDark, "mb-4"), children: [_jsx(GlassOverlays, {}), _jsx(BorderBeam, { duration: 8, size: 120 }), _jsxs("div", { className: "relative z-10 px-5 py-4", children: [_jsxs("div", { className: "flex items-start justify-between gap-4", children: [_jsxs("div", { children: [_jsx("div", { className: "text-flash/70 text-xs tracking-wide uppercase", children: "Multi-account mastery" }), _jsx("div", { className: "text-flash text-2xl mt-1 flex items-center gap-2", children: "TOTAL TOP 3 CHAMPIONS" }), _jsx("div", { className: "text-flash/50 text-sm mt-1 max-w-2xl font-geist", children: "Add as many accounts as you want. We\u2019ll sum champion mastery points across them and show your Top 3." })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs(Button, { type: "button", onClick: addAccount, className: "bg-jade/20 text-jade hover:bg-jade/30 rounded uppercase tracking-wide", children: [_jsx(Plus, { className: "w-4 h-4 mr-2" }), "ADD ACCOUNT"] }), _jsx(Button, { type: "button", disabled: !canCompute || loading, onClick: compute, className: cn("rounded uppercase tracking-wide", "bg-[#1D2436] hover:bg-[#243554] border border-white/10", "text-[#D0E3FF]"), children: loading ? "CALCULATING..." : "CALCULATE" })] })] }), _jsx(Separator, { className: "bg-white/10 my-4" }), _jsx("div", { className: "flex flex-col gap-2", children: accounts.map((a, idx) => {
                                                const open = !!regionPopoverOpen[a.id];
                                                return (_jsxs("div", { className: cn("relative overflow-hidden rounded-md px-3 py-2", "bg-black/18 backdrop-blur-lg saturate-150", "shadow-[0_10px_30px_rgba(0,0,0,0.50),inset_0_0_0_0.35px_rgba(255,255,255,0.06),inset_0_1px_0_rgba(255,255,255,0.03)]"), children: [_jsx("div", { className: "pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-white/3 via-transparent to-black/40" }), _jsxs("div", { className: "relative z-10 flex items-center gap-2", children: [_jsxs("div", { className: "w-8 text-flash/40 text-xs font-jetbrains", children: ["#", String(idx + 1).padStart(2, "0")] }), _jsx(Input, { placeholder: "name#TAG  (ex: Acc1#EUW)", value: a.riotId, onChange: (e) => updateAccount(a.id, { riotId: e.target.value }), className: "bg-black/20 border border-flash/10 hover:border-flash/20 focus:outline-none focus:ring-1 focus:ring-flash/20 rounded text-flash placeholder:text-flash/20" }), _jsxs(Popover, { open: open, onOpenChange: (v) => setRegionPopoverOpen((prev) => ({ ...prev, [a.id]: v })), children: [_jsx(PopoverTrigger, { asChild: true, children: _jsx(Button, { variant: "outline", role: "combobox", className: "w-[90px] justify-between bg-black/20 border border-flash/10 text-flash hover:border-flash/20", children: a.region }) }), _jsx(PopoverContent, { className: "pointer-events-auto z-[9999] w-[110px] p-0 bg-liquirice/90 border-flash/20 cursor-clicker", children: _jsx(Command, { children: _jsxs(CommandList, { children: [_jsx(CommandEmpty, { children: "No region found." }), _jsx(CommandGroup, { children: ["EUW", "NA", "KR"].map((r) => (_jsx(CommandItem, { value: r, onSelect: () => {
                                                                                                    updateAccount(a.id, { region: r });
                                                                                                    setRegionPopoverOpen((prev) => ({ ...prev, [a.id]: false }));
                                                                                                }, children: r }, r))) })] }) }) })] }), _jsx(TooltipProvider, { delayDuration: 80, children: _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx(Button, { type: "button", onClick: () => removeAccount(a.id), className: "bg-transparent hover:bg-white/5 border border-white/10 text-flash/70", disabled: accounts.length === 1, children: _jsx(Trash2, { className: "w-4 h-4" }) }) }), _jsx(TooltipContent, { side: "top", className: "text-xs", children: "Remove account" })] }) })] })] }, a.id));
                                            }) }), _jsx("div", { className: "text-[11px] text-flash/40 mt-3", children: "Tip: you can paste multiple rows quickly by adding more accounts and using Ctrl+V." })] })] }), _jsx(AnimatePresence, { mode: "wait", children: hasCalculated && (_jsx(motion.div, { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 10 }, transition: { duration: 1.50 }, className: "grid grid-cols-1 md:grid-cols-3 gap-3", children: (loading ? [0, 1, 2] : top3).map((item, idx) => {
                                    const delay = idx * 0.12;
                                    // LOADING CARD
                                    if (loading) {
                                        return (_jsxs(motion.div, { initial: { opacity: 0, y: 10, scale: 0.98 }, animate: { opacity: 1, y: 0, scale: 1 }, transition: { duration: 0.28, delay }, className: cn(glassDark, "h-[150px]"), children: [_jsx(GlassOverlays, {}), _jsxs("div", { className: "relative z-10 px-5 py-4 h-full flex flex-col justify-between", children: [_jsxs("div", { className: "text-flash/60 text-xs uppercase tracking-wide", children: ["TOP ", idx + 1] }), _jsx("div", { className: "text-flash/30 text-sm", children: "Loading..." }), _jsx("div", { className: "w-full h-1 bg-white/10 rounded-full overflow-hidden", children: _jsx("div", { className: "h-full bg-jade/40 w-[35%] animate-pulse" }) })] })] }, `loading-${idx}`));
                                    }
                                    // RESULT CARD
                                    const c = item;
                                    const medal = idx === 0 ? "text-yellow-300" : idx === 1 ? "text-slate-300" : "text-amber-600";
                                    const accountsSorted = Object.entries(c.perAccount).sort((a, b) => b[1] - a[1]);
                                    return (_jsxs(motion.div, { initial: { opacity: 0, y: 12, scale: 0.98 }, animate: { opacity: 1, y: 0, scale: 1 }, transition: { duration: 1.5, delay }, className: cn(glassDark), children: [_jsx(GlassOverlays, {}), _jsxs("div", { className: "relative z-10 px-5 py-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "text-flash/60 text-xs uppercase tracking-wide", children: ["TOP ", idx + 1] }), _jsx(Crown, { className: cn("w-4 h-4", medal) })] }), _jsxs("div", { className: "flex items-center gap-3 mt-3", children: [_jsx("img", { src: `https://cdn2.loldata.cc/16.1.1/img/champion/${c.championName}.png`, onError: (e) => {
                                                                    e.currentTarget.style.display = "none";
                                                                }, className: "w-12 h-12 rounded-md", alt: c.championName, draggable: false }), _jsxs("div", { className: "min-w-0", children: [_jsx("div", { className: "text-flash uppercase font-bold truncate", children: c.championName }), _jsxs("div", { className: "text-flash/60 text-xs", children: [formatNumber(c.points), " points"] })] })] }), _jsxs("div", { className: "mt-4", children: [_jsx("div", { className: "w-full h-1 bg-white/10 rounded-full overflow-hidden", children: _jsx("div", { className: "h-full bg-jade", style: { width: `${Math.max(20, 100 - idx * 18)}%` } }) }), _jsxs("div", { className: "mt-3", children: [_jsx("div", { className: "text-[11px] uppercase tracking-wide text-flash/60", children: "Breakdown" }), _jsx(TooltipProvider, { delayDuration: 80, children: _jsxs("div", { className: "mt-2 flex flex-col gap-1", children: [accountsSorted.slice(0, 4).map(([acc, pts]) => (_jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsxs("div", { className: "flex items-center justify-between text-xs", children: [_jsx("span", { className: "text-flash/70 truncate max-w-[70%]", children: acc }), _jsx("span", { className: "text-jade", children: formatNumber(pts) })] }) }), _jsxs(TooltipContent, { side: "top", className: "text-xs max-w-xs", children: [acc, ": ", formatNumber(pts), " points"] })] }, acc))), accountsSorted.length > 4 && (_jsxs("div", { className: "text-[11px] text-flash/40", children: ["+", accountsSorted.length - 4, " more accounts"] }))] }) })] })] })] })] }, `champ-${c.championId}-${idx}`));
                                }) }, "results")) })] }) })] }));
}
