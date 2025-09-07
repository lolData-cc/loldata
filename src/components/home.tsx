import React from "react";

export const HomeYasuo = () => {
  return (
    <div className="relative bg-transparent grid justify-items-center [align-items:start] w-full">
      <div className="bg-[url(/img/Yasuo.png)] bg-cover bg-[50%_50%] w-[1283px] h-[739px]">
        <div className="flex flex-col w-[830px] items-center gap-2.5 p-2.5 relative top-[236px] left-[244px]">
          <div className="relative self-stretch mt-[-1px] [text-shadow:0px_4px_32px_#00d992] font-jetbrains font-medium text-jade text-[54px] leading-normal">
            The future of Improvement
          </div>

          <p className="relative w-fit [text-shadow:0px_4px_31.7px_#eae7e7] font-jetbrains font-light text-[#eae6e6] text-[22px] text-center leading-normal">
            The new frontier of League of Legends improvement
            <br />
            featuring your personal AI assistant
          </p>
        </div>
      </div>
    </div>
  );
};