/** Erro como vem do Supabase (auth ou banco) ou do navegador. */
interface ErrorLike {
    message?: string;
    code?: string;
}

const NETWORK = /failed to fetch|network ?error|network request failed|load failed/i;

/** Traduz erros técnicos em mensagens que dá para mostrar para quem usa o app. */
export const friendlyError = (error: unknown, fallback = "Algo deu errado. Tente novamente."): string => {
    const { message = "", code } = (error ?? {}) as ErrorLike;

    if (NETWORK.test(message)) return "Sem conexão com a internet. Verifique e tente de novo.";
    if (/invalid login credentials/i.test(message)) return "E-mail ou senha incorretos.";
    if (/email not confirmed/i.test(message)) return "Este e-mail ainda não foi confirmado.";
    if (/jwt expired|refresh token/i.test(message)) return "Sua sessão expirou. Entre novamente.";
    if (/auth session missing/i.test(message)) return "O link expirou. Peça um novo em \"Esqueci minha senha\".";
    if (/different from the old password/i.test(message)) return "A nova senha precisa ser diferente da atual.";
    if (/password should be at least/i.test(message)) return "A senha é muito curta. Use pelo menos 8 caracteres.";
    if (/rate limit|only request this after|too many requests/i.test(message) || code === "over_email_send_rate_limit") {
        return "Muitas tentativas seguidas. Espere alguns minutos e tente de novo.";
    }
    // 23514 = check violation: algum dado não passou nas regras do banco.
    if (code === "23514") return "Algum dado do orçamento é inválido. Confira os campos.";
    // P0001 = erro lançado pelas nossas funções SQL; a mensagem já está em português.
    if (code === "P0001" && message) return message;

    return fallback;
};
