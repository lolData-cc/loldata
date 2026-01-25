// totalmastery.tsx
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { API_BASE_URL } from "@/config";
import { BorderBeam } from "@/components/ui/border-beam";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Sparkles, Crown } from "lucide-react";
import UltraTechBackground from "@/components/techdetails";
import { showCyberToast } from "@/lib/toast-utils";
import { motion, AnimatePresence } from "framer-motion";
import { GlassOverlays } from "@/components/ui/glass-overlays";

type Region = "EUW" | "NA" | "KR";

type MasteryEntry = {
    championId: number;
    championPoints: number;
    championLevel?: number;
    lastPlayTime?: number;
};

type AccountRow = {
    id: string;
    riotId: string; // "name#tag"
    region: Region;
};

function uid() {
    return Math.random().toString(36).slice(2, 10);
}

function formatNumber(n: number) {
    // 4 000 000
    return new Intl.NumberFormat(undefined).format(n);
}

function parseRiotId(v: string) {
    const raw = v.trim();
    if (!raw.includes("#")) return null;
    const [nameRaw, tagRaw] = raw.split("#");
    const name = (nameRaw || "").trim();
    const tag = (tagRaw || "").trim();
    if (!name || !tag) return null;
    return { name, tag };
}

export default function TotalMasteryPage() {
    const [accounts, setAccounts] = useState<AccountRow[]>([
        { id: uid(), riotId: "", region: "EUW" },
    ]);

    const [latestPatch, setLatestPatch] = useState("15.13.1");
    const [championMap, setChampionMap] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState(false);

    // results
    const [top3, setTop3] = useState<
        { championId: number; championName: string; points: number; perAccount: Record<string, number> }[]
    >([]);

    // region popovers state per row
    const [regionPopoverOpen, setRegionPopoverOpen] = useState<Record<string, boolean>>({});

    const glassDark = cn(
        "relative overflow-hidden rounded-md",
        "bg-black/25 backdrop-blur-lg saturate-150",
        "shadow-[0_10px_30px_rgba(0,0,0,0.55),inset_0_0_0_0.5px_rgba(255,255,255,0.10),inset_0_1px_0_rgba(255,255,255,0.05)]"
    );

    const glassOverlays = (
  <>
    {/* TOP highlight (molto più visibile, ma senza bordo) */}
    <div
      className="pointer-events-none absolute -top-28 left-0 w-full h-[360px] z-[1]"
      style={{
        background:
          "radial-gradient(120% 80% at 18% 18%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 32%, rgba(255,255,255,0.03) 52%, rgba(255,255,255,0.0) 72%)",
      }}
    />

    {/* Vignette laterale: elimina effetto “rettangolo” ai bordi */}
    <div
      className="pointer-events-none absolute inset-0 z-[1]"
      style={{
        background:
          "radial-gradient(140% 120% at 50% 40%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.45) 100%)",
      }}
    />

    {/* Shading verticale glass */}
    <div
      className="pointer-events-none absolute inset-0 z-[1]"
      style={{
        background:
          "linear-gradient(to bottom, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 38%, rgba(0,0,0,0.40) 100%)",
      }}
    />

    {/* Bottom fade EXTRA (nasconde lo stacco sotto) */}
    <div
      className="pointer-events-none absolute -bottom-10 left-0 right-0 h-36 z-[2]"
      style={{
        background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0) 70%)",
      }}
    />
  </>
);



    const [hasCalculated, setHasCalculated] = useState(false);

    // fetch latest patch
    useEffect(() => {
        fetch("https://ddragon.leagueoflegends.com/api/versions.json")
            .then((res) => res.json())
            .then((versions: string[]) => setLatestPatch(versions?.[0] ?? "15.13.1"))
            .catch(() => { });
    }, []);

    // fetch champion map (id -> name)
    useEffect(() => {
        //TO FIX
        fetch(`https://cdn2.loldata.cc/16.1.1/data/en_US/champion.json`)
            .then((res) => {
                if (!res.ok) throw new Error("Failed to load champion.json");
                return res.json();
            })
            .then((data) => {
                const map: Record<number, string> = {};
                Object.values(data.data).forEach((champ: any) => {
                    const numId = Number(champ.key); // champ.key is numeric id as string
                    if (!Number.isNaN(numId)) map[numId] = champ.id; // champ.id = "Aatrox"
                });
                setChampionMap(map);
            })
            .catch((err) => {
                console.error("Error loading champions:", err);
            });
    }, [latestPatch]);

    const canCompute = useMemo(() => {
        const filled = accounts.filter((a) => a.riotId.trim().length > 0);
        if (filled.length === 0) return false;
        return filled.every((a) => !!parseRiotId(a.riotId));
    }, [accounts]);

    function addAccount() {
        setAccounts((prev) => [...prev, { id: uid(), riotId: "", region: "EUW" }]);
    }

    function removeAccount(id: string) {
        setAccounts((prev) => prev.filter((a) => a.id !== id));
        setRegionPopoverOpen((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
    }

    function updateAccount(id: string, patch: Partial<AccountRow>) {
        setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    }

    async function fetchMasteryList(name: string, tag: string, region: Region): Promise<MasteryEntry[]> {
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
        return (data?.masteryList ?? []) as MasteryEntry[];
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
            const totals = new Map<number, number>();
            const breakdown = new Map<number, Record<string, number>>();

            await Promise.all(
                active.map(async (a) => {
                    const { name, tag } = a.parsed!;
                    const list = await fetchMasteryList(name, tag, a.region);

                    // key account label
                    const accLabel = `${name}#${tag} (${a.region})`;

                    for (const m of list) {
                        const id = Number(m.championId);
                        const pts = Number(m.championPoints ?? 0);
                        if (!id || !pts) continue;

                        totals.set(id, (totals.get(id) ?? 0) + pts);

                        const b = breakdown.get(id) ?? {};
                        b[accLabel] = (b[accLabel] ?? 0) + pts;
                        breakdown.set(id, b);
                    }
                })
            );

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
        } catch (e: any) {
            console.error(e);
            showCyberToast({
                title: "Error",
                description: e?.message ?? "Unexpected error while fetching mastery.",
                tag: "ERR",
                variant: "error",
            });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="relative z-0">
            <UltraTechBackground />
            <div className="relative flex min-h-screen -mt-4 z-10">
                <div className="w-full max-w-5xl mx-auto px-4 py-6">
                    {/* HEADER */}
                    <div className={cn(glassDark, "mb-4")}>
                        <GlassOverlays />
                        <BorderBeam duration={8} size={120} />

                        <div className="relative z-10 px-5 py-4">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="text-flash/70 text-xs tracking-wide uppercase">
                                        Multi-account mastery
                                    </div>
                                    <div className="text-flash text-2xl mt-1 flex items-center gap-2">
                                        TOTAL TOP 3 CHAMPIONS 
                                    </div>
                                    <div className="text-flash/50 text-sm mt-1 max-w-2xl font-geist">
                                        Add as many accounts as you want. We’ll sum champion mastery points across them and show your Top 3.
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        onClick={addAccount}
                                        className="bg-jade/20 text-jade hover:bg-jade/30 rounded uppercase tracking-wide"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        ADD ACCOUNT
                                    </Button>
                                    <Button
                                        type="button"
                                        disabled={!canCompute || loading}
                                        onClick={compute}
                                        className={cn(
                                            "rounded uppercase tracking-wide",
                                            "bg-[#1D2436] hover:bg-[#243554] border border-white/10",
                                            "text-[#D0E3FF]"
                                        )}
                                    >
                                        {loading ? "CALCULATING..." : "CALCULATE"}
                                    </Button>
                                </div>
                            </div>

                            <Separator className="bg-white/10 my-4" />

                            {/* ACCOUNTS LIST */}
                            <div className="flex flex-col gap-2">
                                {accounts.map((a, idx) => {
                                    const open = !!regionPopoverOpen[a.id];
                                    return (
                                        <div
                                            key={a.id}
                                            className={cn(
                                                "relative overflow-hidden rounded-md px-3 py-2",
                                                "bg-black/18 backdrop-blur-lg saturate-150",
                                                "shadow-[0_10px_30px_rgba(0,0,0,0.50),inset_0_0_0_0.35px_rgba(255,255,255,0.06),inset_0_1px_0_rgba(255,255,255,0.03)]"
                                            )}
                                        >
                                            <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-white/3 via-transparent to-black/40" />
                                            <div className="relative z-10 flex items-center gap-2">
                                                <div className="w-8 text-flash/40 text-xs font-jetbrains">
                                                    #{String(idx + 1).padStart(2, "0")}
                                                </div>

                                                <Input
                                                    placeholder="name#TAG  (ex: Acc1#EUW)"
                                                    value={a.riotId}
                                                    onChange={(e) => updateAccount(a.id, { riotId: e.target.value })}
                                                    className="bg-black/20 border border-flash/10 hover:border-flash/20 focus:outline-none focus:ring-1 focus:ring-flash/20 rounded text-flash placeholder:text-flash/20"
                                                />

                                                <Popover
                                                    open={open}
                                                    onOpenChange={(v) =>
                                                        setRegionPopoverOpen((prev) => ({ ...prev, [a.id]: v }))
                                                    }
                                                >
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            role="combobox"
                                                            className="w-[90px] justify-between bg-black/20 border border-flash/10 text-flash hover:border-flash/20"
                                                        >
                                                            {a.region}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="pointer-events-auto z-[9999] w-[110px] p-0 bg-liquirice/90 border-flash/20 cursor-clicker">
                                                        <Command>
                                                            <CommandList>
                                                                <CommandEmpty>No region found.</CommandEmpty>
                                                                <CommandGroup>
                                                                    {(["EUW", "NA", "KR"] as Region[]).map((r) => (
                                                                        <CommandItem
                                                                            key={r}
                                                                            value={r}
                                                                            onSelect={() => {
                                                                                updateAccount(a.id, { region: r });
                                                                                setRegionPopoverOpen((prev) => ({ ...prev, [a.id]: false }));
                                                                            }}
                                                                        >
                                                                            {r}
                                                                        </CommandItem>
                                                                    ))}
                                                                </CommandGroup>
                                                            </CommandList>
                                                        </Command>
                                                    </PopoverContent>
                                                </Popover>

                                                <TooltipProvider delayDuration={80}>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                type="button"
                                                                onClick={() => removeAccount(a.id)}
                                                                className="bg-transparent hover:bg-white/5 border border-white/10 text-flash/70"
                                                                disabled={accounts.length === 1}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top" className="text-xs">
                                                            Remove account
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="text-[11px] text-flash/40 mt-3">
                                Tip: you can paste multiple rows quickly by adding more accounts and using Ctrl+V.
                            </div>
                        </div>
                    </div>

                    {/* RESULTS */}
                    <AnimatePresence mode="wait">
                        {hasCalculated && (
                            <motion.div
                                key="results"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                transition={{ duration: 1.50 }}
                                className="grid grid-cols-1 md:grid-cols-3 gap-3"
                            >
                                {(loading ? [0, 1, 2] : top3).map((item: any, idx: number) => {
                                    const delay = idx * 0.12;

                                    // LOADING CARD
                                    if (loading) {
                                        return (
                                            <motion.div
                                                key={`loading-${idx}`}
                                                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                transition={{ duration: 0.28, delay }}
                                                className={cn(glassDark, "h-[150px]")}
                                            >
                                                <GlassOverlays />
                                                <div className="relative z-10 px-5 py-4 h-full flex flex-col justify-between">
                                                    <div className="text-flash/60 text-xs uppercase tracking-wide">
                                                        TOP {idx + 1}
                                                    </div>
                                                    <div className="text-flash/30 text-sm">Loading...</div>
                                                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                                        <div className="h-full bg-jade/40 w-[35%] animate-pulse" />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    }

                                    // RESULT CARD
                                    const c = item as {
                                        championId: number;
                                        championName: string;
                                        points: number;
                                        perAccount: Record<string, number>;
                                    };

                                    const medal =
                                        idx === 0 ? "text-yellow-300" : idx === 1 ? "text-slate-300" : "text-amber-600";

                                    const accountsSorted = Object.entries(c.perAccount).sort((a, b) => b[1] - a[1]);

                                    return (
                                        <motion.div
                                            key={`champ-${c.championId}-${idx}`}
                                            initial={{ opacity: 0, y: 12, scale: 0.98 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            transition={{ duration: 1.5, delay }}
                                            className={cn(glassDark)}
                                        >
                                            <GlassOverlays />

                                            <div className="relative z-10 px-5 py-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="text-flash/60 text-xs uppercase tracking-wide">
                                                        TOP {idx + 1}
                                                    </div>
                                                    <Crown className={cn("w-4 h-4", medal)} />
                                                </div>

                                                <div className="flex items-center gap-3 mt-3">
                                                    <img
                                                        src={`https://cdn2.loldata.cc/16.1.1/img/champion/${c.championName}.png`}
                                                        onError={(e) => {
                                                            (e.currentTarget as HTMLImageElement).style.display = "none";
                                                        }}
                                                        className="w-12 h-12 rounded-md"
                                                        alt={c.championName}
                                                        draggable={false}
                                                    />
                                                    <div className="min-w-0">
                                                        <div className="text-flash uppercase font-bold truncate">
                                                            {c.championName}
                                                        </div>
                                                        <div className="text-flash/60 text-xs">
                                                            {formatNumber(c.points)} points
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mt-4">
                                                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-jade"
                                                            style={{ width: `${Math.max(20, 100 - idx * 18)}%` }}
                                                        />
                                                    </div>

                                                    <div className="mt-3">
                                                        <div className="text-[11px] uppercase tracking-wide text-flash/60">
                                                            Breakdown
                                                        </div>

                                                        <TooltipProvider delayDuration={80}>
                                                            <div className="mt-2 flex flex-col gap-1">
                                                                {accountsSorted.slice(0, 4).map(([acc, pts]) => (
                                                                    <Tooltip key={acc}>
                                                                        <TooltipTrigger asChild>
                                                                            <div className="flex items-center justify-between text-xs">
                                                                                <span className="text-flash/70 truncate max-w-[70%]">
                                                                                    {acc}
                                                                                </span>
                                                                                <span className="text-jade">{formatNumber(pts)}</span>
                                                                            </div>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="top" className="text-xs max-w-xs">
                                                                            {acc}: {formatNumber(pts)} points
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                ))}

                                                                {accountsSorted.length > 4 && (
                                                                    <div className="text-[11px] text-flash/40">
                                                                        +{accountsSorted.length - 4} more accounts
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </TooltipProvider>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
