import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useNavigate } from "react-router-dom"
import { toast, Toaster } from "sonner"
import { Check } from 'lucide-react';
import { Separator } from "@/components/ui/separator";
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
                    <Check className="w-3 h-3 text-black bg-jade rounded-[100px]"/>
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
        <div className="flex overflow-y-scroll scrollbar-hide text-white w-full gap-2">
            <div className="h-[700px] border-flash/10 border border-sm rounded-md w-[30%]">
                <div className="flex flex-col justify-between h-full py-5">
                    <div className="text-center font-jetbrains font-thin text-flash"> DASHBOARD
                        <Separator className="bg-flash/10 w-full mt-4"></Separator>
                    </div>

                    <div className="w-full flex justify-center ">
                        <div
                            className="bg-[#1E202D] cursor-clicker py-1.5 w-[50%] text-center hover:bg-[#1E202D]/70 rounded-sm"
                            onClick={handleLogout}
                        >
                            <span className="text-[#8BA1FF] font-thin">LOGOUT</span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="w-[70%] font">

            </div>
        </div>
    )
}
