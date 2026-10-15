import Ionicons from "@expo/vector-icons/Ionicons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import BudgetActions from "../../src/components/BudgetActions";
import BudgetFormView from "../../src/components/BudgetFormView";
import AppDialog from "../../src/components/ui/AppDialog";
import Button from "../../src/components/ui/Button";
import Section from "../../src/components/ui/Section";
import { COLORS, RADIUS } from "../../src/constants/theme";
import { useBudgetForm } from "../../src/hooks/useBudgetForm";
import { Budget, getBudgetTotal } from "../../src/services/budgetService";
import { deleteBudget, getBudget } from "../../src/services/budgetStorage";
import { friendlyError } from "../../src/utils/errors";
import { formatBudgetNumber, formatDate, formatMoney } from "../../src/utils/formatters";

export default function BudgetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  // undefined = carregando, null = não encontrado
  const [budget, setBudget] = useState<Budget | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoadError(null);
    setBudget(undefined);
    getBudget(id)
      .then(setBudget)
      .catch((e) => {
        setLoadError(friendlyError(e, "Não foi possível carregar o orçamento."));
        setBudget(null);
      });
  }, [id]);

  useEffect(load, [load]);

  // Abrindo o link direto (ex.: recarregando a página) não há tela anterior: volta para o histórico.
  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/history"));
  const headerLeft = router.canGoBack() ? undefined : () => <HeaderButton icon="arrow-back" onPress={goBack} />;

  const remove = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteBudget(id);
      setConfirmDelete(false);
      goBack();
    } catch (e) {
      setDeleteError(friendlyError(e, "Não foi possível excluir. Tente novamente."));
    } finally {
      setDeleting(false);
    }
  };

  if (budget === undefined) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.orange} size="large" />
      </View>
    );
  }

  if (budget === null) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Orçamento", headerLeft }} />
        <Ionicons name={loadError ? "cloud-offline-outline" : "document-text-outline"} size={48} color={COLORS.gray} />
        <Text style={styles.notFound}>{loadError ? "Não foi possível carregar" : "Orçamento não encontrado"}</Text>
        {loadError && <Text style={styles.notFoundText}>{loadError}</Text>}
        {loadError && <Button title="Tentar de novo" icon="refresh" onPress={load} />}
        <Button title="Ir para o histórico" variant={loadError ? "ghost" : "primary"} onPress={() => router.replace("/history")} />
      </View>
    );
  }

  if (editing) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "Editar orçamento",
            headerLeft: () => <HeaderButton title="Cancelar" onPress={() => setEditing(false)} />,
          }}
        />
        <BudgetEditor
          budget={budget}
          onSaved={(saved) => {
            setBudget(saved);
            setEditing(false);
          }}
        />
      </>
    );
  }

  const { client, vehicle } = budget;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: `Orçamento Nº ${formatBudgetNumber(budget.number)}`, headerLeft }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summary}>
          <Text style={styles.summaryNumber}>ORÇAMENTO Nº {formatBudgetNumber(budget.number)}</Text>
          <Text style={styles.summaryClient}>{client.name}</Text>
          <View style={styles.summaryVehicle}>
            <Text style={styles.summaryVehicleText}>{vehicle.brand} {vehicle.model}</Text>
            <View style={styles.plate}><Text style={styles.plateText}>{vehicle.licensePlate}</Text></View>
          </View>
          <View style={styles.summaryDivider} />
          <Text style={styles.summaryLabel}>Total</Text>
          <Text style={styles.summaryTotal}>{formatMoney(getBudgetTotal(budget))}</Text>
          <Text style={styles.summaryDates}>
            {formatDate(budget.date)} · {budget.expiresAt ? `Válido até ${formatDate(budget.expiresAt)}` : "Sem validade"}
          </Text>
        </View>

        <View style={styles.actions}>
          <BudgetActions budget={budget} />
        </View>

        <Section title="Cliente" icon="person-outline">
          <InfoRow label="Nome" value={client.name} />
          <InfoRow label="Telefone" value={client.phone} />
          {client.address ? <InfoRow label="Endereço" value={client.address} /> : null}
        </Section>

        <Section title="Veículo" icon="car-sport-outline">
          <InfoRow label="Marca" value={vehicle.brand} />
          <InfoRow label="Modelo" value={vehicle.model} />
          <InfoRow label="Ano" value={String(vehicle.year)} />
          {vehicle.color ? <InfoRow label="Cor" value={vehicle.color} /> : null}
          <InfoRow label="Placa" value={vehicle.licensePlate} />
        </Section>

        <Section title="Serviços e peças" icon="construct-outline">
          {budget.services.map((s, i) => (
            <View key={i} style={[styles.item, i > 0 && styles.itemBorder]}>
              <Text style={styles.itemDescription}>{s.description}</Text>
              <View style={styles.itemValues}>
                <Text style={styles.itemQty}>{s.quantity.toLocaleString("pt-BR")} × {formatMoney(s.price)}</Text>
                <Text style={styles.itemSubtotal}>{formatMoney(s.quantity * s.price)}</Text>
              </View>
            </View>
          ))}
          <View style={styles.itemsTotal}>
            <Text style={styles.itemsTotalLabel}>Total</Text>
            <Text style={styles.itemsTotalValue}>{formatMoney(getBudgetTotal(budget))}</Text>
          </View>
        </Section>

        <Button title="Excluir orçamento" icon="trash-outline" variant="danger" onPress={() => setConfirmDelete(true)} />
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Editar orçamento" icon="create-outline" size="lg" variant="dark" onPress={() => setEditing(true)} />
      </View>

      <AppDialog
        visible={confirmDelete}
        icon="trash"
        iconColor={COLORS.danger}
        title="Excluir orçamento?"
        message={deleteError ?? `O orçamento Nº ${formatBudgetNumber(budget.number)} de ${client.name} (${vehicle.licensePlate}) será apagado para todos.`}
        onClose={() => setConfirmDelete(false)}
      >
        <Button title="Excluir" icon="trash" variant="danger" loading={deleting} onPress={remove} />
        <Button title="Cancelar" variant="ghost" onPress={() => setConfirmDelete(false)} />
      </AppDialog>
    </View>
  );
}

/** Formulário de edição, já preenchido com os dados do orçamento. */
function BudgetEditor({ budget, onSaved }: { budget: Budget; onSaved: (budget: Budget) => void }) {
  const form = useBudgetForm(budget);

  const save = async () => {
    const saved = await form.submit();
    if (saved) onSaved(saved);
  };

  return <BudgetFormView form={form} submitLabel="Salvar" submitIcon="checkmark" onSubmit={save} />;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function HeaderButton({ title, icon, onPress }: { title?: string; icon?: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={styles.headerButton} accessibilityRole="button" accessibilityLabel={title ?? "Voltar"}>
      {icon && <Ionicons name={icon} size={24} color={COLORS.white} />}
      {title && <Text style={styles.headerButtonText}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.light },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24, backgroundColor: COLORS.light },
  notFound: { fontSize: 18, fontWeight: "800", color: COLORS.ink },
  notFoundText: { fontSize: 15, color: COLORS.gray, textAlign: "center" },
  summaryNumber: { color: COLORS.orange, fontSize: 13, fontWeight: "800", letterSpacing: 0.8, marginBottom: 4 },
  content: { padding: 16, paddingBottom: 24, width: "100%", maxWidth: 720, alignSelf: "center" },

  summary: { backgroundColor: COLORS.ink, borderRadius: RADIUS.lg, padding: 18, marginBottom: 12 },
  summaryClient: { color: COLORS.white, fontSize: 22, fontWeight: "800" },
  summaryVehicle: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  summaryVehicleText: { color: "#BDBDBD", fontSize: 15, flexShrink: 1 },
  summaryDivider: { height: 1, backgroundColor: "#2E2E2E", marginVertical: 14 },
  summaryLabel: { color: "#BDBDBD", fontSize: 13, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  summaryTotal: { color: COLORS.orange, fontSize: 30, fontWeight: "800" },
  summaryDates: { color: "#BDBDBD", fontSize: 14, marginTop: 4 },
  plate: { backgroundColor: COLORS.white, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  plateText: { color: COLORS.ink, fontSize: 12, fontWeight: "800", letterSpacing: 1 },

  actions: { marginBottom: 16 },

  infoRow: { flexDirection: "row", justifyContent: "space-between", gap: 16, paddingVertical: 9, borderTopWidth: 1, borderTopColor: COLORS.light },
  infoLabel: { fontSize: 15, color: COLORS.gray },
  infoValue: { fontSize: 15, color: COLORS.ink, fontWeight: "600", flexShrink: 1, textAlign: "right" },

  item: { paddingVertical: 10 },
  itemBorder: { borderTopWidth: 1, borderTopColor: COLORS.light },
  itemDescription: { fontSize: 16, color: COLORS.ink, fontWeight: "600" },
  itemValues: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  itemQty: { fontSize: 14, color: COLORS.gray },
  itemSubtotal: { fontSize: 15, color: COLORS.ink, fontWeight: "700" },
  itemsTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 2,
    borderTopColor: COLORS.ink,
    paddingVertical: 12,
    marginBottom: 6,
  },
  itemsTotalLabel: { fontSize: 16, fontWeight: "800", color: COLORS.ink },
  itemsTotalValue: { fontSize: 18, fontWeight: "800", color: COLORS.orange },

  footer: { padding: 16, paddingTop: 12, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.border },
  headerButton: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12 },
  headerButtonText: { color: COLORS.white, fontSize: 16, fontWeight: "600" },
});
