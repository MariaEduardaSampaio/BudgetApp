import { Ionicons } from "@expo/vector-icons";
import { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { COLORS } from "../constants/theme";
import type { BudgetForm } from "../hooks/useBudgetForm";
import { formatMoney } from "../utils/formatters";
import ClientForm from "./ClientForm";
import DatesForm from "./DatesForm";
import ServicesList from "./ServicesList";
import VehicleForm from "./VehicleForm";
import AppDialog from "./ui/AppDialog";
import Button from "./ui/Button";

interface Props {
  form: BudgetForm;
  submitLabel: string;
  submitIcon: keyof typeof Ionicons.glyphMap;
  onSubmit: () => void;
  /** Conteúdo exibido acima dos campos (ex.: cartão da oficina). */
  header?: ReactNode;
}

/** Formulário completo do orçamento + barra com total e botão. Usado para criar e para editar. */
export default function BudgetFormView({ form, submitLabel, submitIcon, onSubmit, header }: Props) {
  // Em telas estreitas o total fica numa linha e o botão ocupa a largura toda, para nenhum dos dois ser cortado.
  const stacked = useWindowDimensions().width < 440;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {header}
        <ClientForm
          name={form.name} phone={form.phone} address={form.address}
          onNameChange={form.setName} onPhoneChange={form.setPhone} onAddressChange={form.setAddress}
          errorFor={form.errorFor}
        />
        <VehicleForm
          brand={form.brand} model={form.model} licensePlate={form.licensePlate} color={form.color} year={form.year}
          onBrandChange={form.setBrand} onModelChange={form.setModel} onLicenseChange={form.setLicensePlate}
          onColorChange={form.setColor} onYearChange={form.setYear}
          errorFor={form.errorFor}
        />
        <ServicesList
          services={form.services} onChange={form.updateService} onAdd={form.addService} onRemove={form.removeService}
          errorFor={form.errorFor}
        />
        <DatesForm date={form.date} validityDays={form.validityDays} onDateChange={form.setDate} onValidityChange={form.setValidityDays} />
      </ScrollView>

      <View style={[styles.footer, stacked && styles.footerStacked]}>
        <View style={stacked ? styles.totalBoxStacked : styles.totalBox}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatMoney(form.total)}</Text>
        </View>
        <Button title={submitLabel} icon={submitIcon} size="lg" loading={form.isSaving} onPress={onSubmit} style={!stacked && styles.submitButton} />
      </View>

      <AppDialog
        visible={form.showMissingDialog}
        icon="alert-circle"
        iconColor={COLORS.danger}
        title="Faltam algumas informações"
        message={`Corrija os campos destacados em vermelho:\n${form.missingFields.map((f) => f.label).join(", ")}`}
        onClose={form.closeMissingDialog}
      >
        <Button title="Entendi" onPress={form.closeMissingDialog} />
      </AppDialog>

      <AppDialog
        visible={!!form.saveError}
        icon="close-circle"
        iconColor={COLORS.danger}
        title="Não foi possível salvar"
        message={form.saveError ?? ""}
        onClose={form.clearSaveError}
      >
        <Button title="Fechar" onPress={form.clearSaveError} />
      </AppDialog>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.light },
  content: { padding: 16, paddingBottom: 24, width: "100%", maxWidth: 720, alignSelf: "center" },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerStacked: { flexDirection: "column", alignItems: "stretch", gap: 8, paddingTop: 10 },
  totalBox: { flex: 1 },
  totalBoxStacked: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  totalLabel: { fontSize: 13, color: COLORS.gray, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  totalValue: { fontSize: 24, fontWeight: "800", color: COLORS.ink },
  submitButton: { flexShrink: 0 },
});
