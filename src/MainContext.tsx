import { Button } from '@/components/ui/button';
import { ReactNode } from 'react'; 
import { SearchDialog } from "@/components/searchdialog"
import { UserDialog } from "@/components/userdialog"
import { Link } from "react-router-dom"
import { useEffect, useState } from "react"


type MainContextProps = {
  children: ReactNode;
};

function MainContext({ children }: MainContextProps) {
  return (
    <div>
      {children}
    </div>
  );
}

export default MainContext;
