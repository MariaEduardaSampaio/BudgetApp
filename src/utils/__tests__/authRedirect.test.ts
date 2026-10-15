import { parseAuthRedirect } from "../authRedirect";

const SITE = "https://alocar-budgets.vercel.app";

describe("parseAuthRedirect", () => {
    it("reconhece o link de criar nova senha (dados depois do #)", () => {
        const url = `${SITE}/reset-password#access_token=abc&expires_in=3600&refresh_token=def&token_type=bearer&type=recovery`;
        expect(parseAuthRedirect(url)).toEqual({ isRecovery: true, errorCode: null });
    });

    it("reconhece link expirado ou já usado", () => {
        const url = `${SITE}/reset-password#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired`;
        expect(parseAuthRedirect(url)).toEqual({ isRecovery: false, errorCode: "otp_expired" });
    });

    it("também lê erros que chegam como ?parâmetros", () => {
        expect(parseAuthRedirect(`${SITE}/?error=access_denied`).errorCode).toBe("access_denied");
    });

    it("não vê nada de especial numa visita normal", () => {
        expect(parseAuthRedirect(`${SITE}/history`)).toEqual({ isRecovery: false, errorCode: null });
        expect(parseAuthRedirect(`${SITE}/budget/123#topo`)).toEqual({ isRecovery: false, errorCode: null });
    });

    it("não confunde login comum por link (magic link) com troca de senha", () => {
        expect(parseAuthRedirect(`${SITE}/#access_token=abc&type=magiclink`).isRecovery).toBe(false);
    });
});
