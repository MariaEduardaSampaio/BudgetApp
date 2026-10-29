import { Children, createContext, Fragment, isValidElement, ReactElement, ReactNode, useContext, useEffect, useSyncExternalStore } from "react";

/**
 * expo-router falso para os testes de fluxo (o expo-router/testing-library exige o preset nativo).
 * Substitui o módulo "expo-router": o RootLayout real é renderizado, os Stack.Protected decidem
 * quais telas existem, e só a tela da rota atual fica montada (navegar desmonta a anterior).
 *
 * Limitação: no expo-router de verdade as abas e o Histórico (debaixo de budget/[id]) continuam
 * montados e o useFocusEffect roda de novo ao voltar. Aqui voltar = montar de novo, então estes
 * testes NÃO pegam: (1) o Histórico deixar de recarregar ao ganhar foco; (2) o que fica guardado
 * na tela ao trocar de aba (texto da busca, páginas carregadas, formulário pela metade).
 * As abas também são desenhadas pelo renderApp (com o botão Conta), não por app/(tabs)/_layout.tsx.
 *
 * Uso: jest.mock("expo-router", () => jest.requireActual("<caminho>/test-utils/fakeRouter").fakeRouterModule);
 */

type Href = string | { pathname: string; params?: Record<string, string> };

const nav = { stack: ["/"], listeners: new Set<() => void>() };

const setStack = (stack: string[]) => {
    nav.stack = stack;
    nav.listeners.forEach((listener) => listener());
};
const currentPath = () => nav.stack[nav.stack.length - 1];
const subscribe = (listener: () => void) => {
    nav.listeners.add(listener);
    return () => nav.listeners.delete(listener);
};
const useCurrentPath = () => useSyncExternalStore(subscribe, currentPath);

const toPath = (href: Href) =>
    typeof href === "string" ? href : href.pathname.replace(/\[(\w+)\]/g, (_, key) => encodeURIComponent(href.params?.[key] ?? ""));

/** Nome da rota do arquivo em app/ para um endereço. */
const routeName = (path: string) => {
    if (path === "/" || path === "/history") return "(tabs)";
    if (path.startsWith("/budget/")) return "budget/[id]";
    return path.slice(1);
};
const ROUTE_HOME: Record<string, string> = { "(tabs)": "/", "budget/[id]": "/history" };

const router = {
    push: (href: Href) => setStack([...nav.stack, toPath(href)]),
    navigate: (href: Href) => setStack([...nav.stack, toPath(href)]),
    replace: (href: Href) => setStack([...nav.stack.slice(0, -1), toPath(href)]),
    back: () => nav.stack.length > 1 && setStack(nav.stack.slice(0, -1)),
    canGoBack: () => nav.stack.length > 1,
};

/** Como cada rota é desenhada; fornecido pelo renderApp. */
export const RoutesContext = createContext<Record<string, (path: string) => ReactElement> | null>(null);

function Screen(_props: { name?: string; options?: unknown }) {
    return null;
}

function Protected({ children }: { guard: boolean; children: ReactNode }) {
    return <>{children}</>;
}

/** Nomes dos Stack.Screen liberados pelos Stack.Protected (guard verdadeiro). */
const allowedRoutes = (children: ReactNode): string[] =>
    Children.toArray(children).flatMap((child) => {
        if (!isValidElement(child)) return [];
        const element = child as ReactElement<any>;
        if (element.type === Screen) return element.props.name ? [element.props.name] : [];
        if (element.type === Protected) return element.props.guard ? allowedRoutes(element.props.children) : [];
        if (element.type === Fragment) return allowedRoutes(element.props.children);
        return [];
    });

function Stack({ children }: { children?: ReactNode; screenOptions?: unknown }) {
    const routes = useContext(RoutesContext);
    const path = useCurrentPath();
    const allowed = allowedRoutes(children);
    const name = routeName(path);
    const isAllowed = allowed.includes(name);

    // Rota protegida: como o expo-router, vai para a primeira tela liberada.
    useEffect(() => {
        if (!isAllowed && allowed[0]) setStack([ROUTE_HOME[allowed[0]] ?? `/${allowed[0]}`]);
    });

    // Stack.Screen usado dentro de uma tela só para opções do cabeçalho: não desenha nada.
    if (!routes || allowed.length === 0) return null;
    return isAllowed ? routes[name](path) : null;
}
Stack.Screen = Screen;
Stack.Protected = Protected;

function Tabs() {
    return null;
}
Tabs.Screen = Screen;

/** Lê os parâmetros do endereço atual (só /budget/[id] tem). */
function useLocalSearchParams<T>(): T {
    const path = useCurrentPath();
    const [, segment, id] = path.split("/");
    return (segment === "budget" ? { id: decodeURIComponent(id) } : {}) as T;
}

/** Na tela montada, o foco equivale a montar (navegar desmonta a tela anterior). */
function useFocusEffect(effect: () => void | (() => void)) {
    useEffect(() => effect(), [effect]);
}

export const fakeNav = {
    reset: (path = "/") => setStack([path]),
    path: currentPath,
    go: (href: Href) => router.push(href),
};

export const fakeRouterModule = {
    Stack,
    Tabs,
    router,
    useRouter: () => router,
    useLocalSearchParams,
    useFocusEffect,
};

