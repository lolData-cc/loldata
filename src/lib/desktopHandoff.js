// Handing a signed-in session back to the desktop app.
//
// The app opens /login?desktop=1 in the BROWSER — it has no field that could
// take a password and no channel that could carry one. When the login lands,
// this sends the session to loldata://auth, which the app validates before
// keeping.
//
// The desktop flag has to survive an OAuth round-trip (Google sends the user
// away and back), so it is stashed the same way the return URL is.
//
// ⚠️ On the token in a URL. A loldata:// navigation never touches the network:
// no referrer, no server log, no proxy. It can land in browser history, which
// is the real cost, and it is the same trade every desktop app that signs in
// through a browser makes. What limits it: the ACCESS token goes, never the
// refresh token, so what leaks expires in an hour rather than lasting until it
// is revoked.
const KEY = "desktopLogin";
/** Set by the app's sign-in button, or left over from before an OAuth hop. */
export function isDesktopLogin() {
    const fromUrl = new URLSearchParams(window.location.search).get("desktop") === "1";
    return fromUrl || localStorage.getItem(KEY) === "1";
}
/** Persist the flag so it survives a flow that leaves the page. */
export function stashDesktopLogin() {
    if (new URLSearchParams(window.location.search).get("desktop") === "1") {
        localStorage.setItem(KEY, "1");
    }
}
export function clearDesktopLogin() {
    localStorage.removeItem(KEY);
}
/**
 * Build the link the app is listening for.
 *
 * Returns null when there is no access token, rather than a link with an empty
 * one — the app would refuse it anyway, and a refusal the user has to interpret
 * is worse than a button that does not appear.
 */
export function buildHandoffLink(session, plan) {
    const token = session?.access_token;
    if (!token)
        return null;
    const q = new URLSearchParams({ token });
    const email = session.user?.email;
    if (email)
        q.set("email", email);
    // The app only recognises free / premium / elite; anything else it drops.
    if (plan)
        q.set("tier", plan);
    return `loldata://auth?${q.toString()}`;
}
/**
 * Navigate to the app.
 *
 * Deliberately NOT window.open: a popup for a custom protocol gets blocked, and
 * an assignment to location leaves the page where it is if nothing handles the
 * scheme — which is exactly the behaviour wanted when the app is not installed.
 */
export function openDesktopApp(link) {
    window.location.href = link;
}
