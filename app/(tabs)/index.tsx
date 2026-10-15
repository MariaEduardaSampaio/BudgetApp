import ClientForm from "../../src/components/ClientForm";
import VehicleForm from "../../src/components/VehicleForm";
import ServicesList from "../../src/components/ServicesList";
import DatesForm from "../../src/components/DatesForm";
import BudgetActionsDialog from "../../src/components/BudgetActionsDialog";
import AppDialog from "../../src/components/ui/AppDialog";
import Button from "../../src/components/ui/Button";
import { COLORS } from "../../src/constants/theme";
import { useBudgetForm } from "../../src/hooks/useBudgetForm";
import { formatMoney } from "../../src/utils/formatters";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";

export default function HomeScreen() {
  const form = useBudgetForm();

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ClientForm
          name={form.name} phone={form.phone} address={form.address}
          onNameChange={form.setName} onPhoneChange={form.setPhone} onAddressChange={form.setAddress}
          hasError={form.hasError}
        />
        <VehicleForm
          brand={form.brand} model={form.model} licensePlate={form.licensePlate} color={form.color} year={form.year}
          onBrandChange={form.setBrand} onModelChange={form.setModel} onLicenseChange={form.setLicensePlate}
          onColorChange={form.setColor} onYearChange={form.setYear}
          hasError={form.hasError}
        />
        <ServicesList
          services={form.services} onChange={form.updateService} onAdd={form.addService} onRemove={form.removeService}
          hasError={form.hasError}
        />
        <DatesForm date={form.date} validityDays={form.validityDays} onDateChange={form.setDate} onValidityChange={form.setValidityDays} />
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue} numberOfLines={1} adjustsFontSizeToFit>{formatMoney(form.total)}</Text>
        </View>
        <Button title="Gerar orçamento" icon="document-text" size="lg" loading={form.isSaving} onPress={form.generateBudget} style={styles.generateButton} />
      </View>

      <AppDialog
        visible={form.showMissingDialog}
        icon="alert-circle"
        iconColor={COLORS.danger}
        title="Faltam algumas informações"
        message={`Preencha os campos destacados em vermelho:\n${form.missingFields.map((f) => f.label).join(", ")}`}
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

      <BudgetActionsDialog
        budget={form.generatedBudget}
        title="Orçamento pronto!"
        onClose={form.closeGeneratedBudget}
        onNewBudget={form.resetForm}
      />
    </KeyboardAvoidingView>
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
  totalBox: { flex: 1 },
  totalLabel: { fontSize: 13, color: COLORS.gray, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  totalValue: { fontSize: 24, fontWeight: "800", color: COLORS.ink },
  generateButton: { flexShrink: 0 },
});
