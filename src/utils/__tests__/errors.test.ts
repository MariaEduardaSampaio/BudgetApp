import { friendlyError } from "../errors";

describe("friendlyError", () => {
    it.each([
        [new TypeError("Failed to fetch"), "Sem conexão com a internet. Verifique e tente de novo."],
        [new TypeError("Load failed"), "Sem conexão com a internet. Verifique e tente de novo."],
        [{ message: "Invalid login credentials" }, "E-mail ou senha incorretos."],
        [{ message: "Email not confirmed" }, "Este e-mail ainda não foi confirmado."],
        [{ message: "JWT expired" }, "Sua sessão expirou. Entre novamente."],
        [{ message: 'new row violates check constraint "budgets_vehicle_plate_check"', code: "23514" }, "Algum dado do orçamento é inválido. Confira os campos."],
        [{ message: "Seu usuário ainda não está vinculado a uma oficina.", code: "P0001" }, "Seu usuário ainda não está vinculado a uma oficina."],
        [{ message: "New password should be different from the old password.", code: "same_password" }, "A nova senha precisa ser diferente da atual."],
        [{ message: "Password should be at least 6 characters.", code: "weak_password" }, "A senha é muito curta. Use pelo menos 8 caracteres."],
        [{ message: "Auth session missing!" }, "O link expirou. Peça um novo em \"Esqueci minha senha\"."],
        [{ message: "For security purposes, you can only request this after 42 seconds." }, "Muitas tentativas seguidas. Espere alguns minutos e tente de novo."],
        [{ message: "Email rate limit exceeded", code: "over_email_send_rate_limit" }, "Muitas tentativas seguidas. Espere alguns minutos e tente de novo."],
    ])("traduz %p", (error, expected) => {
        expect(friendlyError(error)).toBe(expected);
    });

    it("usa a mensagem padrão para erros desconhecidos (sem mostrar detalhes técnicos)", () => {
        expect(friendlyError({ message: "relation does not exist", code: "42P01" })).toBe("Algo deu errado. Tente novamente.");
        expect(friendlyError(undefined, "Não foi possível salvar.")).toBe("Não foi possível salvar.");
    });
});
