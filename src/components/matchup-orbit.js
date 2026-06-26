"use client";
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
// MatchupOrbit — a 3D constellation of a champion's real lane matchups, floating
// in the void. The subject sits at the centre; every opponent orbits it, tethered
// by a faint win-rate-coloured line. Drag to spin, scroll to zoom, click a face.
//
// The WebGL Canvas draws only the structure (tether lines + the centre ring) and
// owns the camera/rotation. Champion faces are plain DOM <img> in an overlay that
// I project onto the 3D node positions myself each frame (useFrame): cdn2 icons
// can't be reliable WebGL textures (Cloudflare serves a cached copy without the
// CORS header), and a DOM <img> can't throw inside the render loop. The overlay
// container is pointer-events:none so dragging passes through to the canvas; each
// face is pointer-events:auto so it stays clickable.
import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { cn } from "@/lib/utils";
export function supportsWebGL() {
    try {
        const c = document.createElement("canvas");
        return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
    }
    catch {
        return false;
    }
}
const JADE = new THREE.Color("#00d992");
const RED = new THREE.Color("#ff6286");
const MID = new THREE.Color("#7c8b92");
function wrColor(wr) {
    const t = Math.max(0, Math.min(1, (wr - 44) / 12));
    return t < 0.5 ? MID.clone().lerp(RED, (0.5 - t) * 2) : MID.clone().lerp(JADE, (t - 0.5) * 2);
}
const hexFor = (wr) => "#" + wrColor(wr).getHexString();
function fibPos(i, n, radius) {
    const y = n <= 1 ? 0 : 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const phi = i * Math.PI * (3 - Math.sqrt(5));
    return [radius * Math.cos(phi) * r, radius * y, radius * Math.sin(phi) * r];
}
function Tethers({ nodes, radius, selectedKey }) {
    return (_jsx(_Fragment, { children: nodes.map((n, i) => {
            if (n.key === selectedKey)
                return null; // the selected tether is drawn (brighter + animated) by SelectedTether
            const p = fibPos(i, nodes.length, radius);
            return (_jsx(Line, { points: [[0, 0, 0], p], color: hexFor(n.winrate), lineWidth: 0.8, transparent: true, opacity: selectedKey ? 0.09 : 0.16 }, n.key));
        }) }));
}
// The picked matchup's tether: a bright steady wire from the centre to the node,
// with a few energy pulses streaming linearly along it (centre → opponent).
function SelectedTether({ pos, color }) {
    const target = useMemo(() => new THREE.Vector3(pos[0], pos[1], pos[2]), [pos]);
    const v = useMemo(() => new THREE.Vector3(), []);
    const pulses = useRef([]);
    const N = 2;
    useFrame((state) => {
        const e = state.clock.elapsedTime;
        for (let i = 0; i < N; i++) {
            const m = pulses.current[i];
            if (!m)
                continue;
            const t = (e * 0.16 + i / N) % 1; // staggered 0→1, centre → node (slow, calm drift)
            v.copy(target).multiplyScalar(t);
            m.position.copy(v);
            const fade = Math.sin(t * Math.PI); // dark at both ends, bright mid-flight
            m.scale.setScalar(0.045 + 0.075 * fade);
            m.material.opacity = 0.15 + 0.85 * fade;
        }
    });
    return (_jsxs("group", { children: [_jsx(Line, { points: [[0, 0, 0], pos], color: color, lineWidth: 2.1, transparent: true, opacity: 0.62 }), Array.from({ length: N }).map((_, i) => (_jsxs("mesh", { ref: (m) => { pulses.current[i] = m; }, children: [_jsx("sphereGeometry", { args: [1, 10, 10] }), _jsx("meshBasicMaterial", { color: color, transparent: true, toneMapped: false })] }, i)))] }));
}
// Projects the centre + every node's 3D position to screen pixels each frame and
// writes them straight onto the overlay DOM nodes (no per-frame React state).
function Projector({ nodes, radius, facesRef, centerRef, selectedKey, hoverKey, }) {
    const { camera, size } = useThree();
    const v = useMemo(() => new THREE.Vector3(), []);
    useFrame(() => {
        if (centerRef.current) {
            v.set(0, 0, 0).project(camera);
            centerRef.current.style.transform = `translate(-50%,-50%) translate(${(v.x * 0.5 + 0.5) * size.width}px, ${(-v.y * 0.5 + 0.5) * size.height}px)`;
        }
        for (let i = 0; i < nodes.length; i++) {
            const el = facesRef.current.get(nodes[i].key);
            if (!el)
                continue;
            const p = fibPos(i, nodes.length, radius);
            v.set(p[0], p[1], p[2]).project(camera);
            const depth = (v.z + 1) / 2; // 0 near → 1 far
            let scale = THREE.MathUtils.clamp(1.32 - depth, 0.55, 1.25);
            if (nodes[i].key === selectedKey)
                scale *= 1.4;
            else if (nodes[i].key === hoverKey)
                scale *= 1.18;
            const x = (v.x * 0.5 + 0.5) * size.width;
            const y = (-v.y * 0.5 + 0.5) * size.height;
            el.style.transform = `translate(-50%,-50%) translate(${x}px, ${y}px) scale(${scale})`;
            el.style.opacity = String(THREE.MathUtils.clamp(1.55 - depth * 1.25, 0.4, 1));
            el.style.zIndex = String((nodes[i].key === selectedKey ? 5000 : 0) + 2000 - Math.round(depth * 1000));
        }
    });
    return null;
}
export function MatchupOrbit({ subjectIconUrl, nodes, selectedKey, onSelect, className, }) {
    const radius = nodes.length > 38 ? 4.2 : nodes.length > 28 ? 3.7 : nodes.length > 22 ? 3.2 : nodes.length > 12 ? 2.8 : 2.3;
    const facesRef = useRef(new Map());
    const centerRef = useRef(null);
    const [hoverKey, setHoverKey] = useState(null);
    const { selPos, selColor } = useMemo(() => {
        const i = nodes.findIndex((n) => n.key === selectedKey);
        if (i < 0)
            return { selPos: null, selColor: "#00d992" };
        return { selPos: fibPos(i, nodes.length, radius), selColor: hexFor(nodes[i].winrate) };
    }, [selectedKey, nodes, radius]);
    return (_jsxs("div", { className: cn("relative", className), children: [_jsx("style", { children: `@keyframes mo-halo-pulse{0%,100%{opacity:.5;transform:translate(-50%,-50%) scale(.9)}50%{opacity:1;transform:translate(-50%,-50%) scale(1.2)}}.mo-halo{animation:mo-halo-pulse 1.5s ease-in-out infinite}` }), _jsxs(Canvas
            // start zoomed out — distance scales with the sphere so every roster size
            // frames the same (smaller) way (zoom is disabled, so this is the fixed view)
            , { 
                // start zoomed out — distance scales with the sphere so every roster size
                // frames the same (smaller) way (zoom is disabled, so this is the fixed view)
                camera: { position: [0, 0.2, radius * 2.9], fov: 42 }, dpr: [1, 1.8], gl: { antialias: true, alpha: true, powerPreference: "high-performance" }, style: { background: "transparent" }, children: [_jsx("ambientLight", { intensity: 1 }), _jsx(Tethers, { nodes: nodes, radius: radius, selectedKey: selectedKey }), selPos && _jsx(SelectedTether, { pos: selPos, color: selColor }), _jsx(Projector, { nodes: nodes, radius: radius, facesRef: facesRef, centerRef: centerRef, selectedKey: selectedKey, hoverKey: hoverKey }), _jsx(OrbitControls, { enablePan: false, enableZoom: false, autoRotate: true, autoRotateSpeed: 0.5, rotateSpeed: 0.6 })] }), _jsxs("div", { className: "absolute inset-0 pointer-events-none", style: { overflow: "visible" }, children: [_jsxs("div", { ref: centerRef, className: "absolute left-0 top-0", style: { willChange: "transform" }, children: [_jsx("span", { "aria-hidden": true, className: "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full", style: { width: 74, height: 74, boxShadow: "0 0 0 2px rgba(0,217,146,0.75), 0 0 32px rgba(0,217,146,0.45)" } }), _jsx("img", { src: subjectIconUrl, alt: "", draggable: false, className: "relative rounded-full object-cover", style: { width: 60, height: 60 } })] }), nodes.map((n) => {
                        const c = hexFor(n.winrate);
                        const sel = n.key === selectedKey;
                        const sz = 38 + Math.min(20, (n.games / 5000) * 20);
                        return (_jsxs("div", { ref: (el) => {
                                if (el)
                                    facesRef.current.set(n.key, el);
                                else
                                    facesRef.current.delete(n.key);
                            }, className: "absolute left-0 top-0 pointer-events-auto cursor-pointer", style: { willChange: "transform" }, title: `${n.name} · ${n.winrate.toFixed(1)}%`, onMouseEnter: () => setHoverKey(n.key), onMouseLeave: () => setHoverKey((k) => (k === n.key ? null : k)), onClick: () => onSelect(n.key), children: [sel && (_jsx("span", { "aria-hidden": true, className: "mo-halo absolute left-1/2 top-1/2 rounded-full pointer-events-none", style: { width: sz * 1.95, height: sz * 1.95, background: `radial-gradient(circle, ${c}88, ${c}22 45%, transparent 70%)` } })), _jsx("img", { src: n.iconUrl, alt: n.name, draggable: false, className: "relative block rounded-lg object-cover transition-[box-shadow] duration-300", style: {
                                        width: sz,
                                        height: sz,
                                        boxShadow: sel
                                            ? `0 0 0 2.5px ${c}, 0 0 18px ${c}, 0 0 42px ${c}aa`
                                            : `0 0 0 2px ${c}, 0 0 12px ${c}66`,
                                        filter: sel ? "saturate(1.25) brightness(1.08)" : undefined,
                                    } })] }, n.key));
                    })] })] }));
}
