import { useState } from "react";
import { cn } from "../utilities/cn";
import { LoaderCircle } from 'lucide-react';


export const SubmitButton = ({ children, onClick }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handler = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    await onClick();
    setIsLoading(false);
  }

  return <button type="submit" className={cn(
            "flex justify-between items-center gap-2",
            isLoading ? "submit-btn-loading" : "submit-btn"
          )}>
            <LoaderCircle className={cn(
                "animate-spin h-5",
                isLoading ? "inline" : "hidden"
            )}/>
                {children}
        </button>
}