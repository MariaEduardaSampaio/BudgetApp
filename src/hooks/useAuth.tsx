import type { Session } from "@supabase/supabase-js";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { supabase } from "../services/supabase";

interface AuthContextValue {
    session: Session | null;
    /** true enquanto ainda verifica se já existe um login salvo. */
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth
            .getSession()
            .then(({ data }) => setSession(data.session))
            .finally(() => setLoading(false));

        // Login, logout e renovação automática do token.
        const { data } = supabase.auth.onAuthStateChange((_event, newSession) => setSession(newSession));
        return () => data.subscription.unsubscribe();
    }, []);

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    };

    return <AuthContext.Provider value={{ session, loading, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextValue => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth precisa estar dentro de <AuthProvider>.");
    return context;
};
