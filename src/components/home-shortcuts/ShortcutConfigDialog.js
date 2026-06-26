import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Crosshair, User, Compass, GraduationCap, Dice3, Trophy, Search, ChevronDown, } from "lucide-react";
import { cn } from "@/lib/utils";
import { BorderBeam } from "@/components/ui/border-beam";
import { useAuth } from "@/context/authcontext";
import { API_BASE_URL, cdnBaseUrl, normalizeChampName } from "@/config";
import { supabase } from "@/lib/supabaseClient";
// ─── known tab catalogs ─────────────────────────────────────────────
//
// Keep these in sync with src/pages/championdetailpage.tsx and
// src/pages/learnpage.tsx — they're the SAME identifiers the routes
// use, just exposed here as picker options.
const CHAMPION_TABS = [
    { value: "overview", label: "Overview" },
    { value: "statistics", label: "Statistics" },
    { value: "items", label: "Items" },
    { value: "matchups", label: "Matchups" },
    { value: "guides", label: "Guides" },
    { value: "pros", label: "Pros" },
];
const LEARN_TABS = [
    { value: "overview", label: "Overview" },
    { value: "games", label: "Your Games" },
    { value: "itemization", label: "Itemization" },
    { value: "loldata-ai", label: "LolData AI" },
];
const SCOUT_TABS = [
    { value: "matches", label: "Matches" },
    { value: "live", label: "Live" },
    { value: "leaderboard", label: "Leaderboard" },
    { value: "trending", label: "Trending" },
    { value: "habits", label: "Habits" },
    { value: "champions", label: "Champions" },
];
// ─── main dialog ────────────────────────────────────────────────────
export function ShortcutConfigDialog({ open, onOpenChange, initial, onSave, }) {
    const { session } = useAuth();
    const loggedIn = !!session;
    const [stage, setStage] = useState(null);
    useEffect(() => {
        if (!open)
            return;
        setStage(initial?.kind ?? null);
    }, [open, initial]);
    const types = [
        { kind: "champion", label: "Champion", desc: "Open a champion page directly, optionally pinned to a tab.", Icon: Compass },
        { kind: "summoner", label: "Summoner", desc: "Jump straight to a player's profile or season tab.", Icon: User },
        { kind: "scout", label: "Scout lobby", desc: "Open a lobby with optional tab + per-player filter.", Icon: Crosshair },
        {
            kind: "learn",
            label: "Learn",
            desc: "Your personal learn page.",
            Icon: GraduationCap,
            disabledReason: loggedIn ? undefined : "Log in to use this shortcut",
        },
        { kind: "loldle", label: "LoLdle", desc: "Today's LoLdle puzzle.", Icon: Dice3 },
        { kind: "leaderboard", label: "Leaderboard", desc: "Filtered by region + ladder type.", Icon: Trophy },
    ];
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsx(DialogContent, { className: cn("w-[95vw] max-w-[560px] bg-transparent shadow-none border-none p-0", "top-[14vh] translate-y-0", "[&>button]:hidden"), children: _jsxs(motion.div, { className: cn("relative overflow-hidden rounded-md", "bg-black/75 backdrop-blur-xl saturate-150"), style: {
                    boxShadow: "0 24px 70px rgba(0,0,0,0.75), 0 0 36px rgba(0,217,146,0.08), inset 0 0 0 0.5px rgba(255,255,255,0.10), inset 0 1px 0 rgba(255,255,255,0.04)",
                }, initial: {
                    clipPath: "inset(49.5% 49.5% 49.5% 49.5%)",
                    scale: 0.96,
                    opacity: 0.85,
                }, animate: {
                    clipPath: [
                        "inset(49.5% 49.5% 49.5% 49.5%)", // 0% — point
                        "inset(48% 0% 48% 0%)", // 32% — full-width slit
                        "inset(0% 0% 0% 0%)", // 100% — open
                    ],
                    scale: [0.96, 0.98, 1],
                    opacity: [0.85, 1, 1],
                }, transition: {
                    duration: 0.6,
                    times: [0, 0.32, 1],
                    ease: [0.4, 0, 0.2, 1],
                }, children: [_jsx(motion.span, { "aria-hidden": true, className: "absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] pointer-events-none z-20", style: {
                            background: "linear-gradient(90deg, transparent 0%, rgba(0,217,146,0.95) 12%, rgba(255,255,255,1) 50%, rgba(0,217,146,0.95) 88%, transparent 100%)",
                            boxShadow: "0 0 18px rgba(0,217,146,1), 0 0 36px rgba(0,217,146,0.5), 0 0 60px rgba(0,217,146,0.25)",
                            transformOrigin: "center",
                        }, initial: { scaleX: 0.05, opacity: 0 }, animate: {
                            scaleX: [0.05, 1, 1],
                            opacity: [0, 1, 0],
                        }, transition: {
                            duration: 0.6,
                            times: [0, 0.32, 0.85],
                            ease: "easeOut",
                        } }), _jsx(BorderBeam, { duration: 9, size: 140 }), _jsxs(motion.div, { className: "relative z-10 px-6 py-5 space-y-4", initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.22, delay: 0.42, ease: "easeOut" }, children: [_jsx(DialogTitle, { className: "sr-only", children: "Configure shortcut" }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx("div", { className: "w-1 h-4 bg-jade rounded-full shadow-[0_0_10px_rgba(0,217,146,0.45)]" }), _jsx("span", { className: "text-[12px] font-jetbrains text-flash/60 tracking-[0.22em] uppercase", children: stage === null ? "Shortcut · Type" : "Shortcut · Details" })] }), stage !== null && (_jsx("button", { type: "button", onClick: () => setStage(null), className: "text-[9px] font-jetbrains tracking-[0.2em] uppercase text-flash/40 hover:text-jade cursor-clicker", children: "\u2190 Change type" }))] }), stage === null ? (_jsx(TypeGrid, { types: types, onPick: (kind) => setStage(kind) })) : (_jsx(TypeForm, { kind: stage, initial: initial?.kind === stage ? initial : null, onCancel: () => onOpenChange(false), onSave: (v) => {
                                    onSave(v);
                                    onOpenChange(false);
                                }, loggedIn: loggedIn }))] })] }) }) }));
}
// ─── Step 1: type picker grid ───────────────────────────────────────
function TypeGrid({ types, onPick, }) {
    return (_jsx("div", { className: "grid grid-cols-2 gap-2", children: types.map((t) => {
            const disabled = !!t.disabledReason;
            return (_jsxs("button", { type: "button", onClick: () => !disabled && onPick(t.kind), disabled: disabled, title: disabled ? t.disabledReason : undefined, className: cn("group text-left rounded-sm p-3 border transition-all duration-200 cursor-clicker", "bg-white/[0.02] border-white/[0.06]", "hover:border-jade/35 hover:bg-jade/[0.06]", "disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-white/[0.02] disabled:hover:border-white/[0.06]"), children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx(t.Icon, { className: "w-4 h-4 text-jade/80", strokeWidth: 2 }), _jsx("span", { className: "font-chakrapetch font-bold uppercase tracking-[0.08em] text-[12px] text-flash group-hover:text-jade transition-colors", children: t.label })] }), _jsx("p", { className: "font-jetbrains text-[10px] text-flash/40 leading-snug", children: t.disabledReason ?? t.desc })] }, t.kind));
        }) }));
}
// ─── Step 2: per-type forms ─────────────────────────────────────────
function TypeForm({ kind, initial, onCancel, onSave, loggedIn, }) {
    switch (kind) {
        case "champion":
            return _jsx(ChampionForm, { initial: asInitial(initial, "champion"), onCancel: onCancel, onSave: onSave });
        case "summoner":
            return _jsx(SummonerForm, { initial: asInitial(initial, "summoner"), onCancel: onCancel, onSave: onSave });
        case "scout":
            return _jsx(ScoutForm, { initial: asInitial(initial, "scout"), onCancel: onCancel, onSave: onSave });
        case "learn":
            return _jsx(LearnForm, { initial: asInitial(initial, "learn"), onCancel: onCancel, onSave: onSave, loggedIn: loggedIn });
        case "loldle":
            return _jsx(LoldleForm, { initial: asInitial(initial, "loldle"), onCancel: onCancel, onSave: onSave });
        case "leaderboard":
            return _jsx(LeaderboardForm, { initial: asInitial(initial, "leaderboard"), onCancel: onCancel, onSave: onSave });
    }
}
function asInitial(initial, kind) {
    if (!initial || initial.kind !== kind)
        return null;
    return initial;
}
// ─── form chrome (shared inputs) ────────────────────────────────────
const labelClass = "block font-jetbrains text-[9px] tracking-[0.22em] uppercase text-flash/40 mb-1.5";
const inputClass = cn("w-full bg-white/[0.03] border border-white/[0.08] rounded-sm", "px-3 py-2 text-[13px] font-jetbrains text-flash", "placeholder:text-flash/20", "focus:outline-none focus:border-jade/35 focus:bg-white/[0.05]", "transition-colors duration-150");
function FormFooter({ saveLabel = "Save shortcut", onCancel, onSave, saveDisabled, }) {
    return (_jsxs("div", { className: "flex items-center justify-between pt-2 mt-1 border-t border-white/[0.05]", children: [_jsx("button", { type: "button", onClick: onCancel, className: "font-jetbrains text-[10px] tracking-[0.2em] uppercase text-flash/40 hover:text-flash/70 cursor-clicker", children: "Cancel" }), _jsx("button", { type: "button", onClick: onSave, disabled: saveDisabled, className: cn("font-chakrapetch text-[12px] tracking-[0.12em] uppercase px-3.5 py-1.5 rounded-sm cursor-clicker", "border transition-all duration-200", saveDisabled
                    ? "border-flash/10 bg-flash/[0.02] text-flash/25 cursor-not-allowed"
                    : "border-jade/35 bg-jade/10 text-jade hover:bg-jade/20 hover:border-jade/60 shadow-[0_0_18px_rgba(0,217,146,0.10)]"), children: saveLabel })] }));
}
// ─── per-type forms ─────────────────────────────────────────────────
function ChampionForm({ initial, onCancel, onSave, }) {
    const [name, setName] = useState(initial?.championName ?? null);
    const [tab, setTab] = useState(initial?.tab ?? "");
    return (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("label", { className: labelClass, children: "Champion" }), _jsx(ChampionCombobox, { value: name, onChange: setName })] }), _jsxs("div", { children: [_jsx("label", { className: labelClass, children: "Tab (optional)" }), _jsx(SegmentedPicker, { value: tab, options: [
                            { value: "", label: "Page (default)" },
                            ...CHAMPION_TABS,
                        ], onChange: (v) => setTab(v) })] }), _jsx(FormFooter, { onCancel: onCancel, onSave: () => name &&
                    onSave({
                        kind: "champion",
                        championName: name,
                        tab: tab || null,
                    }), saveDisabled: !name })] }));
}
function SummonerForm({ initial, onCancel, onSave, }) {
    const [region, setRegion] = useState(initial?.region ?? "EUW");
    const [name, setName] = useState(initial?.name ?? "");
    const [tag, setTag] = useState(initial?.tag ?? "");
    const [tab, setTab] = useState(initial?.tab ?? "");
    const valid = name.trim().length >= 1 && tag.trim().length >= 1;
    return (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "grid grid-cols-[1fr_auto_120px] gap-2 items-end", children: [_jsxs("div", { children: [_jsx("label", { className: labelClass, children: "Name" }), _jsx("input", { className: inputClass, value: name, onChange: (e) => setName(e.target.value), placeholder: "Riot name", autoFocus: true })] }), _jsx("div", { className: "self-end text-flash/35 font-jetbrains pb-2.5", children: "#" }), _jsxs("div", { children: [_jsx("label", { className: labelClass, children: "Tag" }), _jsx("input", { className: inputClass, value: tag, onChange: (e) => setTag(e.target.value), placeholder: "EUW" })] })] }), _jsxs("div", { children: [_jsx("label", { className: labelClass, children: "Region" }), _jsx(SegmentedPicker, { value: region, options: [
                            { value: "EUW", label: "EUW" },
                            { value: "NA", label: "NA" },
                            { value: "KR", label: "KR" },
                        ], onChange: (v) => setRegion(v) })] }), _jsxs("div", { children: [_jsx("label", { className: labelClass, children: "Open on" }), _jsx(SegmentedPicker, { value: tab, options: [
                            { value: "", label: "Profile" },
                            { value: "season", label: "This Season" },
                        ], onChange: (v) => setTab(v) })] }), _jsx(FormFooter, { onCancel: onCancel, onSave: () => onSave({
                    kind: "summoner",
                    region,
                    name: name.trim(),
                    tag: tag.trim().toUpperCase(),
                    tab: tab || null,
                }), saveDisabled: !valid })] }));
}
function ScoutForm({ initial, onCancel, onSave, }) {
    const [slug, setSlug] = useState(initial?.slug ?? "");
    // Lobby's human-readable name, captured when picked from the user's
    // own lobbies. Saved alongside the slug so the rhombus caption can
    // read "Crunchyroll" instead of "MB9Wnfz Lobby". Cleared when the
    // user manually edits the slug — that means they're pointing at a
    // different (probably someone else's) lobby and the previous name
    // would be stale.
    const [lobbyName, setLobbyName] = useState(initial?.name ?? null);
    const [tab, setTab] = useState(initial?.tab ?? "");
    const [playerFilter, setPlayerFilter] = useState(initial?.playerFilter ?? null);
    const [mainOnly, setMainOnly] = useState(initial?.mainOnly ?? false);
    return (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("label", { className: labelClass, children: "Your lobbies" }), _jsx(MyLobbiesCombobox, { value: slug, onPick: (s, n) => {
                            setSlug(s);
                            setLobbyName(n);
                        } })] }), _jsxs("div", { children: [_jsx("label", { className: labelClass, children: "Or paste a lobby code" }), _jsx("input", { className: inputClass, value: slug, onChange: (e) => {
                            setSlug(e.target.value);
                            // Typing a new slug invalidates whatever lobby name was
                            // captured — fall back to "<slug> Lobby" until/unless the
                            // user picks a known lobby from the dropdown above.
                            setLobbyName(null);
                        }, placeholder: "e.g. MB9Wnfz" })] }), _jsxs("div", { children: [_jsx("label", { className: labelClass, children: "Tab (optional)" }), _jsx(SegmentedPicker, { value: tab, options: [
                            { value: "", label: "Default" },
                            ...SCOUT_TABS.map((t) => ({ value: t.value ?? "", label: t.label })),
                        ], onChange: (v) => setTab(v) })] }), _jsxs("div", { children: [_jsx("label", { className: labelClass, children: "Player filter (optional)" }), _jsx(ScoutPlayerCombobox, { slug: slug.trim(), value: playerFilter ?? null, onChange: setPlayerFilter })] }), _jsx(CheckRow, { checked: mainOnly, onChange: setMainOnly, label: "Main account only" }), _jsx(FormFooter, { onCancel: onCancel, onSave: () => onSave({
                    kind: "scout",
                    slug: slug.trim(),
                    name: lobbyName,
                    tab: tab || null,
                    playerFilter: playerFilter || null,
                    mainOnly,
                }), saveDisabled: slug.trim().length < 1 })] }));
}
function LearnForm({ initial, onCancel, onSave, loggedIn, }) {
    const [tab, setTab] = useState(initial?.tab ?? "");
    if (!loggedIn) {
        return (_jsxs("div", { className: "space-y-3", children: [_jsx("p", { className: "font-jetbrains text-[12px] text-flash/55 leading-relaxed", children: "This shortcut needs you to be logged in \u2014 the learn page is tied to your account. Log in first, then come back to set it up." }), _jsx(FormFooter, { onCancel: onCancel, onSave: onCancel, saveLabel: "OK" })] }));
    }
    return (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("label", { className: labelClass, children: "Tab" }), _jsx(SegmentedPicker, { value: tab, options: [
                            { value: "", label: "Default" },
                            ...LEARN_TABS,
                        ], onChange: (v) => setTab(v) })] }), _jsx(FormFooter, { onCancel: onCancel, onSave: () => onSave({ kind: "learn", tab: tab || null }) })] }));
}
function LoldleForm({ onCancel, onSave, }) {
    return (_jsxs("div", { className: "space-y-3", children: [_jsx("p", { className: "font-jetbrains text-[12px] text-flash/55 leading-relaxed", children: "Nothing to configure \u2014 this shortcut opens today's LoLdle puzzle. Hit save to drop it into the slot." }), _jsx(FormFooter, { onCancel: onCancel, onSave: () => onSave({ kind: "loldle" }) })] }));
}
function LeaderboardForm({ initial, onCancel, onSave, }) {
    const [region, setRegion] = useState(initial?.region ?? "EUW");
    const [ladder, setLadder] = useState(initial?.ladder ?? "solo");
    return (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("label", { className: labelClass, children: "Region" }), _jsx(SegmentedPicker, { value: region, options: [
                            { value: "EUW", label: "EUW" },
                            { value: "NA", label: "NA" },
                            { value: "KR", label: "KR" },
                        ], onChange: (v) => setRegion(v) })] }), _jsxs("div", { children: [_jsx("label", { className: labelClass, children: "Ladder" }), _jsx(SegmentedPicker, { value: ladder, options: [
                            { value: "solo", label: "Solo / Duo" },
                            { value: "flex", label: "Flex" },
                        ], onChange: (v) => setLadder(v) })] }), _jsx(FormFooter, { onCancel: onCancel, onSave: () => onSave({ kind: "leaderboard", region, ladder }) })] }));
}
// ─── tiny shared inputs ─────────────────────────────────────────────
function SegmentedPicker({ value, options, onChange, }) {
    return (_jsx("div", { className: "flex gap-1.5 flex-wrap", children: options.map((opt) => {
            const active = opt.value === value;
            return (_jsx("button", { type: "button", onClick: () => onChange(opt.value), className: cn("px-3 h-9 rounded-sm border font-chakrapetch text-[11px] tracking-[0.15em] uppercase cursor-clicker", "transition-all duration-200", active
                    ? "text-jade bg-jade/10 border-jade/30"
                    : "text-flash/40 border-white/[0.06] hover:text-flash/65 hover:border-white/[0.14] bg-black/30"), children: opt.label }, opt.value));
        }) }));
}
function CheckRow({ checked, onChange, label, }) {
    return (_jsxs("button", { type: "button", onClick: () => onChange(!checked), className: "flex items-center gap-2.5 w-full text-left cursor-clicker py-1", children: [_jsx("span", { className: cn("w-4 h-4 rounded-[3px] border flex items-center justify-center transition-all duration-200", checked
                    ? "border-jade bg-jade/20 shadow-[0_0_8px_rgba(0,217,146,0.3)]"
                    : "border-flash/25 bg-white/[0.02]"), children: checked && (_jsx("svg", { viewBox: "0 0 8 7", className: "w-2.5 h-2.5", children: _jsx("polyline", { points: "1,4 3,6 7,1", fill: "none", stroke: "#00d992", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }) })) }), _jsx("span", { className: "font-jetbrains text-[11px] tracking-[0.1em] text-flash/65", children: label })] }));
}
// ─── ChampionCombobox ────────────────────────────────────────────────
//
// Autocomplete dropdown of every champion in Data Dragon. Pasted-down
// open state, search-as-you-type, click to select. We pre-hydrate the
// list from the CDN once and cache it on the module level so opening
// multiple times in a session doesn't re-hit the network.
let CHAMP_CACHE = null;
function ChampionCombobox({ value, onChange, }) {
    const [champs, setChamps] = useState(CHAMP_CACHE ?? []);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const containerRef = useRef(null);
    // Hydrate once. Fault-tolerant — empty list just means the picker
    // shows "no champions loaded" and falls back to typing.
    useEffect(() => {
        if (CHAMP_CACHE)
            return;
        fetch(`${cdnBaseUrl()}/data/en_US/champion.json`)
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
            if (!data?.data)
                return;
            const list = Object.values(data.data).map((c) => ({
                id: c.key,
                name: c.id,
            }));
            list.sort((a, b) => a.name.localeCompare(b.name));
            CHAMP_CACHE = list;
            setChamps(list);
        })
            .catch(() => { });
    }, []);
    // Close on outside click.
    useEffect(() => {
        if (!open)
            return;
        const onDoc = (e) => {
            if (!containerRef.current?.contains(e.target))
                setOpen(false);
        };
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, [open]);
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q)
            return champs.slice(0, 20);
        return champs.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 20);
    }, [champs, query]);
    return (_jsxs("div", { ref: containerRef, className: "relative", children: [_jsxs("button", { type: "button", onClick: () => setOpen((o) => !o), className: cn(inputClass, "flex items-center gap-2 text-left h-10", "hover:border-jade/25"), children: [value ? (_jsxs(_Fragment, { children: [_jsx("img", { src: `${cdnBaseUrl()}/img/champion/${normalizeChampName(value)}.png`, alt: "", className: "w-6 h-6 rounded-full ring-1 ring-jade/30", draggable: false }), _jsx("span", { className: "text-flash font-chakrapetch tracking-wide uppercase text-[12px]", children: value })] })) : (_jsx("span", { className: "text-flash/35 text-[13px]", children: "Pick a champion\u2026" })), _jsx(ChevronDown, { className: cn("ml-auto w-4 h-4 text-flash/35 transition-transform duration-200", open && "rotate-180") })] }), open && (_jsxs("div", { className: cn("absolute left-0 right-0 mt-2 z-50 rounded-sm overflow-hidden", "bg-black/90 backdrop-blur-xl border border-white/10", "shadow-[0_16px_44px_rgba(0,0,0,0.7),inset_0_0_0_0.5px_rgba(255,255,255,0.05)]"), children: [_jsx("div", { className: "p-2 border-b border-white/[0.06]", children: _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-flash/25 pointer-events-none" }), _jsx("input", { autoFocus: true, value: query, onChange: (e) => setQuery(e.target.value), placeholder: "Search champion\u2026", className: cn("w-full bg-white/[0.03] border border-white/[0.06] rounded-sm", "pl-8 pr-2 py-1.5 text-[12px] font-jetbrains text-flash placeholder:text-flash/20", "focus:outline-none focus:border-jade/30") })] }) }), _jsx("div", { className: "max-h-[240px] overflow-y-auto cyber-scrollbar p-1", children: filtered.length === 0 ? (_jsx("div", { className: "px-3 py-3 text-[10px] font-jetbrains text-flash/30 uppercase tracking-[0.2em] text-center", children: "No matches" })) : (filtered.map((c) => {
                            const active = value === c.name;
                            return (_jsxs("button", { type: "button", onClick: () => {
                                    onChange(c.name);
                                    setOpen(false);
                                    setQuery("");
                                }, className: cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-sm cursor-clicker text-left", "transition-colors duration-100", active
                                    ? "bg-jade/[0.10] text-jade"
                                    : "text-flash/80 hover:bg-white/[0.04] hover:text-jade"), children: [_jsx("img", { src: `${cdnBaseUrl()}/img/champion/${normalizeChampName(c.name)}.png`, alt: "", className: "w-5 h-5 rounded-full ring-1 ring-white/[0.08]", draggable: false }), _jsx("span", { className: "font-chakrapetch text-[12px] tracking-wide", children: c.name })] }, c.name));
                        })) })] }))] }));
}
function ScoutPlayerCombobox({ slug, value, onChange, }) {
    const [players, setPlayers] = useState(null);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);
    // Re-fetch whenever the slug changes (debounced lightly via the
    // 350ms timeout so typing 7 chars doesn't fire 7 requests).
    useEffect(() => {
        setPlayers(null);
        if (slug.length < 3)
            return;
        const ctrl = new AbortController();
        const t = setTimeout(() => {
            setLoading(true);
            fetch(`${API_BASE_URL}/api/scout/lobby/${encodeURIComponent(slug)}`, {
                signal: ctrl.signal,
            })
                .then((r) => (r.ok ? r.json() : null))
                .then((d) => {
                if (!d?.players) {
                    setPlayers([]);
                    return;
                }
                setPlayers(d.players.map((p) => ({
                    id: p.id,
                    displayName: p.displayName ?? p.display_name ?? "Player",
                })));
            })
                .catch(() => setPlayers([]))
                .finally(() => setLoading(false));
        }, 350);
        return () => {
            clearTimeout(t);
            ctrl.abort();
        };
    }, [slug]);
    useEffect(() => {
        if (!open)
            return;
        const onDoc = (e) => {
            if (!containerRef.current?.contains(e.target))
                setOpen(false);
        };
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, [open]);
    const disabled = slug.trim().length < 3 || (players != null && players.length === 0);
    const activeName = value && players?.find((p) => p.id === value)?.displayName;
    return (_jsxs("div", { ref: containerRef, className: "relative", children: [_jsxs("button", { type: "button", onClick: () => !disabled && setOpen((o) => !o), disabled: disabled, className: cn(inputClass, "flex items-center gap-2 text-left h-10", disabled && "opacity-50 cursor-not-allowed", !disabled && "hover:border-jade/25"), children: [_jsx("span", { className: cn(value ? "text-flash font-chakrapetch tracking-wide uppercase text-[12px]" : "text-flash/35 text-[13px]"), children: loading
                            ? "Loading…"
                            : disabled
                                ? slug.trim().length < 3
                                    ? "Enter a lobby code first"
                                    : "No players in this lobby"
                                : activeName ?? "Any player" }), _jsx(ChevronDown, { className: cn("ml-auto w-4 h-4 text-flash/35 transition-transform duration-200", open && "rotate-180") })] }), open && players && (_jsx("div", { className: cn("absolute left-0 right-0 mt-2 z-50 rounded-sm overflow-hidden", "bg-black/90 backdrop-blur-xl border border-white/10", "shadow-[0_16px_44px_rgba(0,0,0,0.7),inset_0_0_0_0.5px_rgba(255,255,255,0.05)]"), children: _jsxs("div", { className: "max-h-[200px] overflow-y-auto cyber-scrollbar p-1", children: [_jsx("button", { type: "button", onClick: () => {
                                onChange(null);
                                setOpen(false);
                            }, className: cn("w-full text-left px-2 py-1.5 rounded-sm font-chakrapetch text-[12px] tracking-wide cursor-clicker", !value
                                ? "bg-jade/[0.10] text-jade"
                                : "text-flash/55 hover:bg-white/[0.04] hover:text-jade"), children: "Any player" }), players.map((p) => {
                            const active = value === p.id;
                            return (_jsx("button", { type: "button", onClick: () => {
                                    onChange(p.id);
                                    setOpen(false);
                                }, className: cn("w-full text-left px-2 py-1.5 rounded-sm font-chakrapetch text-[12px] tracking-wide cursor-clicker", active
                                    ? "bg-jade/[0.10] text-jade"
                                    : "text-flash/80 hover:bg-white/[0.04] hover:text-jade"), children: p.displayName }, p.id));
                        })] }) }))] }));
}
function MyLobbiesCombobox({ value, onPick, }) {
    const [lobbies, setLobbies] = useState(null);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const { data: { session }, } = await supabase.auth.getSession();
                const token = session?.access_token;
                if (!token) {
                    if (!cancelled) {
                        setLobbies([]);
                        setLoading(false);
                    }
                    return;
                }
                const res = await fetch(`${API_BASE_URL}/api/scout/my-lobbies`, {
                    headers: { Authorization: `Bearer ${token}` },
                    cache: "no-store",
                });
                if (!res.ok)
                    throw new Error(`HTTP ${res.status}`);
                const json = (await res.json());
                if (!cancelled) {
                    setLobbies(json.lobbies ?? []);
                    setLoading(false);
                }
            }
            catch {
                if (!cancelled) {
                    setLobbies([]);
                    setLoading(false);
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);
    useEffect(() => {
        if (!open)
            return;
        const onDoc = (e) => {
            if (!containerRef.current?.contains(e.target))
                setOpen(false);
        };
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, [open]);
    const hasLobbies = lobbies != null && lobbies.length > 0;
    const disabled = !hasLobbies && !loading;
    const activeLobby = lobbies?.find((l) => l.slug === value);
    return (_jsxs("div", { ref: containerRef, className: "relative", children: [_jsxs("button", { type: "button", onClick: () => !disabled && setOpen((o) => !o), disabled: disabled, className: cn(inputClass, "flex items-center gap-2 text-left h-10", disabled && "opacity-60 cursor-not-allowed", !disabled && "hover:border-jade/25"), children: [_jsx("span", { className: cn(activeLobby
                            ? "text-flash font-chakrapetch tracking-wide text-[12px]"
                            : "text-flash/40 text-[13px]"), children: loading
                            ? "Checking your lobbies…"
                            : !hasLobbies
                                ? "No lobbies of yours — paste a code below"
                                : activeLobby
                                    ? activeLobby.name
                                    : `Pick one of your ${lobbies.length} lobbies…` }), _jsx(ChevronDown, { className: cn("ml-auto w-4 h-4 text-flash/35 transition-transform duration-200", open && "rotate-180") })] }), open && hasLobbies && (_jsx("div", { className: cn("absolute left-0 right-0 mt-2 z-50 rounded-sm overflow-hidden", "bg-black/90 backdrop-blur-xl border border-white/10", "shadow-[0_16px_44px_rgba(0,0,0,0.7),inset_0_0_0_0.5px_rgba(255,255,255,0.05)]"), children: _jsx("div", { className: "max-h-[240px] overflow-y-auto cyber-scrollbar p-1", children: lobbies.map((l) => {
                        const active = l.slug === value;
                        return (_jsx("button", { type: "button", onClick: () => {
                                onPick(l.slug, l.name);
                                setOpen(false);
                            }, className: cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-sm cursor-clicker text-left", "transition-colors duration-100", active
                                ? "bg-jade/[0.10] text-jade"
                                : "text-flash/80 hover:bg-white/[0.04] hover:text-jade"), children: _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: "font-chakrapetch text-[12px] tracking-wide truncate", children: l.name }), _jsx("div", { className: "font-jetbrains text-[9px] tracking-[0.15em] text-flash/35 uppercase truncate", children: l.slug })] }) }, l.slug));
                    }) }) }))] }));
}
