import { createContext, ReactNode, useContext } from "react";
import { APIClient } from "./client";

const ApiContext = createContext<APIClient | null>(null);

export function ApiProvider({ children }: { children: ReactNode })  {
    const apiClient = new APIClient(import.meta.env.VITE_BACKEND_API_URL);

    return <ApiContext.Provider value={apiClient}> { children } </ApiContext.Provider>;
}

export function useApi() {
    const context = useContext(ApiContext);
    if (!context) {
        throw new Error("useApi hook can only be used within an <ApiProvider/> component");
    }

    return { context };
}
