"use client"

import React from "react";
import { Button } from "./ui/button";
import { DotPattern } from "./ui/dot-pattern";
import { cn } from "@/lib/utils";
import { FlickeringGrid } from "./ui/flickering-grid";
import { Separator } from "./ui/separator";

type Props = { onDiscover?: () => void };

export const HomeYasuo: React.FC<Props> = ({ onDiscover }) => {
  return (
    <div className="relative w-full">
      <div
        className="
     relative w-full mx-auto
     max-w-screen-2xl           
    h-[70vh] md:h-[80vh] lg:h-[93vh]  
     overflow-hidden rounded-lg
   "
      >
        
        {/* Dots dietro */}
        <FlickeringGrid
          className="absolute inset-0 z-0 [mask-image:radial-gradient(600px_circle_at_center,white,transparent)]"
          squareSize={4}
          gridGap={6}
          color="#00d992"
          maxOpacity={0.5}
          flickerChance={0.1}
          // usa le dimensioni del container
          width={1388}
          height={800}
        />

        {/* Immagine sopra i dots */}
        <div
          className="
            absolute inset-0 z-10
            bg-[url(/img/Yasuo_3.png)] bg-cover bg-center grayscale
          "
          aria-hidden
        />

        {/* Contenuto in primo piano */}
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2.5 p-2.5 select-none">
          
          <div className="[text-shadow:0px_4px_32px_#00d992] font-jetbrains font-medium text-jade text-3xl sm:text-4xl md:text-5xl leading-normal text-center px-4">
            The future of Improvement
          </div>

          <p className="[text-shadow:0px_4px_31.7px_#eae7e7] font-jetbrains font-light text-[#eae6e6] text-base sm:text-lg md:text-xl text-center leading-normal px-4">
            The new frontier of League of Legends improvement
            <br />
            featuring your personal AI assistant
          </p>

          <Button variant="solid" onClick={onDiscover}>
            DISCOVER
          </Button>
        </div>
      </div>
      <Separator className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen border-t border-flash/20" />
    </div>

  );
};
