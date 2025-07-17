import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Routes, Route } from "react-router-dom";
import { Navbar } from "@/components/navbar";
import SummonerPage from "@/pages/summonerpage";
function HomePage() {
    return (_jsx("div", { className: "w-full", children: _jsx("div", { className: "p-6", children: _jsx("p", { className: "text-white text-xl", children: "Benvenuto su LolData" }) }) }));
}
export function RootLayout({ children, }) {
    return (_jsx("div", { className: "font-jetbrains antialiased bg-liquirice text-flash w-full min-h-screen flex justify-center no-scrollbar", children: _jsxs("div", { className: "xl:w-[65%] xl:px-0 w-full px-4 mt-0 flex flex-col items-center space-y-10", children: [_jsx(Navbar, {}), children] }) }));
}
function App() {
    return (_jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(RootLayout, { children: _jsx(HomePage, {}) }) }), _jsx(Route, { path: "/summoners/:region/:slug", element: _jsx(RootLayout, { children: _jsx(SummonerPage, {}) }) })] }));
}
export default App;
