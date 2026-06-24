import { useEffect } from "react"

// Client-side SEO head manager — no dependency. Sets <title>, meta description,
// Open Graph / Twitter cards, canonical, robots and an optional JSON-LD block,
// then restores defaults on unmount. The SPA is rendered by Googlebot, so these
// land in the indexed document; pair with a sitemap for discovery.

export type SeoInput = {
  title: string
  description?: string
  canonical?: string // absolute URL or a "/path"; resolved against origin
  image?: string // absolute URL for og:image
  type?: string // og:type, default "website"
  jsonLd?: Record<string, unknown> | Record<string, unknown>[]
  noindex?: boolean
}

function meta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement("meta")
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute("content", content)
}

function link(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement("link")
    el.setAttribute("rel", rel)
    document.head.appendChild(el)
  }
  el.setAttribute("href", href)
}

export function useSeo(input: SeoInput) {
  const { title, description, canonical, image, type = "website", jsonLd, noindex } = input
  const ld = jsonLd ? JSON.stringify(jsonLd) : null

  useEffect(() => {
    const origin = window.location.origin
    const url = canonical
      ? canonical.startsWith("http")
        ? canonical
        : origin + canonical
      : origin + window.location.pathname

    document.title = title
    if (description) meta("name", "description", description)
    meta("name", "robots", noindex ? "noindex,nofollow" : "index,follow")

    meta("property", "og:title", title)
    if (description) meta("property", "og:description", description)
    meta("property", "og:type", type)
    meta("property", "og:url", url)
    meta("property", "og:site_name", "lolData")
    if (image) meta("property", "og:image", image)

    meta("name", "twitter:card", image ? "summary_large_image" : "summary")
    meta("name", "twitter:title", title)
    if (description) meta("name", "twitter:description", description)
    if (image) meta("name", "twitter:image", image)

    link("canonical", url)

    let ldEl: HTMLScriptElement | null = null
    if (ld) {
      ldEl = document.createElement("script")
      ldEl.type = "application/ld+json"
      ldEl.textContent = ld
      document.head.appendChild(ldEl)
    }

    return () => {
      document.title = "lolData"
      if (ldEl?.parentNode) ldEl.parentNode.removeChild(ldEl)
      meta("name", "robots", "index,follow")
    }
  }, [title, description, canonical, image, type, ld, noindex])
}
