import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import BudgetActionsDialog from "../../src/components/BudgetActionsDialog";
import AppDialog from "../../src/components/ui/AppDialog";
import Button from "../../src/components/ui/Button";
import { COLORS, RADIUS } from "../../src/constants/theme";
import { Budget, getBudgetTotal } from "../../src/services/budgetService";
import { deleteBudget, listBudgets } from "../../src/services/budgetStorage";
import { formatDate, formatMoney } from "../../src/utils/formatters";

export default function HistoryScreen() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [search, setSearch] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [selected, setSelected] = useState<Budget | null>(null);
  const [toDelete, setToDelete] = useState<Budget | null>(null);

  const load = useCallback(() => {
    listBudgets()
      .then((list) => { setBudgets(list); setLoadError(false); })
      .catch(() => setLoadError(true));
  }, []);

  // Recarrega sempre que a aba é aberta, para mostrar orçamentos recém-criados.
  useFocusEffect(load);

  const confirmDelete = async () => {
    if (!toDelete) return;
    await deleteBudget(toDelete.id);
    setToDelete(null);
    load();
  };

  const term = search.trim().toLowerCase();
  const filtered = term
    ? budgets.filter((b) =>
        [b.client.name, b.vehicle.licensePlate, b.vehicle.model].some((field) => field.toLowerCase().includes(term))
      )
    : budgets;

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.search}>
          <Ionicons name="search" size={20} color={COLORS.gray} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por cliente, placa ou modelo"
            placeholderTextColor="#A3A3A3"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name={loadError ? "warning-outline" : "document-text-outline"} size={48} color={COLORS.gray} />
              <Text style={styles.emptyTitle}>
                {loadError ? "Não foi possível carregar" : budgets.length === 0 ? "Nenhum orçamento ainda" : "Nada encontrado"}
              </Text>
              <Text style={styles.emptyText}>
                {loadError ? "Tente abrir a aba novamente." : budgets.length === 0 ? "Os orçamentos gerados aparecem aqui." : "Tente buscar por outro nome ou placa."}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable style={({ pressed }) => [styles.card, pressed && { borderColor: COLORS.orange }]} onPress={() => setSelected(item)}>
              <View style={styles.cardHeader}>
                <Text style={styles.client} numberOfLines={1}>{item.client.name}</Text>
                <Text style={styles.total}>{formatMoney(getBudgetTotal(item))}</Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="car-sport-outline" size={16} color={COLORS.gray} />
                <Text style={styles.info} numberOfLines={1}>{item.vehicle.brand} {item.vehicle.model}</Text>
                <View style={styles.plate}>
                  <Text style={styles.plateText}>{item.vehicle.licensePlate}</Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={16} color={COLORS.gray} />
                <Text style={styles.info}>{formatDate(item.date)} · {item.services.length} {item.services.length === 1 ? "item" : "itens"}</Text>
              </View>

              <View style={styles.actions}>
                <Button title="Compartilhar" icon="share-social" onPress={() => setSelected(item)} style={{ flex: 1 }} />
                <Button title="Excluir" icon="trash-outline" variant="danger" onPress={() => setToDelete(item)} />
              </View>
            </Pressable>
          )}
        />
      </View>

      <BudgetActionsDialog budget={selected} title="Orçamento" onClose={() => setSelected(null)} />

      <AppDialog
        visible={!!toDelete}
        icon="trash"
        iconColor={COLORS.danger}
        title="Excluir orçamento?"
        message={toDelete ? `O orçamento de ${toDelete.client.name} (${toDelete.vehicle.licensePlate}) será apagado do histórico.` : ""}
        onClose={() => setToDelete(null)}
      >
        <Button title="Excluir" icon="trash" variant="danger" onPress={confirmDelete} />
        <Button title="Cancelar" variant="ghost" onPress={() => setToDelete(null)} />
      </AppDialog>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.light },
  content: { flex: 1, padding: 16, paddingBottom: 0, width: "100%", maxWidth: 720, alignSelf: "center" },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 50,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    marginBottom: 16,
  },
  searchInput: { flex: 1, fontSize: 16, color: COLORS.ink, minHeight: 46 },
  empty: { alignItems: "center", marginTop: 60, gap: 6, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: COLORS.ink, marginTop: 6 },
  emptyText: { fontSize: 15, color: COLORS.gray, textAlign: "center" },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 8 },
  client: { fontSize: 18, fontWeight: "800", color: COLORS.ink, flexShrink: 1 },
  total: { fontSize: 18, fontWeight: "800", color: COLORS.orange },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  info: { fontSize: 15, color: COLORS.gray, flexShrink: 1 },
  plate: { backgroundColor: COLORS.ink, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 4 },
  plateText: { color: COLORS.white, fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  actions: { flexDirection: "row", gap: 10, marginTop: 12 },
});
