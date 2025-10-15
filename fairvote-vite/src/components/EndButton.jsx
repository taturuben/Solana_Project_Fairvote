import { useState } from "react";
import { cn } from "../utilities/cn";
import { LoaderCircle } from 'lucide-react';


export const EndButton = ({ children, onClick }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handler = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    await onClick();
    setIsLoading(false);
  }

  return <button onClick={handler} className={cn(
            "flex justify-between items-center gap-2",
            "end-btn"
          )}>
            <LoaderCircle className={cn(
              "animate animate-spin h-5",
              isLoading ? "inline" : "hidden"
            )}/>
            End Election
        </button>
}