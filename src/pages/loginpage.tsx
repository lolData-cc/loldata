import { Navbar } from "@/components/navbar";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export default function LoginPage() {
    const [animateIn, setAnimateIn] = useState(true);     // ⬅️ parte come “linea”

    // Double RAF: linea ➜ espansione orizzontale
    useEffect(() => {
        let id1 = 0, id2 = 0;
        id1 = requestAnimationFrame(() => {
            id2 = requestAnimationFrame(() => setAnimateIn(false));
        });
        return () => { cancelAnimationFrame(id1); cancelAnimationFrame(id2); };
    }, []);
    return (
        <div className="relative w-screen h-screen overflow-hidden">
            <div className="relative z-10 w-full bg-liquirice/60 rounded-md">
                <div className="w-[65%] mx-auto">
                    <Navbar />
                </div>
            </div>

            <img
                src="/img/irelia 1.png"
                alt=""
                className="absolute inset-0 w-full h-full object-cover filter grayscale"
            />

            <div className="absolute inset-0 bg-liquirice/95 backdrop-blur-[2px]" />

            <div className="relative flex w-screen h-screen">
                <div className="relative w-[1px] h-screen bg-flash/10 left-[300px] bottom-16" > </div>
                <div className="relative w-[1px] h-screen bg-flash/10 left-[450px] bottom-16" > </div>
                <div className="relative w-[1px] h-screen bg-flash/10 left-[600px] bottom-16" > </div>
                <div className="relative w-[1px] h-screen bg-flash/10 left-[750px] bottom-16" > </div>
                <div className="relative w-[1px] h-screen bg-flash/10 left-[900px] bottom-16" > </div>
            </div>
            <div className="relative flex flex-col w-screen h-screen select-none" draggable={false}>
                <div className="relative w-screen h-[1px] bg-flash/10 bottom-[350px]" > </div>
                <div className="relative w-screen h-[1px] bg-flash/10 bottom-[550px]" > </div>
                <div className="relative w-screen h-[1px] bg-flash/10 bottom-[750px]" > </div>
                <div className="flex">
                    <span className="relative text-flash/20 bottom-[769px] text-2xl left-[292px]"> + </span>
                    <span className="relative text-flash/20 bottom-[769px] text-2xl left-[880px]"> + </span>
                </div>
                <div className="flex">
                    <span className="relative text-flash/20 bottom-[602px] text-2xl left-[292px]"> + </span>
                    <span className="relative text-flash/20 bottom-[602px] text-2xl left-[880px]"> + </span>
                </div>
                <div className="flex">
                    <span className="relative text-flash/20 bottom-[435px] text-2xl left-[292px]"> + </span>
                    <span className="relative text-flash/20 bottom-[435px] text-2xl left-[880px]"> + </span>
                </div>



            </div>

            {/* qui voglio l'animazione */}
            <div className="relative font-jetbrains text-flash/60">
                {/* Wrapper animato: apertura in X */}
                <div className="relative left-[350px] xl:bottom-[1757px] w-[500px] h-[600px]">


                    {/* contenitore che “si apre” orizzontalmente */}
                    <div
                        className={cn(
                            "relative origin-center will-change-transform transition-transform duration-500 ease-out",
                            animateIn ? "scale-y-[0.03]" : "scale-y-100",
                            "motion-reduce:transition-none motion-reduce:transform-none"
                        )}
                        style={{ transformOrigin: "50% 50%" }}
                    >
                        {/* pannello vero e proprio */}
                        <div className="w-full h-[600px] bg-[radial-gradient(ellipse_at_top_left,_rgba(50,50,50,255),_rgba(14,14,14,0.02))] backdrop-blur-[5px] border border-flash/25 rounded-sm shadow-lg ring-1 ring-white/5 p-8">
                            <h1 className="text-3xl">LOGIN</h1>
                            {/* resto del form */}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}