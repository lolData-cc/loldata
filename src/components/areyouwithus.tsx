import React from "react";
import upscalemediaTransformed3 from "./upscalemedia-transformed-3.png";
import { Button } from "./ui/button";

export const Jax = () => {
  const handleBecomeMember = () => {
    // Handle become member action
    console.log("Become a member clicked");
  };

  const handleContactUs = () => {
    // Handle contact us action
        console.log("Contact us clicked");
    };

return (
  <div className="relative bg-[#040B0D] w-screen h-[308px] right-[335px] overflow-hidden border-y border-flash/10">
    {/* Griglia */}
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

    {/* Immagine principale */}
    <img
      className="w-[35%] absolute left-[30%] -translate-x-1/2 h-full object-cover filter z-30"
      alt="Upscale media transformed character illustration"
      src="/img/areuwithus.png"
      draggable="false"
    />

    {/* Luce */}
    {/* <img
      src="/img/lights/1.png"
      alt=""
      className="absolute inset-0 mix-blend-screen pointer-events-none z-20 xl:w-[25%] left-[16%] -mt-12"
    /> */}

        {/* Testo sopra a TUTTO, senza linee */}
        <div className="absolute top-32 right-[32%] -translate-y-1/2 z-[999] text-white space-y-3">
            <h2 className="text-5xl">Are you with us?</h2>
            <div className="flex items-center justify-end gap-4">
                <Button className="">
                    BECOME A MEMBER
                </Button >
                <Button className="border-flash/10 border text-flash/40" variant="purchase">
                    CONTACT US
                </Button >
            </div>
        </div>
  </div>
);








    //   return (
//     <main className="bg-[#040b0d] grid justify-items-center [align-items:start] w-full">
//       <section className="bg-[#040b0d] w-[2199px] h-[768px] relative">
//         <img
//           className="absolute w-[2199px] h-[768px] top-0 left-0"
//           alt="Background union design"
//           src="/public/img/jaxunion.svg"
//         />

//         <div className="absolute w-full h-[1017px] top-[-249px] left-0">
//           <div className="relative w-[1785px] h-[1061px] -top-11">
//             <div className="absolute w-[1780px] h-[1061px] top-0 left-0">
//               <div
//                 className="absolute w-[924px] h-[927px] top-0 left-[232px] rounded-[462px/463.5px] blur-[50px] bg-[linear-gradient(0deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0)_100%),linear-gradient(180deg,rgba(2,189,128,1)_0%,rgba(27,146,107,0.5)_33%,rgba(53,103,87,0)_100%)]"
//                 aria-hidden="true"
//               />

//               <img
//                 className="absolute w-[1332px] h-[768px] top-[293px] left-0 bg-blend-luminosity aspect-[1.75] object-cover"
//                 alt="Upscale media transformed character illustration"
//                 src="/img/Jax.png"
//               />

//               <div className="absolute w-[730px] h-[100px] top-[486px] left-[1050px]">
//                 <h1 className="absolute -top-px left-3.5 [font-family:'JetBrains_Mono-Bold',Helvetica] font-bold text-[#ececec] text-[76px] tracking-[0] leading-[normal]">
//                   Are you with us?
//                 </h1>
//               </div>
//             </div>

//             <div
//               className="inline-flex items-center gap-[15px] absolute top-[651px] left-[1350px]"
//               role="group"
//               aria-label="Call to action buttons"
//             >
//               <button
//                 className="inline-flex items-center justify-center gap-2.5 px-[15px] py-2.5 relative flex-[0_0_auto] bg-[#025d41] rounded-[3px] overflow-hidden hover:bg-[#037a52] focus:outline-none focus:ring-2 focus:ring-[#00d992] focus:ring-offset-2 focus:ring-offset-[#040b0d] transition-colors duration-200"
//                 onClick={handleBecomeMember}
//                 aria-label="Become a member"
//               >
//                 <span className="relative w-fit mt-[-1.00px] [font-family:'JetBrains_Mono-Regular',Helvetica] font-normal text-[#00d992] text-2xl tracking-[0] leading-[normal]">
//                   BECOME A MEMBER
//                 </span>
//               </button>

//               <button
//                 className="inline-flex items-center justify-center gap-2.5 px-[15px] py-2.5 relative flex-[0_0_auto] rounded-[3px] overflow-hidden border-2 border-solid border-[#6b6969] hover:border-[#888888] hover:text-[#888888] focus:outline-none focus:ring-2 focus:ring-[#6b6969] focus:ring-offset-2 focus:ring-offset-[#040b0d] transition-colors duration-200"
//                 onClick={handleContactUs}
//                 aria-label="Contact us"
//               >
//                 <span className="relative w-fit mt-[-2.00px] [font-family:'JetBrains_Mono-Regular',Helvetica] font-normal text-[#666666] text-2xl tracking-[0] leading-[normal]">
//                   CONTACT US
//                 </span>
//               </button>
//             </div>
//           </div>
//         </div>
//       </section>
//     </main>
//   );
};