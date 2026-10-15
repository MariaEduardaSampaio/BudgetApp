export interface AuthRedirect {
    /** O site foi aberto pelo link de "criar nova senha" do e-mail. */
    isRecovery: boolean;
    /** Código de erro do Supabase (ex.: "otp_expired" quando o link expirou ou já foi usado). */
    errorCode: string | null;
}

/**
 * Lê o que o Supabase colocou no endereço ao redirecionar a partir de um link de e-mail.
 * Os dados vêm depois do "#" (fluxo implicit) e, em alguns casos de erro, como "?...".
 */
export const parseAuthRedirect = (url: string): AuthRedirect => {
    const { hash, search } = new URL(url);
    const params = new URLSearchParams(search);
    new URLSearchParams(hash.replace(/^#/, "")).forEach((value, key) => params.set(key, value));

    return {
        isRecovery: params.get("type") === "recovery",
        errorCode: params.get("error_code") ?? params.get("error"),
    };
};
