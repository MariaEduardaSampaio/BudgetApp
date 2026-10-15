import { BudgetRow, rowToBudget } from "./budgetMapper";
import type { Budget, BudgetDraft } from "./budgetService";
import { supabase } from "./supabase";

// Orçamentos ficam no Supabase. A RLS do banco garante que cada usuário
// só enxerga os orçamentos da oficina dele, então não filtramos por oficina aqui.

const BUDGET_WITH_ITEMS = "*, budget_items(*)";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Lista os orçamentos da oficina, do mais recente (maior número) para o mais antigo. */
export const listBudgets = async (): Promise<Budget[]> => {
    const { data, error } = await supabase
        .from("budgets")
        .select(BUDGET_WITH_ITEMS)
        .order("number", { ascending: false });
    if (error) throw error;
    return (data as BudgetRow[]).map(rowToBudget);
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
