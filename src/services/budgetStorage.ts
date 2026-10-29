import { buildBudgetSearchFilter } from "../utils/budgetSearch";
import { BudgetRow, rowToBudget } from "./budgetMapper";
import type { Budget, BudgetDraft } from "./budgetService";
import { supabase } from "./supabase";

// Orçamentos ficam no Supabase. A RLS do banco garante que cada usuário
// só enxerga os orçamentos da oficina dele, então não filtramos por oficina aqui.
// Gravação só pela função save_budget (o banco não aceita insert/update direto).

// Só as colunas que o app usa (sem workshop_id/created_by).
const BUDGET_WITH_ITEMS = `
    id, number, client_name, client_phone, client_address,
    vehicle_brand, vehicle_model, vehicle_plate, vehicle_color, vehicle_year,
    budget_date, expires_at, created_at, updated_at,
    budget_items (position, description, quantity, unit_price)
`;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Opções de "orçamentos por página" no Histórico. */
export const PAGE_SIZES = [1, 5, 10, 20] as const;
export const DEFAULT_PAGE_SIZE = 10;

interface BudgetPage {
    budgets: Budget[];
    /** Quantos orçamentos existem no total (com a busca aplicada). */
    total: number;
    /** A página devolvida: pode ser menor que a pedida, se a pedida deixou de existir. */
    page: number;
}

/** Linhas de `from` a `to` (contando do 0), do mais recente (maior número) para o mais antigo, com o total. */
const queryRange = (search: string, from: number, to: number) => {
    let query = supabase
        .from("budgets")
        .select(BUDGET_WITH_ITEMS, { count: "exact" })
        .order("number", { ascending: false })
        .range(from, to);
    const filter = buildBudgetSearchFilter(search);
    if (filter) query = query.or(filter);
    return query;
};

/**
 * Uma página do Histórico (a 1 é a dos mais recentes) e o total de orçamentos.
 * A busca (nome, modelo, placa ou número) acontece no banco.
 */
export const listBudgets = async ({
    search = "",
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
}: { search?: string; page?: number; pageSize?: number } = {}): Promise<BudgetPage> => {
    const from = (page - 1) * pageSize;
    const { data, count, error } = await queryRange(search, from, from + pageSize - 1);

    // A página deixou de existir (ex.: excluíram o único orçamento dela): o banco responde PGRST103.
    // Descobre o total e volta para a última página que existe.
    if (error?.code === "PGRST103" && page > 1) {
        const { count: total, error: countError } = await queryRange(search, 0, 0);
        if (countError) throw countError;
        const lastPage = Math.max(1, Math.ceil((total ?? 0) / pageSize));
        // Sempre uma página antes da pedida, para não ficar tentando para sempre se alguém criar orçamentos no meio.
        return listBudgets({ search, pageSize, page: Math.min(lastPage, page - 1) });
    }
    if (error) throw error;

    return { budgets: (data as unknown as BudgetRow[]).map(rowToBudget), total: count ?? 0, page };
};

export const getBudget = async (id: string): Promise<Budget | null> => {
    // Links antigos (de antes do Supabase) têm ids em outro formato: tratamos como não encontrado.
    if (!UUID.test(id)) return null;

    const { data, error } = await supabase.from("budgets").select(BUDGET_WITH_ITEMS).eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? rowToBudget(data as BudgetRow) : null;
};

/**
 * O orçamento foi salvo, mas não deu para carregá-lo de volta (ex.: a internet caiu entre as duas chamadas).
 * Traz o id salvo para quem tentar de novo atualizar esse orçamento em vez de criar outro igual.
 * A mensagem é a do erro original, para a tela mostrar o aviso certo (ex.: sem conexão).
 */
class BudgetSavedButNotLoadedError extends Error {
    constructor(readonly savedId: string, cause?: { message?: string; code?: string }) {
        super(cause?.message ?? "Orçamento salvo, mas não foi possível carregá-lo.");
        this.name = "BudgetSavedButNotLoadedError";
    }
}

/**
 * Cria (sem id) ou atualiza (com id) um orçamento e seus itens numa única transação
 * — ver a função save_budget no SQL. Devolve o orçamento como ficou salvo, já com número.
 */
export const saveBudget = async (draft: BudgetDraft): Promise<Budget> => {
    const { data, error } = await supabase.rpc("save_budget", { budget: draft });
    if (error) throw error;
    const id = data as string;

    let saved: Budget | null;
    try {
        saved = await getBudget(id);
    } catch (e) {
        throw new BudgetSavedButNotLoadedError(id, e as { message?: string });
    }
    if (!saved) throw new BudgetSavedButNotLoadedError(id);
    return saved;
};

export const deleteBudget = async (id: string): Promise<void> => {
    const { error } = await supabase.from("budgets").delete().eq("id", id);
    if (error) throw error;
};
