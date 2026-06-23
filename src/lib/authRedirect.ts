// Post-login "return URL" handling.
//
// When AuthGuard bounces a logged-out user off a protected route, it sends them
// to /login?redirect=<that route>. After a successful login we send them BACK
// there instead of the dashboard. A "pure" login (no redirect param) still lands
// on the dashboard.
//
// Email / OTP login happens on the same page, so we can read the param straight
// from the URL. OAuth leaves the page (provider round-trip), so we stash the
// target in localStorage before redirecting and the /auth/callback consumes it.

const KEY = "postLoginRedirect";

// Only ever honour same-origin absolute paths — never an external URL (open-redirect guard).
function safe(p: string | null | undefined): string | null {
  return p && p.startsWith("/") && !p.startsWith("//") && p !== "/login" ? p : null;
}

/** Read ?redirect= from the current URL, falling back to the dashboard. */
export function redirectFromUrl(): string {
  return safe(new URLSearchParams(window.location.search).get("redirect")) ?? "/dashboard";
}

/** Persist the current ?redirect= so it survives a flow that leaves the page (OAuth). */
export function stashRedirect(): void {
  const r = safe(new URLSearchParams(window.location.search).get("redirect"));
  if (r) localStorage.setItem(KEY, r);
  else localStorage.removeItem(KEY);
}

/** Read + clear the stashed target (used by /auth/callback), falling back to the dashboard. */
export function consumeStashedRedirect(): string {
  const r = localStorage.getItem(KEY);
  localStorage.removeItem(KEY);
  return safe(r) ?? "/dashboard";
}
