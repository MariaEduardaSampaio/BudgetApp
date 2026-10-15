import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Budget } from "./budgetService";

const STORAGE_KEY = "budgets:v1";

/** Lista os orçamentos salvos, do mais recente para o mais antigo. */
export const listBudgets = async (): Promise<Budget[]> => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
};

export const saveBudget = async (budget: Budget): Promise<void> => {
    const budgets = await listBudgets();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([budget, ...budgets.filter((b) => b.id !== budget.id)]));
};

export const deleteBudget = async (id: string): Promise<void> => {
    const budgets = await listBudgets();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(budgets.filter((b) => b.id !== id)));
};
