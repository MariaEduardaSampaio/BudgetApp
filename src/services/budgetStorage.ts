import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Budget } from "./budgetService";

const STORAGE_KEY = "budgets:v1";

/** Lista os orçamentos salvos, do mais recente para o mais antigo. */
export const listBudgets = async (): Promise<Budget[]> => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
};

export const getBudget = async (id: string): Promise<Budget | null> => {
    const budgets = await listBudgets();
    return budgets.find((b) => b.id === id) ?? null;
};

/** Salva um orçamento novo (no topo da lista) ou atualiza um existente (na mesma posição). */
export const saveBudget = async (budget: Budget): Promise<void> => {
    const budgets = await listBudgets();
    const exists = budgets.some((b) => b.id === budget.id);
    const updated = exists ? budgets.map((b) => (b.id === budget.id ? budget : b)) : [budget, ...budgets];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const deleteBudget = async (id: string): Promise<void> => {
    const budgets = await listBudgets();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(budgets.filter((b) => b.id !== id)));
};
