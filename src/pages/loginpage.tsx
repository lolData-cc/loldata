"use client"

import { Navbar } from "@/components/navbar";
import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { useTheme } from "next-themes";
import { MagicCard } from "@/components/ui/magic-card";

export default function LoginPage() {
  const [animateIn, setAnimateIn] = useState(true);
  const [discordLoading, setDiscordLoading] = useState(false);
  const { theme } = useTheme();

  // OAuth Discord
  const loginWithDiscord = useCallback(async () => {
    if (discordLoading) return;
    setDiscordLoading(true);
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        scopes: "identify email",
        redirectTo, // deve combaciare con i Redirects su Discord
      },
    });
    if (error) {
      alert("Discord login failed: " + error.message);
      setDiscordLoading(false);
    }
    // ci pensa il redirect di Supabase
  }, [discordLoading]);

  // Accessibilità tastiera per il div “button”
  const onKeyDiscord = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      loginWithDiscord();
    }
  };

  // animazione iniziale
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
        <div className="relative w-[1px] h-screen bg-flash/10 left-[300px] bottom-16" />
        <div className="relative w-[1px] h-screen bg-flash/10 left-[450px] bottom-16" />
        <div className="relative w-[1px] h-screen bg-flash/10 left-[600px] bottom-16" />
        <div className="relative w-[1px] h-screen bg-flash/10 left-[750px] bottom-16" />
        <div className="relative w-[1px] h-screen bg-flash/10 left-[900px] bottom-16" />
      </div>
      <div className="relative flex flex-col w-screen h-screen select-none" draggable={false}>
        <div className="relative w-screen h-[1px] bg-flash/10 bottom-[350px]" />
        <div className="relative w-screen h-[1px] bg-flash/10 bottom-[550px]" />
        <div className="relative w-screen h-[1px] bg-flash/10 bottom-[750px]" />
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

      {/* pannello con animazione */}
      <div className="relative font-jetbrains text-flash/60">
        <div className="relative left-[350px] xl:bottom-[1757px] w-[500px] h-[600px]">
          <div
            className={cn(
              "relative origin-center will-change-transform transition-transform duration-500 ease-out",
              animateIn ? "scale-y-[0.03]" : "scale-y-100",
              "motion-reduce:transition-none motion-reduce:transform-none"
            )}
            style={{ transformOrigin: "50% 50%" }}
          >
            <MagicCard
              gradientColor={theme === "dark" ? "#00d992" : "#11382E"}
              gradientSize={220}
              className={cn(
                "relative w-full h-[600px] p-8 overflow-hidden",
                "backdrop-blur-[5px] rounded-sm shadow-lg ring-1 ring-white/5",
                "border border-flash/25"
              )}
            >
              <div
                className="pointer-events-none absolute inset-0
                  bg-gradient-to-br from-[rgba(0,217,146,0.25)] via-transparent to-transparent
                  blur-3xl"
              />

              <h1 className="text-3xl select-none font-scifi">SIGN IN</h1>

              <div className="py-4 space-y-6">
                <Input variant="underline" placeholder="USERNAME OR EMAIL" />
                <Input variant="underline" placeholder="PASSWORD" />
              </div>

              <div className="flex justify-between">
                {/* === Discord === */}
                <div
                  role="button"
                  tabIndex={0}
                  aria-label="Sign in with Discord"
                  onClick={loginWithDiscord}
                  onKeyDown={onKeyDiscord}
                  className={cn(
                    "bg-transparent w-[30%] h-12 rounded-[4px] border border-flash/10 flex items-center justify-center cursor-clicker hover:bg-flash/10",
                    discordLoading && "opacity-60 pointer-events-none"
                  )}
                >
                  {/* Hover SOLO sull'icona (svg) */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 127.14 96.36"
                    className={cn(
                      "w-6 h-6 fill-current text-gray-500 transition-colors duration-200",
                      "hover:text-[#5865F2]"
                    )}
                  >
                    <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.15,105.15,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21a105.73,105.73,0,0,0,31.77,16.15,77.7,77.7,0,0,0,6.85-11.08,68.42,68.42,0,0,1-10.79-5.18c.91-.66,1.8-1.35,2.66-2a75.57,75.57,0,0,0,66.58,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.81,5.19,77,77,0,0,0,6.85,11.08A105.25,105.25,0,0,0,126.6,80.23C129.24,51.37,121.13,27.53,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S53.89,46,53.89,53,48.73,65.69,42.45,65.69Zm42.24,0c-6.27,0-11.43-5.7-11.43-12.71S78.41,40.23,84.69,40.23,96.12,46,96.12,53,90.95,65.69,84.69,65.69Z" />
                  </svg>
                </div>

                {/* === Riot (placeholder) === */}
                <div className="bg-transparent w-[30%] h-12 rounded-[4px] border border-flash/10 flex items-center justify-center cursor-clicker hover:bg-flash/10">
                  {/* Hover SOLO sull'icona: group sull'SVG, non sul container */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    className="w-7 h-7 group/svg"
                    aria-hidden
                  >
                    <circle
                      cx="24" cy="24" r="20"
                      className="fill-gray-500 transition-colors duration-200 group-hover/svg:fill-[#d32f2f]"
                    />
                    <polygon
                      points="25.891,13.176 12.584,19.462 14.642,28.935 17.356,28.935 16.887,22.159 17.304,22.03 18.936,28.935 21.756,28.935 21.652,20.681 22.068,20.552 23.495,28.935 26.481,28.935 27.185,18.965 27.601,18.835 28.34,28.935 32.288,28.935 33.678,15.07"
                      className="fill-gray-200 transition-colors duration-200 group-hover/svg:fill-white"
                    />
                    <polygon
                      points="23.612,32.813 22.628,30.278 32.118,30.766 31.711,34.824"
                      className="fill-gray-200 transition-colors duration-200 group-hover/svg:fill-white"
                    />
                  </svg>
                </div>

                {/* === Google (placeholder) === */}
                <div className="bg-transparent w-[30%] h-12 rounded-[4px] border border-flash/10 flex items-center justify-center cursor-clicker hover:bg-flash/10">
                  {/* Hover SOLO sull'icona: group sull'SVG */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    className="w-7 h-7 group/svg"
                    aria-hidden
                  >
                    <path
                      d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12 s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20 s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
                      className="fill-gray-500 transition-colors duration-200 group-hover/svg:fill-[#fbc02d]"
                    />
                    <path
                      d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039 l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
                      className="fill-gray-500 transition-colors duration-200 group-hover/svg:fill-[#e53935]"
                    />
                    <path
                      d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36 c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
                      className="fill-gray-500 transition-colors duration-200 group-hover/svg:fill-[#4caf50]"
                    />
                    <path
                      d="M43.611,20.083L43.595,20L42,20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571 c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
                      className="fill-gray-500 transition-colors duration-200 group-hover/svg:fill-[#1565c0]"
                    />
                  </svg>
                </div>
              </div>

              {/* extra contenuto se serve */}
            </MagicCard>
          </div>
        </div>
      </div>
    </div>
  );
}
