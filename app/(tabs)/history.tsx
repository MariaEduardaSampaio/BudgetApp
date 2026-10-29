import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import BudgetActions from "../../src/components/BudgetActions";
import Button from "../../src/components/ui/Button";
import { COLORS, RADIUS } from "../../src/constants/theme";
import { Budget, getBudgetTotal } from "../../src/services/budgetService";
import { listBudgets } from "../../src/services/budgetStorage";
import { friendlyError } from "../../src/utils/errors";
import { formatBudgetNumber, formatDate, formatMoney } from "../../src/utils/formatters";

/** Espera a pessoa parar de digitar antes de buscar no banco. */
const SEARCH_DELAY_MS = 350;

export default function HistoryScreen() {
  const router = useRouter();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Erro ao carregar mais: aparece embaixo da lista, sem esconder os orçamentos que já estão na tela.
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Cada carregamento ganha um número; respostas de buscas antigas que chegarem atrasadas são ignoradas.
  const requestId = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [search]);

  /** Carrega a primeira página (mais recentes) para a busca atual. */
  const load = useCallback(() => {
    const current = ++requestId.current;
    listBudgets({ search: debouncedSearch })
      .then((page) => {
        if (current !== requestId.current) return;
        setBudgets(page.budgets);
        setHasMore(page.hasMore);
        setLoadError(null);
        setLoadMoreError(null);
      })
      .catch((e) => current === requestId.current && setLoadError(friendlyError(e, "Não foi possível carregar os orçamentos.")))
      .finally(() => current === requestId.current && setLoading(false));
  }, [debouncedSearch]);

  // Recarrega quando a aba é aberta (orçamentos novos ou editados) e quando a busca muda.
  useFocusEffect(load);

  const loadMore = async () => {
    const current = requestId.current;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const page = await listBudgets({ search: debouncedSearch, before: budgets.at(-1)?.number });
      if (current !== requestId.current) return;
      setBudgets((prev) => [...prev, ...page.budgets]);
      setHasMore(page.hasMore);
    } catch (e) {
      setLoadMoreError(friendlyError(e, "Não foi possível carregar mais orçamentos."));
    } finally {
      setLoadingMore(false);
    }
  };


  const searching = debouncedSearch.trim().length > 0;

  const footer = hasMore ? (
    <>
      {loadMoreError && <Text style={styles.loadMoreError}>{loadMoreError}</Text>}
      <Button title="Carregar mais" icon="chevron-down" variant="secondary" loading={loadingMore} onPress={loadMore} style={styles.loadMore} />
    </>
  ) : undefined;


  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.search}>
          <Ionicons name="search" size={20} color={COLORS.gray} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por cliente, placa ou número"
            placeholderTextColor="#A3A3A3"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.orange} size="large" style={{ marginTop: 60 }} />
        ) : (
          <FlatList
            data={loadError ? [] : budgets}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListFooterComponent={footer}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name={loadError ? "cloud-offline-outline" : "document-text-outline"} size={48} color={COLORS.gray} />
                <Text style={styles.emptyTitle}>
                  {loadError ? "Não foi possível carregar" : searching ? "Nada encontrado" : "Nenhum orçamento ainda"}
                </Text>
                <Text style={styles.emptyText}>
                  {loadError ?? (searching ? "Tente buscar por outro nome, placa ou número." : "Os orçamentos gerados aparecem aqui.")}
                </Text>
                {loadError && <Button title="Tentar de novo" icon="refresh" variant="secondary" onPress={load} style={{ marginTop: 12 }} />}
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.card}>
                {/* Tocar nos dados abre o orçamento completo. */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Abrir orçamento ${formatBudgetNumber(item.number)} de ${item.client.name}`}
                  onPress={() => router.push({ pathname: "/budget/[id]", params: { id: item.id } })}
                  style={({ pressed }) => [styles.cardBody, pressed && { backgroundColor: COLORS.light }]}
                >
                  <Text style={styles.number}>Nº {formatBudgetNumber(item.number)}</Text>
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
                    <Text style={[styles.info, { flex: 1 }]}>{formatDate(item.date)} · {item.services.length} {item.services.length === 1 ? "item" : "itens"}</Text>
                    <Text style={styles.open}>Abrir</Text>
                    <Ionicons name="chevron-forward" size={18} color={COLORS.orange} />
                  </View>
                </Pressable>

                <View style={styles.actions}>
                  <BudgetActions budget={item} />
                </View>
              </View>
            )}
          />
        )}
      </View>
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
    marginBottom: 12,
    overflow: "hidden",
  },
  cardBody: { padding: 16, paddingBottom: 10 },
  number: { fontSize: 13, fontWeight: "800", color: COLORS.orange, letterSpacing: 0.5, marginBottom: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 8 },
  client: { fontSize: 18, fontWeight: "800", color: COLORS.ink, flexShrink: 1 },
  total: { fontSize: 18, fontWeight: "800", color: COLORS.orange },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  info: { fontSize: 15, color: COLORS.gray, flexShrink: 1 },
  open: { fontSize: 14, fontWeight: "700", color: COLORS.orange },
  plate: { backgroundColor: COLORS.ink, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 4 },
  plateText: { color: COLORS.white, fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  actions: { paddingHorizontal: 16, paddingBottom: 16 },
  loadMore: { marginBottom: 12 },
  loadMoreError: { fontSize: 15, color: COLORS.danger, textAlign: "center", marginBottom: 8 },
});
