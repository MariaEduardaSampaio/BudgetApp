import { act, render } from "@testing-library/react";
import HomeScreen from "../../app/(tabs)/index";
import HistoryScreen from "../../app/(tabs)/history";
import RootLayout from "../../app/_layout";
import BudgetScreen from "../../app/budget/[id]";
import ForgotPasswordScreen from "../../app/forgot-password";
import LoginScreen from "../../app/login";
import ResetPasswordScreen from "../../app/reset-password";
import AccountButton from "../components/AccountButton";
import { clearUnsavedBudget } from "../hooks/useBudgetForm";
import { fakeNav, RoutesContext } from "./fakeRouter";

/**
 * Renderiza o app inteiro (RootLayout real) para os testes de fluxo.
 * O arquivo de teste precisa trocar o Supabase e o expo-router pelos falsos:
 *   jest.mock("<caminho>/services/supabase", () => jest.requireActual("<caminho>/test-utils/fakeSupabase").fakeSupabaseModule);
 *   jest.mock("expo-router", () => jest.requireActual("<caminho>/test-utils/fakeRouter").fakeRouterModule);
 *   jest.mock("@expo/vector-icons/Ionicons", () => jest.requireActual("<caminho>/test-utils/fakeIcons").fakeIoniconsModule);
 */

type StartPath = "/" | "/history" | "/login" | `/budget/${string}`;

const ROUTES = {
    // As abas: o botão "Conta" fica no cabeçalho delas (app/(tabs)/_layout.tsx).
    "(tabs)": (path: string) => (
        <>
            <AccountButton />
            {path === "/history" ? <HistoryScreen /> : <HomeScreen />}
        </>
    ),
    "budget/[id]": (path: string) => <BudgetScreen key={path} />,
    login: () => <LoginScreen />,
    "forgot-password": () => <ForgotPasswordScreen />,
    "reset-password": () => <ResetPasswordScreen />,
};

const forbiddenFetch = () => {
    throw new Error("Rede real proibida nos testes");
};

export function renderApp(startPath: StartPath = "/") {
    // Garantia extra: se algo tentar usar a rede de verdade, o teste quebra.
    global.fetch = forbiddenFetch as typeof fetch;
    fakeNav.reset(startPath);
    // Cada teste começa como um navegador recém-aberto (sem orçamento pela metade de outro teste).
    clearUnsavedBudget();
    const result = render(
        <RoutesContext.Provider value={ROUTES}>
            <RootLayout />
        </RoutesContext.Provider>,
    );
    return {
        ...result,
        path: fakeNav.path,
        /** Vai para outra tela (como tocar numa aba ou abrir um link). */
        goTo: (path: StartPath) => act(() => fakeNav.go(path)),
    };
}
