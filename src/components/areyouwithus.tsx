
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { FlipText } from "@/components/ui/flip-text"
export const Jax = () => {
  return (
    <div className="relative bg-[#040B0D] w-screen h-[308px] right-[335px] overflow-hidden border-y border-flash/10">
      <div
        className="
        absolute inset-0 z-0
        pointer-events-none
        [background-image:linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)]
        [background-size:40px_40px]
        [mask-image:linear-gradient(to_right,transparent_0%,transparent_35%,white_47%,white_70%,transparent_85%,transparent_100%)]
        [-webkit-mask-image:linear-gradient(to_right,transparent_0%,transparent_45%,white_47%,white_70%,transparent_85%,transparent_100%)]
      "
      />
      <img
        className="w-[35%] absolute left-[30%] -translate-x-1/2 h-full object-cover filter z-30"
        alt="Upscale media transformed character illustration"
        src="/img/areuwithus.png"
        draggable="false"
      />
      {/* Testo sopra a TUTTO, senza linee */}
      <div className="absolute top-32 right-[32%] -translate-y-1/2 z-[999] text-white space-y-3">
        <FlipText className="text-4xl">
          Are you with us?
        </FlipText>

        <div className="flex items-center justify-end gap-4">
          <Button variant="solid" className="text-sm" asChild>
            <Link to="/pricing">
            BECOME A MEMBER
            </Link>
          </Button >
          <Button className="border-flash/10 border text-flash/40" variant="purchase">
            CONTACT US
          </Button >
        </div>
      </div>
    </div>
  );
};