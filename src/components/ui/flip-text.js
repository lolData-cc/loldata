import { jsx as _jsx } from "react/jsx-runtime";
import React from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
const defaultVariants = {
    hidden: { rotateX: -90, opacity: 0 },
    visible: { rotateX: 0, opacity: 1 },
};
export function FlipText({ children, duration = 0.5, delayMultiple = 0.08, className, as: Component = "span", variants, ...props }) {
    const MotionComponent = motion.create(Component);
    const characters = React.Children.toArray(children).join("").split("");
    return (_jsx("div", { className: "flex justify-center space-x-2", children: _jsx(AnimatePresence, { mode: "wait", children: characters.map((char, i) => (_jsx(MotionComponent, { initial: "hidden", animate: "visible", exit: "hidden", variants: variants || defaultVariants, transition: { duration, delay: i * delayMultiple }, className: cn("origin-center drop-shadow-sm", className), ...props, children: char }, i))) }) }));
}
