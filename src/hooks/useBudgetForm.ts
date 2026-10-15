import { useState } from "react";
import { Budget, BudgetDraft } from "../services/budgetService";
import { saveBudget } from "../services/budgetStorage";
import { formatCurrency, formatMoney, formatPhone, formatPlate, parseCurrency, parseQuantity } from "../utils/formatters";
import { friendlyError } from "../utils/errors";
import { getMissingFields } from "../utils/validators";

type ServiceField = "description" | "quantity" | "price";

const DAY_MS = 24 * 60 * 60 * 1000;

const emptyService = () => ({ description: "", quantity: "1", price: "" });

const toServiceFields = (budget?: Budget) =>
  budget
    ? budget.services.map((s) => ({
        description: s.description,
        quantity: String(s.quantity).replace(".", ","),
        price: formatMoney(s.price),
      }))
    : [emptyService()];

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
  const [name, setName] = useState(initial?.client.name ?? "");
  const [phone, setPhone] = useState(initial?.client.phone ?? "");
  const [address, setAddress] = useState(initial?.client.address ?? "");

  const [brand, setBrand] = useState(initial?.vehicle.brand ?? "");
  const [model, setModel] = useState(initial?.vehicle.model ?? "");
  const [licensePlate, setLicensePlate] = useState(formatPlate(initial?.vehicle.licensePlate ?? ""));
  const [color, setColor] = useState(initial?.vehicle.color ?? "");
  const [year, setYear] = useState(initial ? String(initial.vehicle.year) : "");

  const [services, setServices] = useState(() => toServiceFields(initial));

  const [date, setDate] = useState(() => (initial ? new Date(initial.date) : new Date()));
  const [validityDays, setValidityDays] = useState<number | null>(() => toValidityDays(initial));

  // Depois da primeira tentativa de salvar, os campos inválidos ficam destacados (e somem conforme são corrigidos).
  const [submitted, setSubmitted] = useState(false);
  const [showMissingDialog, setShowMissingDialog] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const missingFields = getMissingFields(name, phone, brand, model, licensePlate, year, services);
  const errorFor = (key: string): string | undefined =>
    submitted ? missingFields.find((f) => f.key === key)?.message : undefined;

  const total = services.reduce((sum, s) => sum + parseQuantity(s.quantity) * parseCurrency(s.price), 0);

  const updateService = (index: number, field: ServiceField, value: string) => {
    setServices((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: field === "price" ? formatCurrency(value) : value } : s))
    );
  };

  const addService = () => {
    setServices((prev) => [...prev, emptyService()]);
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
    setSubmitted(false);
  };

  const buildDraft = (): BudgetDraft => {
    const expiresAt = validityDays === null ? null : new Date(date.getTime() + validityDays * DAY_MS);
    return {
      id: initial?.id,
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
