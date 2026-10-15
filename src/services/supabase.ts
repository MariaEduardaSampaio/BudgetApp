import { createClient } from "@supabase/supabase-js";
import { AuthRedirect, parseAuthRedirect } from "../utils/authRedirect";

// Variáveis lidas no build (o Expo embute as que começam com EXPO_PUBLIC_).
// A chave "publishable" (ou "anon") é pública por natureza: quem protege os dados é a RLS do banco.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

export const isSupabaseConfigured = Boolean(url && key);

/**
 * Como o site foi aberto (ex.: pelo link de "criar nova senha").
 * Precisa ser lido ANTES do createClient: o Supabase processa o link e limpa o endereço.
 */
export const initialAuthRedirect: AuthRedirect =
    typeof window !== "undefined" && window.location
        ? parseAuthRedirect(window.location.href)
        : { isRecovery: false, errorCode: null };

export const supabase = createClient(url || "http://localhost", key || "missing-key", {
    auth: {
        persistSession: true, // mantém o login salvo no navegador
        autoRefreshToken: true,
        // Lê o login que vem no link do e-mail (troca de senha).
        detectSessionInUrl: true,
        // "implicit": o link funciona mesmo aberto em outro navegador (ex.: pelo app do Gmail).
        flowType: "implicit",
    },
});

/** Endereço para onde o link do e-mail de troca de senha leva. */
export const passwordResetRedirectUrl = () => `${window.location.origin}/reset-password`;
