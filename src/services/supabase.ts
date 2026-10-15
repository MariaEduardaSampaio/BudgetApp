import { createClient } from "@supabase/supabase-js";

// Variáveis lidas no build (o Expo embute as que começam com EXPO_PUBLIC_).
// A chave "publishable" (ou "anon") é pública por natureza: quem protege os dados é a RLS do banco.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

export const isSupabaseConfigured = Boolean(url && key);

export const supabase = createClient(url || "http://localhost", key || "missing-key", {
    auth: {
        persistSession: true, // mantém o login salvo no navegador
        autoRefreshToken: true,
        detectSessionInUrl: false,
    },
});
