import { jsx as _jsx } from "react/jsx-runtime";
import { Star } from "lucide-react";
export function SavedProfiles({ onClick }) {
    return (_jsx("div", { onClick: onClick, className: "bg-jade/10 p-1 rounded-sm cursor-clicker hover:bg-jade/20", children: _jsx(Star, { className: "h-4 w-4 text-jade" }) }));
}
