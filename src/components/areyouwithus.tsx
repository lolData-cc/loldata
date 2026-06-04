
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { FlipText } from "@/components/ui/flip-text"
export const Jax = () => {
  return (
    <div className="relative bg-[#040B0D] w-screen left-1/2 -translate-x-1/2 h-[260px] md:h-[308px] overflow-hidden border-y border-flash/10">
      <div
        className="
        absolute inset-0 z-0
        pointer-events-none
        [background-image:linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)]
        [background-size:40px_40px]
        [mask-image:linear-gradient(to_right,transparent_0%,transparent_10%,white_30%,white_70%,transparent_90%,transparent_100%)]
        [-webkit-mask-image:linear-gradient(to_right,transparent_0%,transparent_10%,white_30%,white_70%,transparent_90%,transparent_100%)]
        md:[mask-image:linear-gradient(to_right,transparent_0%,transparent_35%,white_47%,white_70%,transparent_85%,transparent_100%)]
        md:[-webkit-mask-image:linear-gradient(to_right,transparent_0%,transparent_45%,white_47%,white_70%,transparent_85%,transparent_100%)]
      "
      />
      <img
        className="hidden md:block w-[35%] absolute left-[30%] -translate-x-1/2 h-full object-cover filter z-30"
        alt="Upscale media transformed character illustration"
        src="/img/areuwithus.png"
        draggable="false"
      />
      {/* Content */}
      <div className="absolute inset-0 z-[999] flex flex-col items-center justify-center md:items-end md:justify-center md:pr-[32%] text-white space-y-3">
        <FlipText className="text-2xl md:text-4xl">
          Are you with us?
        </FlipText>

        <div className="flex items-center gap-3 md:gap-4">
          <Button variant="solid" className="text-xs md:text-sm" asChild>
            <Link to="/pricing">
            BECOME A MEMBER
            </Link>
          </Button >
          <Button className="border-flash/10 border text-flash/40 text-xs md:text-sm" variant="purchase">
            CONTACT US
          </Button >
        </div>
      </div>
    </div>
  );
};