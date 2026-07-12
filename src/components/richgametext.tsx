import { useEffect, useState, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { User } from "lucide-react"
import { cdnBaseUrl } from "@/config"

// RichGameText — turns any champion or item NAME inside a chat message into an
// inline chip: the entity's square icon + a green, clickable name that links to
// its champion/item page. Names + ids come from Data Dragon (champion.json /
// item.json), loaded once and cached at module scope; until ready, plain text
// is shown and it upgrades on the next render.

type Entity = { type: "champion" | "item"; display: string; href: string; icon: string }

let _entities: Map<string, Entity> | null = null // lowercased name → entity
let _regex: RegExp | null = null
let _loading: Promise<void> | null = null

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

async function loadEntities(): Promise<void> {
  const base = cdnBaseUrl()
  const [champ, item] = await Promise.all([
    fetch(`${base}/data/en_US/champion.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    fetch(`${base}/data/en_US/item.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ])

  const map = new Map<string, Entity>()

  if (champ?.data) {
    for (const c of Object.values<any>(champ.data)) {
      if (!c?.id || !c?.name) continue
      map.set(String(c.name).toLowerCase(), {
        type: "champion",
        display: c.name,
        href: `/champions/${c.id}`,
        icon: `${base}/img/champion/${c.id}.png`,
      })
    }
  }

  if (item?.data) {
    for (const [idStr, it] of Object.entries<any>(item.data)) {
      const name = it?.name
      if (!name) continue
      // only real, purchasable Summoner's Rift items (skips trinkets/consumables/maps)
      if (it?.maps?.["11"] !== true || it?.gold?.purchasable !== true) continue
      const key = String(name).toLowerCase()
      if (map.has(key)) continue // a champion name wins on the (rare) clash
      map.set(key, {
        type: "item",
        display: name,
        href: `/items/${Number(idStr)}`,
        icon: `${base}/img/item/${idStr}.png`,
      })
    }
  }

  // Longest names first so multi-word names ("Immortal Shieldbow") win over any
  // substring; \b keeps matches to whole words (handles apostrophes like Kai'Sa).
  const names = [...map.keys()].sort((a, b) => b.length - a.length).map(escapeRe)
  _entities = map
  _regex = names.length ? new RegExp(`\\b(${names.join("|")})\\b`, "gi") : null
}

function useEntitiesReady(): boolean {
  const [ready, setReady] = useState(() => _entities != null)
  useEffect(() => {
    if (_entities) return
    if (!_loading) _loading = loadEntities()
    let alive = true
    _loading.then(() => alive && setReady(true)).catch(() => {})
    return () => {
      alive = false
    }
  }, [])
  return ready
}

function Chip({ e }: { e: Entity }) {
  return (
    <Link
      to={e.href}
      className="group/ent inline-flex items-center gap-1 align-[-0.22em] whitespace-nowrap text-jade transition-colors hover:text-jade/75 cursor-clicker"
    >
      <img
        src={e.icon}
        alt=""
        loading="lazy"
        className="h-[1.18em] w-[1.18em] shrink-0 rounded-[4px] bg-filmdark/30 object-cover ring-1 ring-jade/25"
        onError={(ev) => {
          ;(ev.currentTarget as HTMLImageElement).style.visibility = "hidden"
        }}
      />
      <span className="underline decoration-jade/20 decoration-1 underline-offset-[3px] transition-colors group-hover/ent:decoration-jade/60">
        {e.display}
      </span>
    </Link>
  )
}

// An explicit [label](/path) markdown link the bot emits — mostly a player → his
// summoner page. Internal hrefs only (must start with "/").
const MD_LINK = /\[([^\]]+)\]\((\/[^)\s]+)\)/g

function entityNodes(text: string, key: () => number): ReactNode[] {
  if (!_entities || !_regex || !text) return [text]
  const nodes: ReactNode[] = []
  let last = 0
  _regex.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = _regex.exec(text)) !== null) {
    const e = _entities.get(m[0].toLowerCase())
    if (!e) continue
    if (m.index > last) nodes.push(text.slice(last, m.index))
    nodes.push(<Chip key={key()} e={e} />)
    last = m.index + m[0].length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

function RefLink({ label, href }: { label: string; href: string }) {
  const isSummoner = href.startsWith("/summoners/")
  return (
    <Link
      to={href}
      className="group/ref inline-flex items-center gap-1 align-[-0.18em] whitespace-nowrap text-jade transition-colors hover:text-jade/75 cursor-clicker"
    >
      {isSummoner && (
        <span className="grid h-[1.05em] w-[1.05em] shrink-0 place-items-center rounded-[4px] bg-jade/10 ring-1 ring-jade/25">
          <User size={9} className="text-jade/80" />
        </span>
      )}
      <span className="underline decoration-jade/20 decoration-1 underline-offset-[3px] transition-colors group-hover/ref:decoration-jade/60">
        {label}
      </span>
    </Link>
  )
}

export function RichGameText({ text }: { text: string }) {
  const ready = useEntitiesReady()
  if (!text) return <>{text}</>

  // Pass 1: explicit markdown links → RefLink. Pass 2: champion/item auto-linking
  // on the remaining plain spans (once the name index has loaded).
  const nodes: ReactNode[] = []
  let last = 0
  let k = 0
  const key = () => k++
  MD_LINK.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = MD_LINK.exec(text)) !== null) {
    if (m.index > last) {
      const plain = text.slice(last, m.index)
      nodes.push(...(ready ? entityNodes(plain, key) : [plain]))
    }
    nodes.push(<RefLink key={key()} label={m[1]} href={m[2]} />)
    last = m.index + m[0].length
  }
  if (last < text.length) {
    const plain = text.slice(last)
    nodes.push(...(ready ? entityNodes(plain, key) : [plain]))
  }
  return <>{nodes}</>
}
