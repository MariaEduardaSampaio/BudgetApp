import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { fakeDb } from "../../test-utils/fakeSupabase";
import { AuthProvider, useAuth } from "../useAuth";

// O Supabase é o falso em memória, nunca o de verdade.
jest.mock("../../services/supabase", () => jest.requireActual("../../test-utils/fakeSupabase").fakeSupabaseModule);

const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;

/** Renderiza o hook e espera terminar de verificar se já existe login salvo. */
const renderAuth = async () => {
    const hook = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    return hook;
};

beforeEach(() => fakeDb.reset());

describe("useAuth", () => {
    it("começa carregando e termina deslogado quando não há login salvo", async () => {
        const hook = renderHook(() => useAuth(), { wrapper });
        expect(hook.result.current.loading).toBe(true);
        await waitFor(() => expect(hook.result.current.loading).toBe(false));
        expect(hook.result.current.session).toBeNull();
    });

    it("começa logado quando já existe login salvo", async () => {
        fakeDb.loginAs("pai");
        const { result } = await renderAuth();
        expect(result.current.session?.user.email).toBe("pai@teste.com");
    });

    it("entra com a senha certa", async () => {
        const { result } = await renderAuth();
        await act(() => result.current.signIn("irmao@teste.com", "senha-do-irmao"));
        expect(result.current.session?.user.email).toBe("irmao@teste.com");
    });

    it("recusa a senha errada sem criar sessão", async () => {
        const { result } = await renderAuth();
        await expect(result.current.signIn("pai@teste.com", "errada")).rejects.toEqual(
            expect.objectContaining({ message: "Invalid login credentials" }),
        );
        expect(result.current.session).toBeNull();
    });

    it("ignora espaços em volta do e-mail", async () => {
        const { result } = await renderAuth();
        await act(() => result.current.signIn("  pai@teste.com ", "senha-do-pai"));
        expect(result.current.session).not.toBeNull();
    });

    it("sair limpa a sessão", async () => {
        fakeDb.loginAs("pai");
        const { result } = await renderAuth();
        await act(() => result.current.signOut());
        expect(result.current.session).toBeNull();
    });

    it("avisa quando o login falha por falta de internet", async () => {
        const { result } = await renderAuth();
        fakeDb.failNext("network");
        await expect(result.current.signIn("pai@teste.com", "senha-do-pai")).rejects.toEqual(
            expect.objectContaining({ message: expect.stringContaining("Failed to fetch") }),
        );
    });
});
