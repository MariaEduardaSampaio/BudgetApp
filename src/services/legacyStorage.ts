import AsyncStorage from "@react-native-async-storage/async-storage";
import { formatPlate } from "../utils/formatters";
import type { BudgetDraft } from "./budgetService";
import { saveBudget } from "./budgetStorage";

// Antes do Supabase, os orçamentos ficavam só no navegador (localStorage, chave "budgets:v1").
// Este módulo lê esses orçamentos antigos e os envia para a nuvem.

const LEGACY_KEY = "budgets:v1";

/** Formato salvo pela versão antiga (sem número; id gerado no aparelho). */
export interface LegacyBudget extends Omit<BudgetDraft, "id" | "createdAt"> {
    id: string;
    createdAt: string;
}

export const readLegacyBudgets = async (): Promise<LegacyBudget[]> => {
    try {
        const raw = await AsyncStorage.getItem(LEGACY_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

const writeLegacyBudgets = async (budgets: LegacyBudget[]) => {
    if (budgets.length === 0) await AsyncStorage.removeItem(LEGACY_KEY);
    else await AsyncStorage.setItem(LEGACY_KEY, JSON.stringify(budgets));
};

const toDraft = ({ id: _localId, ...budget }: LegacyBudget): BudgetDraft => ({
    ...budget,
    // A versão antiga salvava placas Mercosul como "ABC-1D23"; o banco só aceita "ABC1D23".
    vehicle: { ...budget.vehicle, licensePlate: formatPlate(budget.vehicle.licensePlate) },
});

/**
 * Envia os orçamentos antigos para o Supabase, do mais antigo para o mais novo
 * (assim a numeração segue a ordem em que foram feitos).
 * Cada orçamento enviado sai do aparelho na hora: se a internet cair no meio,
 * tentar de novo continua de onde parou, sem duplicar.
 */
export const importLegacyBudgets = async (): Promise<number> => {
    // A lista antiga guarda o mais recente primeiro.
    const pending = (await readLegacyBudgets()).reverse();
    let imported = 0;

    while (pending.length > 0) {
        await saveBudget(toDraft(pending[0]));
        pending.shift();
        imported++;
        await writeLegacyBudgets([...pending].reverse());
    }

    return imported;
};
