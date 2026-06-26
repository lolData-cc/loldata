import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
import { useAmbientLight } from "@/hooks/useAmbientLight";
import { Navbar } from "@/components/navbar";
import { supabase } from "@/lib/supabaseClient";
import { Footer } from "@/components/footer";
import SummonerPage from "@/pages/summonerpage";
import SeasonPage from "@/pages/seasonpage";
import DashboardPage from "@/pages/dashboard";
import LearnPage from "@/pages/learnpage";
import ExplorerPage from "@/pages/explorerpage";
import LoginPage from "@/pages/loginpage";
import MatchPage from "@/pages/matchpage";
import NotFoundPage from "@/pages/notfoundpage";
import { Toaster } from "sonner";
import AuthGuard from "@/components/authguard";
import { LiveViewerProvider } from "./context/liveviewercontext";
import { LiveToastOnBoot } from "@/components/livetoastonboot";
import { HardwareAccelerationWarning } from "@/components/hardwareaccelerationwarning";
if (typeof window !== "undefined") {
    window.history.scrollRestoration = "manual";
    // @ts-expect-error: expose supabase on window for console debugging
    window.supabase = supabase;
}
// #region contexts
import { AuthProvider } from "@/context/authcontext";
import ItemPage from "./pages/itempage";
import ChampionPage from "./pages/championpage";
import { ChampionPickerProvider } from "@/context/championpickercontext";
import ChampionDetailPage from "./pages/championdetailpage";
import StreamersInfiniteCarousel from "./components/streeamerscarousel";
import { PricingPlans } from "./components/pricingplans";
import AuthCallback from "./auth/callback";
import RiotCallbackPage from "./pages/riotcallback";
import OverlayPage from "./pages/overlaypage";
import { SummonerShowcase } from "./components/home/SummonerShowcase";
import { CoachShowcase } from "./components/home/CoachShowcase";
import { ReplayShowcase } from "./components/home/ReplayShowcase";
import { Jax } from "./components/areyouwithus";
import { HeroLive } from "./components/home/HeroLive";
import LeaderboardPage from "@/pages/leaderboardpage";
import TierlistPage from "@/pages/tierlistpage";
import PlaygroundPage from "./pages/playgroundpage";
import TotalMasteryPage from "./pages/totalmastery";
import PrivacyPolicyPage from "@/pages/privacypolicypage";
import TermsOfServicePage from "@/pages/termsofservicepage";
import StreamersPage from "@/pages/streamerspage";
import ScoutPage from "@/pages/scoutpage";
import ScoutCreateLobbyPage from "@/pages/scoutcreatelobbypage";
import ScoutLobbyPage from "@/pages/scoutlobbypage";
import ScoutClaimPage from "@/pages/scoutclaimpage";
import BillingSuccessPage from "@/pages/billingsuccess";
import BillingCancelPage from "@/pages/billingcancel";
function HomePage() {
    const learnRef = useRef(null);
    const handleDiscover = () => {
        if (learnRef.current) {
            const top = learnRef.current.getBoundingClientRect().top + window.scrollY;
            window.scrollTo({ top: top - 100, behavior: "smooth" });
        }
    };
    return (_jsx("div", { className: "relative min-h-screen", children: _jsx("div", { className: "relative z-10", children: _jsxs("div", { className: "flex flex-col", children: [_jsxs("div", { children: [_jsx(HeroLive, { onExplore: handleDiscover }), _jsx("div", { ref: learnRef, id: "learn", children: _jsx(SummonerShowcase, {}) })] }), _jsx(CoachShowcase, {}), _jsx(ReplayShowcase, {}), _jsx("div", { className: "py-20 md:py-28", children: _jsx(Jax, {}) }), _jsx("section", { className: "pt-20 md:pt-28", children: _jsx(StreamersInfiniteCarousel, {}) })] }) }) }));
}
function AmbientLightOverlay() {
    const { intensity } = useAmbientLight();
    const { pathname } = useLocation();
    if (intensity <= 0)
        return null;
    // Skip on homepage — the hero image has its own lighting
    if (pathname === "/")
        return null;
    const opacity = intensity / 100 * 0.08; // max 8% opacity
    return (_jsx("div", { className: "absolute inset-0 pointer-events-none z-0 top-[400px]", style: {
            background: `radial-gradient(ellipse at 50% 0%, rgba(180,195,210,${opacity}) 0%, transparent 60%)`,
        } }));
}
export function RootLayout({ children, }) {
    const { pathname } = useLocation();
    const navbarSticky = pathname === "/";
    const noTopMargin = pathname === "/" || pathname === "/streamers";
    const contentMargin = noTopMargin ? "mt-0" : "mt-4";
    const scrollRef = useRef(null);
    // Scroll to top on route change
    useEffect(() => {
        scrollRef.current?.scrollTo(0, 0);
        window.scrollTo(0, 0);
    }, [pathname]);
    return (_jsxs(_Fragment, { children: [_jsx(Toaster, { position: "top-right", closeButton: false, toastOptions: {
                    classNames: {
                        title: "font-jetbrains !text-flash/40 ",
                        description: "font-geist !text-flash",
                        actionButton: "!bg-jade/20 uppercase font-jetbrains",
                        toast: "!bg-liquirice !border-flash/20",
                    },
                } }), _jsxs("div", { ref: scrollRef, className: "relative font-jetbrains subpixel-antialiased bg-liquirice text-flash w-full min-h-full flex justify-center overflow-y-scroll scrollbar-hide", children: [_jsx(AmbientLightOverlay, {}), _jsxs("div", { className: "xl:w-[65%] min-[2560px]:w-[55%] xl:px-0 w-full px-4 flex flex-col items-center relative z-[1]", children: [_jsx(Navbar, { sticky: navbarSticky }), _jsx("div", { className: `${contentMargin} w-full`, children: children }), _jsx(Footer, { className: "mt-32" })] })] })] }));
}
function App() {
    return (_jsx(AuthProvider, { children: _jsx(LiveViewerProvider, { children: _jsxs(ChampionPickerProvider, { children: [_jsx(Toaster, { position: "top-right", theme: "dark", richColors: true, closeButton: true }), _jsx(LiveToastOnBoot, {}), _jsx(HardwareAccelerationWarning, {}), _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(RootLayout, { children: _jsx(HomePage, {}) }) }), _jsx(Route, { path: "/summoners/:region/:slug/season", element: _jsx(RootLayout, { children: _jsx(SeasonPage, {}) }) }), _jsx(Route, { path: "/summoners/:region/:slug", element: _jsx(RootLayout, { children: _jsx(SummonerPage, {}) }) }), _jsx(Route, { path: "/dashboard/:tab?", element: _jsx(AuthGuard, { children: _jsx(DashboardPage, {}) }) }), _jsx(Route, { path: "/learn", element: _jsx(AuthGuard, { children: _jsx(LearnPage, {}) }) }), _jsx(Route, { path: "/learn/explorer", element: _jsx(AuthGuard, { children: _jsx(ExplorerPage, {}) }) }), _jsx(Route, { path: "/champions/:champId/guides/:guideId", element: _jsx(RootLayout, { children: _jsx(ChampionDetailPage, {}) }) }), _jsx(Route, { path: "/champions/:champId/:tab?", element: _jsx(RootLayout, { children: _jsx(ChampionDetailPage, {}) }) }), _jsx(Route, { path: "/login", element: _jsx(LoginPage, {}) }), _jsx(Route, { path: "/matches/:matchId", element: _jsx(MatchPage, {}) }), _jsx(Route, { path: "/champions", element: _jsx(ChampionPage, {}) }), _jsx(Route, { path: "/leaderboards", element: _jsx(RootLayout, { children: _jsx(LeaderboardPage, {}) }) }), _jsx(Route, { path: "/tierlist/:role?", element: _jsx(RootLayout, { children: _jsx(TierlistPage, {}) }) }), _jsx(Route, { path: "/items/:itemId", element: _jsx(RootLayout, { children: _jsx(ItemPage, {}) }) }), _jsx(Route, { path: "/auth/callback", element: _jsx(AuthCallback, {}) }), _jsx(Route, { path: "/auth/riot/callback", element: _jsx(RiotCallbackPage, {}) }), _jsx(Route, { path: "/overlay/:region/:slug", element: _jsx(OverlayPage, {}) }), _jsx(Route, { path: "/pricing", element: _jsxs(RootLayout, { children: [" ", _jsx(PricingPlans, {}), " "] }) }), _jsx(Route, { path: "/billing/success", element: _jsxs(RootLayout, { children: [" ", _jsx(BillingSuccessPage, {}), " "] }) }), _jsx(Route, { path: "/billing/cancel", element: _jsxs(RootLayout, { children: [" ", _jsx(BillingCancelPage, {}), " "] }) }), _jsx(Route, { path: "/dle", element: _jsxs(RootLayout, { children: [" ", _jsx(PlaygroundPage, {}), " "] }) }), _jsx(Route, { path: "/mastery", element: _jsxs(RootLayout, { children: [" ", _jsx(TotalMasteryPage, {}), " "] }) }), _jsx(Route, { path: "/privacy", element: _jsx(RootLayout, { children: _jsx(PrivacyPolicyPage, {}) }) }), _jsx(Route, { path: "/terms", element: _jsx(RootLayout, { children: _jsx(TermsOfServicePage, {}) }) }), _jsx(Route, { path: "/streamers", element: _jsx(RootLayout, { children: _jsx(StreamersPage, {}) }) }), _jsx(Route, { path: "/scout", element: _jsx(RootLayout, { children: _jsx(ScoutPage, {}) }) }), _jsx(Route, { path: "/scout/new", element: _jsx(AuthGuard, { children: _jsx(RootLayout, { children: _jsx(ScoutCreateLobbyPage, {}) }) }) }), _jsx(Route, { path: "/scout/claim/:token", element: _jsx(RootLayout, { children: _jsx(ScoutClaimPage, {}) }) }), _jsx(Route, { path: "/scout/:slug", element: _jsx(RootLayout, { children: _jsx(ScoutLobbyPage, {}) }) }), _jsx(Route, { path: "/scout/:slug/:tab", element: _jsx(RootLayout, { children: _jsx(ScoutLobbyPage, {}) }) }), _jsx(Route, { path: "*", element: _jsx(NotFoundPage, {}) })] })] }) }) }));
}
export default App;
