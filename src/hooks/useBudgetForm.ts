import { useState } from "react";
import { Alert } from "react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { generateBudgetPdf } from "../services/budgetService";
import { formatCurrency, formatPhone, formatPlate } from "../utils/formatters";
import { validateFields } from "../utils/validators";

export const useBudgetForm = () => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [color, setColor] = useState("");
  const [year, setYear] = useState("");

  const [services, setServices] = useState([{ description: "", quantity: "", price: "" }]);

  const [date, setDate] = useState(new Date());
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);

  const updateService = (index: number, field: "description" | "quantity" | "price", value: string) => {
    const updated = [...services];
    updated[index][field] = field === "price" ? formatCurrency(value) : value;
    setServices(updated);
  };

  const addService = () => {
    setServices([...services, { description: "", quantity: "", price: "" }]);
  };

  const removeService = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
  };

  const generatePdf = async () => {
    if (!validateFields(name, phone, brand, model, licensePlate, year, services)) return;

    try {
      const payload = {
        client: { name, phone, address },
        vehicle: { brand, model, licensePlate, color, year: parseInt(year) },
        services: services.map((s) => ({
          description: s.description,
          quantity: parseInt(s.quantity),
          price: parseFloat(s.price.replace(/[R$\s.]/g, "").replace(",", ".")),
        })),
        date,
        expiresAt,
      };

      const pdfBytes = await generateBudgetPdf(payload);

      const fileUri = FileSystem.documentDirectory + "orcamento.pdf";
      await FileSystem.writeAsStringAsync(fileUri, Buffer.from(pdfBytes).toString("base64"), {
        encoding: FileSystem.EncodingType.Base64,
      });

      await Sharing.shareAsync(fileUri);
    } catch (error: any) {
      Alert.alert("Erro", error.message);
    }
  };

  return {
    name, phone, address,
    brand, model, licensePlate, color, year,
    services, date, expiresAt,

    setName, setPhone: (v: string) => setPhone(formatPhone(v)),
    setAddress,
    setBrand,
    setModel,
    setLicensePlate: (v: string) => setLicensePlate(formatPlate(v)),
    setColor,
    setYear,
    setDate,
    setExpiresAt,

    updateService,
    addService,
    removeService,

    generatePdf
  };
};
