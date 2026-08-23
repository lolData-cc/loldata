import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { User } from "lucide-react";
import { cdnBaseUrl } from "@/config";
let _entities = null; // lowercased name → entity
let _regex = null;
let _loading = null;
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
async function loadEntities() {
    const base = cdnBaseUrl();
    const [champ, item] = await Promise.all([
        fetch(`${base}/data/en_US/champion.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(`${base}/data/en_US/item.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]);
    const map = new Map();
    if (champ?.data) {
        for (const c of Object.values(champ.data)) {
            if (!c?.id || !c?.name)
                continue;
            map.set(String(c.name).toLowerCase(), {
                type: "champion",
                display: c.name,
                href: `/champions/${c.id}`,
                icon: `${base}/img/champion/${c.id}.png`,
            });
        }
    }
    if (item?.data) {
        for (const [idStr, it] of Object.entries(item.data)) {
            const name = it?.name;
            if (!name)
                continue;
            // only real, purchasable Summoner's Rift items (skips trinkets/consumables/maps)
            if (it?.maps?.["11"] !== true || it?.gold?.purchasable !== true)
                continue;
            const key = String(name).toLowerCase();
            if (map.has(key))
                continue; // a champion name wins on the (rare) clash
            map.set(key, {
                type: "item",
                display: name,
                href: `/items/${Number(idStr)}`,
                icon: `${base}/img/item/${idStr}.png`,
            });
        }
    }
    // Longest names first so multi-word names ("Immortal Shieldbow") win over any
    // substring; \b keeps matches to whole words (handles apostrophes like Kai'Sa).
    const names = [...map.keys()].sort((a, b) => b.length - a.length).map(escapeRe);
    _entities = map;
    _regex = names.length ? new RegExp(`\\b(${names.join("|")})\\b`, "gi") : null;
}
function useEntitiesReady() {
    const [ready, setReady] = useState(() => _entities != null);
    useEffect(() => {
        if (_entities)
            return;
        if (!_loading)
            _loading = loadEntities();
        let alive = true;
        _loading.then(() => alive && setReady(true)).catch(() => { });
        return () => {
            alive = false;
        };
    }, []);
    return ready;
}
function Chip({ e }) {
    return (_jsxs(Link, { to: e.href, className: "group/ent inline-flex items-center gap-1 align-[-0.22em] whitespace-nowrap text-jade transition-colors hover:text-jade/75 cursor-clicker", children: [_jsx("img", { src: e.icon, alt: "", loading: "lazy", className: "h-[1.18em] w-[1.18em] shrink-0 rounded-[4px] bg-filmdark/30 object-cover ring-1 ring-jade/25", onError: (ev) => {
                    ;
                    ev.currentTarget.style.visibility = "hidden";
                } }), _jsx("span", { className: "underline decoration-jade/20 decoration-1 underline-offset-[3px] transition-colors group-hover/ent:decoration-jade/60", children: e.display })] }));
}
// An explicit [label](/path) markdown link the bot emits — mostly a player → his
// summoner page. Internal hrefs only (must start with "/").
const MD_LINK = /\[([^\]]+)\]\((\/[^)\s]+)\)/g;
function entityNodes(text, key) {
    if (!_entities || !_regex || !text)
        return [text];
    const nodes = [];
    let last = 0;
    _regex.lastIndex = 0;
    let m;
    while ((m = _regex.exec(text)) !== null) {
        const e = _entities.get(m[0].toLowerCase());
        if (!e)
            continue;
        if (m.index > last)
            nodes.push(text.slice(last, m.index));
        nodes.push(_jsx(Chip, { e: e }, key()));
        last = m.index + m[0].length;
    }
    if (last < text.length)
        nodes.push(text.slice(last));
    return nodes;
}
function RefLink({ label, href }) {
    const isSummoner = href.startsWith("/summoners/");
    return (_jsxs(Link, { to: href, className: "group/ref inline-flex items-center gap-1 align-[-0.18em] whitespace-nowrap text-jade transition-colors hover:text-jade/75 cursor-clicker", children: [isSummoner && (_jsx("span", { className: "grid h-[1.05em] w-[1.05em] shrink-0 place-items-center rounded-[4px] bg-jade/10 ring-1 ring-jade/25", children: _jsx(User, { size: 9, className: "text-jade/80" }) })), _jsx("span", { className: "underline decoration-jade/20 decoration-1 underline-offset-[3px] transition-colors group-hover/ref:decoration-jade/60", children: label })] }));
}
export function RichGameText({ text }) {
    const ready = useEntitiesReady();
    if (!text)
        return _jsx(_Fragment, { children: text });
    // Pass 1: explicit markdown links → RefLink. Pass 2: champion/item auto-linking
    // on the remaining plain spans (once the name index has loaded).
    const nodes = [];
    let last = 0;
    let k = 0;
    const key = () => k++;
    MD_LINK.lastIndex = 0;
    let m;
    while ((m = MD_LINK.exec(text)) !== null) {
        if (m.index > last) {
            const plain = text.slice(last, m.index);
            nodes.push(...(ready ? entityNodes(plain, key) : [plain]));
        }
        nodes.push(_jsx(RefLink, { label: m[1], href: m[2] }, key()));
        last = m.index + m[0].length;
    }
    if (last < text.length) {
        const plain = text.slice(last);
        nodes.push(...(ready ? entityNodes(plain, key) : [plain]));
    }
    return _jsx(_Fragment, { children: nodes });
}
