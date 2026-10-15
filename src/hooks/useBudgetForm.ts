import { useState } from "react";
import { Budget } from "../services/budgetService";
import { saveBudget } from "../services/budgetStorage";
import { formatCurrency, formatPhone, formatPlate, parseCurrency, parseQuantity } from "../utils/formatters";
import { getMissingFields } from "../utils/validators";

type ServiceField = "description" | "quantity" | "price";

const emptyService = () => ({ description: "", quantity: "1", price: "" });

export const useBudgetForm = () => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [color, setColor] = useState("");
  const [year, setYear] = useState("");

  const [services, setServices] = useState([emptyService()]);

  const [date, setDate] = useState(new Date());
  const [validityDays, setValidityDays] = useState<number | null>(15);

  // Depois da primeira tentativa de gerar, os campos inválidos ficam destacados (e somem conforme são corrigidos).
  const [submitted, setSubmitted] = useState(false);
  const [showMissingDialog, setShowMissingDialog] = useState(false);
  const [generatedBudget, setGeneratedBudget] = useState<Budget | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const missingFields = getMissingFields(name, phone, brand, model, licensePlate, year, services);
  const errorKeys = new Set(submitted ? missingFields.map((f) => f.key) : []);
  const hasError = (key: string) => errorKeys.has(key);

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
    setGeneratedBudget(null);
  };

  const buildBudget = (): Budget => {
    const expiresAt = validityDays === null ? null : new Date(date.getTime() + validityDays * 24 * 60 * 60 * 1000);
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
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

  /** Valida, salva no histórico e abre o diálogo com as opções de compartilhar/baixar. */
  const generateBudget = async () => {
    setSubmitted(true);
    if (missingFields.length > 0) {
      setShowMissingDialog(true);
      return;
    }

    setIsSaving(true);
    try {
      const budget = buildBudget();
      await saveBudget(budget);
      setGeneratedBudget(budget);
    } catch (error: any) {
      setSaveError(error?.message ?? "Não foi possível salvar o orçamento.");
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

    hasError,
    missingFields,
    showMissingDialog,
    closeMissingDialog: () => setShowMissingDialog(false),

    isSaving,
    saveError,
    clearSaveError: () => setSaveError(null),
    generatedBudget,
    closeGeneratedBudget: () => setGeneratedBudget(null),
    generateBudget,
    resetForm,
  };
};
