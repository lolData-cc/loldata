// Heuristic detection of hardware acceleration in the browser.
// Combines a WebGL renderer string check with a short rAF FPS probe.
// Returns true when acceleration looks ENABLED, false when it looks DISABLED,
// and null when we can't tell (e.g. WebGL blocked, renderer masked by browser).
const SOFTWARE_RENDERER_HINTS = [
    "swiftshader",
    "llvmpipe",
    "software",
    "microsoft basic render",
    "google swiftshader",
    "angle (software",
];
function checkWebGLRenderer() {
    try {
        const canvas = document.createElement("canvas");
        const gl = canvas.getContext("webgl2") ??
            canvas.getContext("webgl") ??
            canvas.getContext("experimental-webgl");
        if (!gl)
            return "software"; // no WebGL at all → essentially unaccelerated
        const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
        if (!debugInfo)
            return "unknown"; // browser masks renderer (Firefox by default)
        const renderer = String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) ?? "").toLowerCase();
        if (!renderer)
            return "unknown";
        if (SOFTWARE_RENDERER_HINTS.some((hint) => renderer.includes(hint))) {
            return "software";
        }
        return "hardware";
    }
    catch {
        return "unknown";
    }
}
function measureFps(frames, timeoutMs) {
    return new Promise((resolve) => {
        let count = 0;
        let start = 0;
        let done = false;
        const finish = (fps) => {
            if (done)
                return;
            done = true;
            resolve(fps);
        };
        const tick = (t) => {
            if (done)
                return;
            if (start === 0)
                start = t;
            count += 1;
            if (count >= frames) {
                finish((count * 1000) / (t - start));
                return;
            }
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        // Backstop if the tab is throttled or frames stall completely.
        window.setTimeout(() => {
            const elapsed = performance.now() - (start || performance.now());
            finish(elapsed > 0 ? (count * 1000) / elapsed : 0);
        }, timeoutMs);
    });
}
export async function detectHardwareAcceleration() {
    // Dev override: ?fakeSoftwareGPU=1 forces the "disabled" branch so the
    // warning popup can be previewed without actually toggling the browser flag.
    if (import.meta.env.DEV &&
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("fakeSoftwareGPU") === "1") {
        return false;
    }
    const rendererResult = checkWebGLRenderer();
    if (rendererResult === "hardware")
        return true;
    // For software/unknown we corroborate with an FPS probe so we don't
    // false-alarm users on Firefox (where the renderer string is masked).
    const fps = await measureFps(30, 1200);
    if (rendererResult === "software") {
        // Renderer clearly says software — trust it regardless of FPS.
        return false;
    }
    // rendererResult === "unknown"
    if (fps > 0 && fps < 30)
        return false;
    return null;
}
