import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// context/liveviewercontext.tsx
import { createContext, useCallback, useContext, useState } from "react";
import { LiveViewer } from "@/components/liveviewer";
const LiveViewerCtx = createContext(undefined);
export function LiveViewerProvider({ children }) {
    const [params, setParams] = useState(null);
    const [open, setOpen] = useState(false);
    const openWith = useCallback((p) => {
        setParams(p);
        setOpen(true);
    }, []);
    return (_jsxs(LiveViewerCtx.Provider, { value: { openWith }, children: [children, params && (_jsx(LiveViewer, { puuid: params.puuid, riotId: params.riotId, region: params.region, controlledOpen: open, onControlledOpenChange: setOpen }))] }));
}
export function useLiveViewer() {
    const ctx = useContext(LiveViewerCtx);
    if (!ctx)
        throw new Error("useLiveViewer must be used within LiveViewerProvider");
    return ctx;
}
