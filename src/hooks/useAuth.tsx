import type { Session } from "@supabase/supabase-js";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { initialAuthRedirect, passwordResetRedirectUrl, supabase } from "../services/supabase";

interface AuthContextValue {
    session: Session | null;
    /** true enquanto ainda verifica se já existe um login salvo. */
    loading: boolean;
    /** Entrou pelo link de "criar nova senha": precisa definir a senha antes de usar o app. */
    recovering: boolean;
    /** Erro do link do e-mail (ex.: "otp_expired"), para avisar na tela de login. */
    linkError: string | null;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    /** Envia o e-mail com o link para criar uma nova senha. */
    requestPasswordReset: (email: string) => Promise<void>;
    /** Troca a senha de quem está logado (ou entrou pelo link do e-mail). */
    updatePassword: (password: string) => Promise<void>;
    clearLinkError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [recovering, setRecovering] = useState(initialAuthRedirect.isRecovery);
    const [linkError, setLinkError] = useState(initialAuthRedirect.errorCode);

    useEffect(() => {
        supabase.auth
            .getSession()
            .then(({ data }) => setSession(data.session))
            .finally(() => setLoading(false));

        // Login, logout, renovação do token e entrada pelo link de troca de senha.
        const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
            setSession(newSession);
            if (event === "PASSWORD_RECOVERY") setRecovering(true);
            if (event === "SIGNED_OUT") setRecovering(false);
        });
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

    const requestPasswordReset = async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: passwordResetRedirectUrl(),
        });
        if (error) throw error;
    };

    const updatePassword = async (password: string) => {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setRecovering(false);
    };

    return (
        <AuthContext.Provider
            value={{
                session,
                loading,
                recovering,
                linkError,
                signIn,
                signOut,
                requestPasswordReset,
                updatePassword,
                clearLinkError: () => setLinkError(null),
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = (): AuthContextValue => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth precisa estar dentro de <AuthProvider>.");
    return context;
};
