import type { BudgetRow } from "../services/budgetMapper";
import type { BudgetDraft } from "../services/budgetService";

/**
 * Supabase falso, em memória, para os testes de fluxo: substitui o módulo src/services/supabase.ts.
 * Imita só o que o app usa (budgetStorage e useAuth), com as mesmas regras do banco:
 * cada usuário só vê a própria oficina (RLS), numeração por oficina e a validação da save_budget.
 * Nenhuma chamada sai da memória — o Supabase de verdade é produção.
 *
 * Uso: jest.mock("<caminho>/services/supabase", () => jest.requireActual("<caminho>/test-utils/fakeSupabase").fakeSupabaseModule);
 */

export type FakeUser = "pai" | "irmao" | "outraOficina" | "semOficina";
type Workshop = "alocar" | "outra";

export const FAKE_USERS: Record<FakeUser, { email: string; password: string; workshop: Workshop | null }> = {
    pai: { email: "pai@teste.com", password: "senha-do-pai", workshop: "alocar" },
    irmao: { email: "irmao@teste.com", password: "senha-do-irmao", workshop: "alocar" },
    outraOficina: { email: "outra@teste.com", password: "senha-da-outra", workshop: "outra" },
    semOficina: { email: "sem@teste.com", password: "senha-sem", workshop: null },
};

interface StoredRow extends BudgetRow {
    workshop: Workshop;
    created_by: FakeUser;
}

type Result = { data: any; error: { message: string; code?: string } | null };
type AuthListener = (event: string, session: ReturnType<typeof sessionOf>) => void;

// Mesma regra da coluna vehicle_plate no banco.
const PLATE = /^[A-Z]{3}(-[0-9]{4}|[0-9][A-Z][0-9]{2})$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Limites de tamanho das migrations (security_hardening).
const MAX_LENGTH = { client_name: 120, client_phone: 20, client_address: 200, vehicle_brand: 60, vehicle_model: 60, vehicle_color: 40 } as const;
/** numeric(10,2) / numeric(12,2): o banco guarda com 2 casas. */
const round2 = (value: number) => Math.round(value * 100) / 100;
const FAILURES = {
    network: { message: "TypeError: Failed to fetch" },
    jwt: { message: "JWT expired" },
};

const state = {
    rows: [] as StoredRow[],
    lastNumber: { alocar: 0, outra: 0 } as Record<Workshop, number>,
    user: null as FakeUser | null,
    /** Fila por chamada: null = a chamada passa, senão falha com esse tipo. */
    failures: [] as (keyof typeof FAILURES | null)[],
    delayMs: 0,
    listeners: new Set<AuthListener>(),
    nextId: 1,
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const userId = (user: FakeUser) => `00000000-0000-4000-8000-${String(Object.keys(FAKE_USERS).indexOf(user) + 1).padStart(12, "0")}`;
const sessionOf = (user: FakeUser | null) =>
    user ? { access_token: "token-falso", user: { id: userId(user), email: FAKE_USERS[user].email } } : null;
const emit = (event: string) => state.listeners.forEach((listener) => listener(event, sessionOf(state.user)));

/** Consome a vez desta chamada na fila do fakeDb.failNext: falha ou passa. */
const takeFailure = () => {
    const kind = state.failures.shift();
    return kind ? { data: null, error: FAILURES[kind] } : null;
};

const currentWorkshop = () => (state.user ? FAKE_USERS[state.user].workshop : null);
/** RLS: só as linhas da oficina de quem está logado. */
const visibleRows = () => state.rows.filter((row) => row.workshop === currentWorkshop());
const toApiRow = ({ workshop, created_by, ...row }: StoredRow): BudgetRow => clone(row);

/** Interpreta o filtro do .or() no formato do PostgREST: "col.ilike.*termo*,col.eq.7". */
const parseOrFilter = (filter: string) => {
    const conditions = filter.split(",").map((part) => {
        const [column, operator, ...rest] = part.split(".");
        const value = rest.join(".");
        if (operator === "ilike") {
            // Como o ILIKE do Postgres: ignora maiúsculas/minúsculas, mas não acentos.
            const source = value.split(/[*%]/).map((piece) => piece.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*");
            const pattern = new RegExp(`^${source}$`, "iu");
            return (row: any) => pattern.test(String(row[column] ?? ""));
        }
        if (operator === "eq") return (row: any) => String(row[column]) === value;
        throw new Error(`Filtro não suportado pelo Supabase falso: ${part}`);
    });
    return (row: any) => conditions.some((matches) => matches(row));
};

class BudgetQuery implements PromiseLike<Result> {
    private filters: ((row: StoredRow) => boolean)[] = [];
    private ascending: boolean | null = null;
    private bounds: [number, number] | null = null;
    private single = false;
    private deleting = false;

    select(_columns?: string) { return this; }
    order(_column: "number", { ascending = true } = {}) { this.ascending = ascending; return this; }
    range(from: number, to: number) { this.bounds = [from, to]; return this; }
    limit(count: number) { this.bounds = [0, count - 1]; return this; }
    or(filter: string) { this.filters.push(parseOrFilter(filter)); return this; }
    lt(column: string, value: number) { this.filters.push((row: any) => Number(row[column]) < value); return this; }
    eq(column: string, value: unknown) { this.filters.push((row: any) => String(row[column]) === String(value)); return this; }
    maybeSingle() { this.single = true; return this; }
    delete() { this.deleting = true; return this; }

    then<A = Result, B = never>(onFulfilled?: ((value: Result) => A | PromiseLike<A>) | null, onRejected?: ((reason: any) => B | PromiseLike<B>) | null) {
        return this.run().then(onFulfilled, onRejected);
    }

    private async run(): Promise<Result> {
        const delay = state.delayMs;
        state.delayMs = 0;
        if (delay) await new Promise((resolve) => setTimeout(resolve, delay));

        const failure = takeFailure();
        if (failure) return failure;

        let rows = visibleRows().filter((row) => this.filters.every((matches) => matches(row)));

        if (this.deleting) {
            state.rows = state.rows.filter((row) => !rows.includes(row));
            return { data: null, error: null };
        }
        if (this.ascending !== null) rows = [...rows].sort((a, b) => (this.ascending ? a.number - b.number : b.number - a.number));
        if (this.bounds) rows = rows.slice(this.bounds[0], this.bounds[1] + 1);
        if (this.single) return { data: rows[0] ? toApiRow(rows[0]) : null, error: null };
        return { data: rows.map(toApiRow), error: null };
    }
}

const raise = (message: string, code = "P0001"): Result => ({ data: null, error: { message, code } });

/** Mesmas regras da função save_budget (supabase/migrations). */
const saveBudget = (budget: BudgetDraft): Result => {
    if (!state.user) return raise("Faça login para salvar orçamentos.");
    const items = budget.services ?? [];
    if (items.length === 0) return raise("O orçamento precisa ter pelo menos um item.");
    if (items.length > 100) return raise("O orçamento pode ter no máximo 100 itens.");

    const { client, vehicle } = budget;
    const check = (rule: string) => raise(`new row violates check constraint "${rule}"`, "23514");
    // Conversões do SQL ((...)::integer, ::uuid) falham com 22P02 antes das regras.
    const year = String(vehicle.year ?? "").trim();
    if (!/^-?[0-9]+$/.test(year)) return raise(`invalid input syntax for type integer: "${year}"`, "22P02");
    if (budget.id && !UUID.test(budget.id)) return raise(`invalid input syntax for type uuid: "${budget.id}"`, "22P02");

    if (!PLATE.test(vehicle.licensePlate)) return check("budgets_vehicle_plate_check");
    if (![client.name, vehicle.brand, vehicle.model].every((text) => text?.trim())) return check("budgets_not_empty");
    if (Number(year) < 1900 || Number(year) > 2100) return check("budgets_vehicle_year_check");

    const now = new Date().toISOString();
    const fields = {
        client_name: client.name,
        client_phone: client.phone,
        client_address: client.address || null,
        vehicle_brand: vehicle.brand,
        vehicle_model: vehicle.model,
        vehicle_plate: vehicle.licensePlate,
        vehicle_color: vehicle.color || null,
        vehicle_year: Number(year),
        budget_date: budget.date,
        expires_at: budget.expiresAt ?? null,
        budget_items: items.map((item, position) => ({
            position,
            description: item.description,
            quantity: round2(Number(item.quantity)),
            unit_price: round2(Number(item.price)),
        })),
    };
    for (const [column, max] of Object.entries(MAX_LENGTH)) {
        if (String(fields[column as keyof typeof MAX_LENGTH] ?? "").length > max) return check(`budgets_${column}_length`);
    }
    for (const item of fields.budget_items) {
        if (!item.description?.trim() || item.description.length > 500) return check("budget_items_description_check");
        if (!(item.quantity > 0)) return check("budget_items_quantity_check");
        if (!(item.unit_price >= 0)) return check("budget_items_unit_price_check");
    }

    if (budget.id) {
        const row = visibleRows().find((r) => r.id === budget.id);
        if (!row) return raise("Orçamento não encontrado.");
        Object.assign(row, fields, { updated_at: now });
        return { data: row.id, error: null };
    }

    const workshop = currentWorkshop();
    if (!workshop) return raise("Seu usuário ainda não está vinculado a uma oficina.");

    const row: StoredRow = {
        ...fields,
        id: `00000000-0000-4000-a000-${String(state.nextId++).padStart(12, "0")}`,
        number: ++state.lastNumber[workshop],
        created_at: now,
        updated_at: null,
        workshop,
        created_by: state.user,
    };
    state.rows.push(row);
    return { data: row.id, error: null };
};

const supabase = {
    from(table: "budgets") {
        if (table !== "budgets") throw new Error(`Tabela não suportada pelo Supabase falso: ${table}`);
        return new BudgetQuery();
    },
    async rpc(fn: "save_budget", args: { budget: BudgetDraft }): Promise<Result> {
        if (fn !== "save_budget") throw new Error(`Função não suportada pelo Supabase falso: ${fn}`);
        return takeFailure() ?? saveBudget(clone(args.budget));
    },
    auth: {
        async getSession() {
            return { data: { session: sessionOf(state.user) }, error: null };
        },
        onAuthStateChange(listener: AuthListener) {
            state.listeners.add(listener);
            return { data: { subscription: { unsubscribe: () => state.listeners.delete(listener) } } };
        },
        async signInWithPassword({ email, password }: { email: string; password: string }) {
            const failure = takeFailure();
            if (failure) return { data: { user: null, session: null }, error: failure.error };
            const user = (Object.keys(FAKE_USERS) as FakeUser[]).find((u) => FAKE_USERS[u].email === email && FAKE_USERS[u].password === password);
            if (!user) return { data: { user: null, session: null }, error: { message: "Invalid login credentials", code: "invalid_credentials" } };
            fakeDb.loginAs(user);
            return { data: { user: sessionOf(user)!.user, session: sessionOf(user) }, error: null };
        },
        async signOut() {
            const failure = takeFailure();
            if (failure) return { error: failure.error };
            fakeDb.loginAs(null);
            return { error: null };
        },
        async resetPasswordForEmail(_email: string, _options?: unknown) {
            return takeFailure() ?? { data: {}, error: null };
        },
        async updateUser(_attributes: { password: string }) {
            return takeFailure() ?? { data: { user: sessionOf(state.user)?.user ?? null }, error: null };
        },
    },
};

export const fakeDb = {
    /** Apaga orçamentos, numeração, sessão, falhas e atrasos. Chamar no beforeEach. */
    reset() {
        state.rows = [];
        state.lastNumber = { alocar: 0, outra: 0 };
        state.user = null;
        state.failures = [];
        state.delayMs = 0;
        state.listeners.clear();
        state.nextId = 1;
    },
    /** Troca quem está logado e avisa o app (como o Supabase faz ao entrar/sair). */
    loginAs(user: FakeUser | null) {
        state.user = user;
        emit(user ? "SIGNED_IN" : "SIGNED_OUT");
    },
    currentUser: () => state.user,
    /** Salva os orçamentos em ordem como `user` (sem trocar quem está logado). Devolve os ids. */
    async seed(user: FakeUser, drafts: BudgetDraft[]): Promise<string[]> {
        const previous = state.user;
        state.user = user;
        try {
            return drafts.map((draft) => {
                const { data, error } = saveBudget(clone(draft));
                if (error) throw new Error(error.message);
                return data as string;
            });
        } finally {
            state.user = previous;
        }
    },
    /** Linhas de uma oficina, sem passar pela RLS (para conferir o "banco"). */
    rows: (workshop: Workshop): BudgetRow[] => state.rows.filter((row) => row.workshop === workshop).map(toApiRow),
    /**
     * Depois de deixar passar `after` chamadas, as `times` seguintes falham (sem internet ou sessão expirada).
     * Ex.: failNext("network", 1, 1) — salvar funciona, mas recarregar o orçamento salvo falha.
     */
    failNext(kind: keyof typeof FAILURES, times = 1, after = 0) {
        for (let i = 0; i < after; i++) state.failures.push(null);
        for (let i = 0; i < times; i++) state.failures.push(kind);
    },
    /** Atrasa a próxima consulta de from() (para simular respostas fora de ordem). */
    delayNext(ms: number) {
        state.delayMs = ms;
    },
};

export const fakeSupabaseModule = {
    supabase,
    isSupabaseConfigured: true,
    initialAuthRedirect: { isRecovery: false, errorCode: null },
    passwordResetRedirectUrl: () => "http://localhost/reset-password",
};
