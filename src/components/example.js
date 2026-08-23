import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
export function Example() {
    return (_jsxs(Card, { className: "relative w-[350px] overflow-hidden", children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Login" }), _jsx(CardDescription, { children: "Enter your credentials to access your account." })] }), _jsx(CardContent, { children: _jsx("form", { children: _jsxs("div", { className: "grid w-full items-center gap-4", children: [_jsxs("div", { className: "flex flex-col space-y-1.5", children: [_jsx(Label, { htmlFor: "email", children: "Email" }), _jsx(Input, { id: "email", type: "email", placeholder: "Enter your email" })] }), _jsxs("div", { className: "flex flex-col space-y-1.5", children: [_jsx(Label, { htmlFor: "password", children: "Password" }), _jsx(Input, { id: "password", type: "password", placeholder: "Enter your password" })] })] }) }) }), _jsxs(CardFooter, { className: "flex justify-between", children: [_jsx(Button, { variant: "outline", children: "Register" }), _jsx(Button, { children: "Login" })] })] }));
}
