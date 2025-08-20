// import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
// import { SearchDialog } from "@/components/searchdialog"
// import { UserDialog } from "@/components/userdialog"
import { Separator } from "@/components/ui/separator"

type FooterProps = {
    className?: string;
};

export function Footer({ className = "" }: FooterProps) {

    return (
        <div className={`font-jetbrains w-full h-72 ${className}`}>
            <div className="h-full flex flex-col">
                <div className="flex-shrink-0">
                    <Separator className="w-full bg-flash/10" />
                    <div className="flex justify-between p-6 mt-2 text-flash/50">
                        <div className="w-64 text-2xl">
                            The future of Improvement
                        </div>
                        <div className="flex justify-between gap-24">
                            <div className="flex flex-col text-sm gap-2">
                                <span className="text-flash/20 ">
                                    PARTNERS
                                </span>
                                <ul className="flex flex-col gap-2 text-[13px] cursor-clicker [&>span:hover]:text-flash/80">
                                    <span> Collaborations </span>
                                    <span> Streamers </span>
                                    <span> Pros </span>
                                </ul>

                            </div>
                            <div className="flex flex-col text-sm gap-2">
                                <span className="text-flash/20 ">
                                    RESOURCES
                                </span>
                                <ul className="flex flex-col gap-2 text-[13px] cursor-clicker [&>span:hover]:text-flash/80">
                                    <span> Docs </span>
                                    <span> Changelog </span>
                                    <span> Support </span>
                                </ul>

                            </div>
                            <div className="flex flex-col text-sm gap-2">
                                <span className="text-flash/20 ">
                                    PRODUCT
                                </span>
                                <ul className="flex flex-col gap-2 text-[13px] cursor-clicker [&>span:hover]:text-flash/80">
                                    <span> Pricing </span>
                                    <span> Roadmap </span>
                                    <span> Status </span>
                                </ul>

                            </div>
                        </div>
                    </div>
                </div>
                <div className="mt-auto w-full flex flex-col justify-center items-center mb-6 gap-4">
                    <ul className="flex items-center justify-center gap-6">
                        <Link to="https://discord.gg/SNjKYbdXzG" className="flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#6E7173" viewBox="0 0 16 16" className="cursor-clicker text-jade">
                                <path d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612" />
                            </svg>
                        </Link>
                        <svg
                            role="img"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-3.5 h-3.5 text-[#6E7173] fill-current"
                        >
                            <title>X</title>
                            <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
                        </svg>
                    </ul>
                    <span className="text-xs w-[70%] text-flash/50 text-center">
                        © 2025 loldata.cc is not affiliated with or endorsed by Riot Games. League of Legends and Riot Games are trademarks or registered trademarks of Riot Games, Inc. All game content is © Riot Games, Inc.
                    </span>
                </div>

            </div>

        </div>
    );

}
