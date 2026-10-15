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

export const PAGE_SIZE = 30;

export interface BudgetPage {
    budgets: Budget[];
    hasMore: boolean;
}

/**
 * Uma página do Histórico, do mais recente (maior número) para o mais antigo.
 * A busca (nome, modelo, placa ou número) acontece no banco.
 */
export const listBudgets = async ({ search = "", offset = 0 } = {}): Promise<BudgetPage> => {
    // Pede um a mais só para saber se existe uma próxima página.
    let query = supabase
        .from("budgets")
        .select(BUDGET_WITH_ITEMS)
        .order("number", { ascending: false })
        .range(offset, offset + PAGE_SIZE);

    const filter = buildBudgetSearchFilter(search);
    if (filter) query = query.or(filter);

    const { data, error } = await query;
    if (error) throw error;

    const rows = data as unknown as BudgetRow[];
    return { budgets: rows.slice(0, PAGE_SIZE).map(rowToBudget), hasMore: rows.length > PAGE_SIZE };
};

export const getBudget = async (id: string): Promise<Budget | null> => {
    // Links antigos (de antes do Supabase) têm ids em outro formato: tratamos como não encontrado.
    if (!UUID.test(id)) return null;

    const { data, error } = await supabase.from("budgets").select(BUDGET_WITH_ITEMS).eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? rowToBudget(data as BudgetRow) : null;
};

/**
 * Cria (sem id) ou atualiza (com id) um orçamento e seus itens numa única transação
 * — ver a função save_budget no SQL. Devolve o orçamento como ficou salvo, já com número.
 */
export const saveBudget = async (draft: BudgetDraft): Promise<Budget> => {
    const { data: id, error } = await supabase.rpc("save_budget", { budget: draft });
    if (error) throw error;

    const saved = await getBudget(id as string);
    if (!saved) throw new Error("Orçamento salvo, mas não foi possível carregá-lo.");
    return saved;
};

export const deleteBudget = async (id: string): Promise<void> => {
    const { error } = await supabase.from("budgets").delete().eq("id", id);
    if (error) throw error;
};
