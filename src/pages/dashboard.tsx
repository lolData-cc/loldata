import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useNavigate } from "react-router-dom"
import { toast, Toaster } from "sonner"
import { Check } from 'lucide-react';
import { Separator } from "@/components/ui/separator";
import { Navbar } from "@/components/navbar";
export default function DashboardPage() {
    const navigate = useNavigate()
    const handleLogout = async () => {
        await supabase.auth.signOut()
 
        toast.custom((t) => (
            <div
                className="bg-[#162322] text-flash font-jetbrains border border-jade shadow-md rounded-[3px] px-6 py-3 w-full flex items-start gap-3 relative"
            >
                <button
                    className="text-flash/40 hover:text-flash absolute left-4 top-4 text-sm"
                    onClick={() => toast.dismiss(t)}
                >
                    <Check className="w-3 h-3 text-black bg-jade rounded-[100px]" />
                </button>
                <div className="pl-4 w-[300px]">
                    <p className=" text-md text-jade font-jetbrains">Logout</p>
                    <p className="text-sm text-jade/50">You succesfully logged out</p>
                </div>
            </div>
        ),
            {
                duration: 3000,
            })
 
 
        navigate("/")
    }
 
    return (
        <div className="font-jetbrains subpixel-antialiased bg-liquirice text-flash w-full min-h-screen flex justify-center">
            <div className="xl:w-[65%] xl:px-0 w-full px-4 flex flex-col items-center h-screen">
                <Navbar />
                <Separator className="bg-flash/20 mt-0 w-screen" />
                <div className="flex w-full h-full">
                    <div className="w-[20%] border-r border-flash/10 h-full">
                        <div className="text-center font-sourcecode font-extralight text-flash/30 text-[14px]">DASHBOARD</div>
                    </div>
                    <div className="w-[70%] overflow-y-scroll scrollbar-hide h-full">
                        <div onClick={handleLogout}>LOGOUT</div>
                    </div>
                </div>
            </div>
        </div>
 
    )
}