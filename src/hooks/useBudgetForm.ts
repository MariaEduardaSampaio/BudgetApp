import { useEffect, useState } from "react";
import { Budget, BudgetDraft } from "../services/budgetService";
import { saveBudget } from "../services/budgetStorage";
import { formatCurrency, formatMoney, formatPhone, formatPlate, formatQuantity, parseCurrency, parseQuantity } from "../utils/formatters";
import { friendlyError } from "../utils/errors";
import { getMissingFields, ServiceItem } from "../utils/validators";

type ServiceField = "description" | "quantity" | "price";

const DAY_MS = 24 * 60 * 60 * 1000;

const formatServiceField = (field: ServiceField, value: string) => {
  if (field === "price") return formatCurrency(value);
  if (field === "quantity") return formatQuantity(value);
  return value;
};

const emptyService = () => ({ description: "", quantity: "1", price: "" });

/** Mesmo limite da função save_budget no banco. */
export const MAX_SERVICES = 100;

const toServiceFields = (budget?: Budget): ServiceItem[] =>
  budget
    ? budget.services.map((s) => ({
        description: s.description,
        quantity: String(s.quantity).replace(".", ","),
        price: formatMoney(s.price),
      }))
    : [emptyService()];

/** O que já foi digitado num orçamento novo. */
interface UnsavedBudget {
  name: string; phone: string; address: string;
  brand: string; model: string; licensePlate: string; color: string; year: string;
  services: ServiceItem[];
  date: Date;
  validityDays: number | null;
  /** Já foi salvo, mas a tela não recebeu a confirmação: salvar de novo atualiza em vez de duplicar. */
  savedId?: string;
}

// Orçamento novo ainda não terminado, guardado em memória para não se perder se a tela for desmontada
// (ex.: a sessão expirou e foi preciso entrar de novo). Some ao começar um novo orçamento ou ao sair da conta.
let unsavedNewBudget: UnsavedBudget | null = null;

/** Descarta o orçamento novo que estava sendo digitado (ao sair da conta). */
export const clearUnsavedBudget = () => {
  unsavedNewBudget = null;
};

const toValidityDays = (budget?: Budget): number | null => {
  if (!budget) return 15;
  if (!budget.expiresAt) return null;
  return Math.round((new Date(budget.expiresAt).getTime() - new Date(budget.date).getTime()) / DAY_MS);
};

/**
 * Estado do formulário de orçamento.
 * Sem `initial`, cria um orçamento novo; com `initial`, edita aquele orçamento (o banco mantém número e data de criação).
 */
export const useBudgetForm = (initial?: Budget) => {
  // Orçamento novo: continua de onde parou, se a tela tinha sido desmontada no meio.
  const [unsaved] = useState(() => (initial ? null : unsavedNewBudget));

  const [name, setName] = useState(initial?.client.name ?? unsaved?.name ?? "");
  const [phone, setPhone] = useState(initial?.client.phone ?? unsaved?.phone ?? "");
  const [address, setAddress] = useState(initial?.client.address ?? unsaved?.address ?? "");

  const [brand, setBrand] = useState(initial?.vehicle.brand ?? unsaved?.brand ?? "");
  const [model, setModel] = useState(initial?.vehicle.model ?? unsaved?.model ?? "");
  const [licensePlate, setLicensePlate] = useState(unsaved?.licensePlate ?? formatPlate(initial?.vehicle.licensePlate ?? ""));
  const [color, setColor] = useState(initial?.vehicle.color ?? unsaved?.color ?? "");
  const [year, setYear] = useState(initial ? String(initial.vehicle.year) : unsaved?.year ?? "");

  const [services, setServices] = useState(() => unsaved?.services ?? toServiceFields(initial));

  const [date, setDate] = useState(() => unsaved?.date ?? (initial ? new Date(initial.date) : new Date()));
  const [validityDays, setValidityDays] = useState<number | null>(() => (unsaved ? unsaved.validityDays : toValidityDays(initial)));

  const [savedId, setSavedId] = useState(initial?.id ?? unsaved?.savedId);

  useEffect(() => {
    if (initial) return;
    unsavedNewBudget = { name, phone, address, brand, model, licensePlate, color, year, services, date, validityDays, savedId };
  });

  // Depois da primeira tentativa de salvar, os campos inválidos ficam destacados (e somem conforme são corrigidos).
  const [submitted, setSubmitted] = useState(false);
  const [showMissingDialog, setShowMissingDialog] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const missingFields = getMissingFields({ name, phone, brand, model, licensePlate, year, services });
  const errorFor = (key: string): string | undefined =>
    submitted ? missingFields.find((f) => f.key === key)?.message : undefined;

  const total = services.reduce((sum, s) => sum + parseQuantity(s.quantity) * parseCurrency(s.price), 0);

  const updateService = (index: number, field: ServiceField, value: string) => {
    setServices((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: formatServiceField(field, value) } : s))
    );
  };

  const addService = () => {
    setServices((prev) => (prev.length >= MAX_SERVICES ? prev : [...prev, emptyService()]));
  };

  const removeService = (index: number) => {
    setServices((prev) => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setName(""); setPhone(""); setAddress("");
    setBrand(""); setModel(""); setLicensePlate(""); setColor(""); setYear("");
    setServices([emptyService()]);
    setDate(new Date());
    setValidityDays(15);
    setSavedId(initial?.id);
    setSubmitted(false);
  };

  const buildDraft = (): BudgetDraft => {
    const expiresAt = validityDays === null ? null : new Date(date.getTime() + validityDays * DAY_MS);
    return {
      id: savedId,
      client: { name: name.trim(), phone, address: address.trim() },
      vehicle: { brand: brand.trim(), model: model.trim(), licensePlate, color: color.trim(), year: parseInt(year, 10) },
      services: services.map((s) => ({
        description: s.description.trim(),
        quantity: parseQuantity(s.quantity),
        price: parseCurrency(s.price),
      })),
      date: date.toISOString(),
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
    };
  };

  /** Valida e salva no Supabase. Devolve o orçamento salvo (já numerado), ou null se faltar algo / der erro. */
  const submit = async (): Promise<Budget | null> => {
    setSubmitted(true);
    if (missingFields.length > 0) {
      setShowMissingDialog(true);
      return null;
    }

    setIsSaving(true);
    try {
      return await saveBudget(buildDraft());
    } catch (error) {
      // Salvou, mas a resposta não chegou: a próxima tentativa atualiza o mesmo orçamento.
      const { savedId: alreadySaved } = (error ?? {}) as { savedId?: string };
      if (alreadySaved) setSavedId(alreadySaved);
      setSaveError(friendlyError(error, "Não foi possível salvar o orçamento. Tente novamente."));
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    name, phone, address,
    brand, model, licensePlate, color, year,
    services, date, validityDays, total,

    setName, setPhone: (v: string) => setPhone(formatPhone(v)),
    setAddress,
    setBrand,
    setModel,
    setLicensePlate: (v: string) => setLicensePlate(formatPlate(v)),
    setColor,
    setYear: (v: string) => setYear(v.replace(/\D/g, "").slice(0, 4)),
    setDate,
    setValidityDays,

    updateService,
    addService,
    removeService,

    errorFor,
    missingFields,
    showMissingDialog,
    closeMissingDialog: () => setShowMissingDialog(false),

    isSaving,
    saveError,
    clearSaveError: () => setSaveError(null),
    submit,
    resetForm,
  };
};

export type BudgetForm = ReturnType<typeof useBudgetForm>;
