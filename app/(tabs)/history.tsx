import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import BudgetActions from "../../src/components/BudgetActions";
import Button from "../../src/components/ui/Button";
import { COLORS, RADIUS } from "../../src/constants/theme";
import { Budget, getBudgetTotal } from "../../src/services/budgetService";
import { DEFAULT_PAGE_SIZE, listBudgets, PAGE_SIZES } from "../../src/services/budgetStorage";
import { friendlyError } from "../../src/utils/errors";
import { formatBudgetNumber, formatDate, formatMoney } from "../../src/utils/formatters";

/** Espera a pessoa parar de digitar antes de buscar no banco. */
const SEARCH_DELAY_MS = 350;

export default function HistoryScreen() {
  const router = useRouter();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  // Trocando de página: a página atual continua na tela até a próxima chegar.
  const [changingPage, setChangingPage] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const listRef = useRef<FlatList<Budget>>(null);

  // Cada carregamento ganha um número; respostas de buscas antigas que chegarem atrasadas são ignoradas.
  const requestId = useRef(0);

  useEffect(() => {
    // Só uma busca nova volta para a página 1 (ao abrir a tela, o texto ainda não mudou).
    if (search === debouncedSearch) return;
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [search, debouncedSearch]);

  /** Carrega a página atual para a busca atual. */
  const load = useCallback(() => {
    const current = ++requestId.current;
    listBudgets({ search: debouncedSearch, page, pageSize })
      .then((result) => {
        if (current !== requestId.current) return;
        setBudgets(result.budgets);
        setTotal(result.total);
        // A página pedida pode ter deixado de existir (ex.: excluíram o último orçamento dela).
        if (result.page !== page) setPage(result.page);
        setLoadError(null);
      })
      .catch((e) => current === requestId.current && setLoadError(friendlyError(e, "Não foi possível carregar os orçamentos.")))
      .finally(() => {
        if (current !== requestId.current) return;
        setLoading(false);
        setChangingPage(false);
      });
  }, [debouncedSearch, page, pageSize]);

  // Recarrega quando a aba é aberta (orçamentos novos ou editados) e quando a busca ou a página mudam.
  useFocusEffect(load);

  const goToPage = (next: number) => {
    setChangingPage(true);
    setPage(next);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

  const changePageSize = (size: number) => {
    if (size === pageSize) return;
    setChangingPage(true);
    setPageSize(size);
    setPage(1);
  };

  const searching = debouncedSearch.trim().length > 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const showPaging = !loadError && budgets.length > 0;

  const firstShown = (page - 1) * pageSize + 1;
  const lastShown = firstShown + budgets.length - 1;
  const summary = `Mostrando ${firstShown === lastShown ? firstShown : `${firstShown}–${lastShown}`} de ${total} ${total === 1 ? "orçamento" : "orçamentos"}`;

  // Os mesmos botões ficam em cima e embaixo da lista: não é preciso rolar até o fim para trocar de página.
  const pager = showPaging && pageCount > 1 ? (
    <View style={styles.pager}>
      <Button title="Anterior" icon="chevron-back" variant="secondary" disabled={page <= 1} onPress={() => goToPage(page - 1)} style={styles.pagerButton} />
      <Text style={styles.pageInfo}>Página {page} de {pageCount}</Text>
      <Button title="Próxima" icon="chevron-forward" variant="secondary" disabled={page >= pageCount} onPress={() => goToPage(page + 1)} style={styles.pagerButton} />
    </View>
  ) : undefined;

  const header = showPaging ? (
    <View style={styles.pagingHeader}>
      <View style={styles.summaryRow}>
        <Text style={styles.summary}>{summary}</Text>
        {changingPage && <ActivityIndicator color={COLORS.orange} size="small" />}
      </View>
      <View style={styles.sizeRow}>
        <Text style={styles.sizeLabel}>Por página:</Text>
        <View accessibilityRole="radiogroup" aria-label="Orçamentos por página" style={styles.sizeOptions}>
          {PAGE_SIZES.map((size) => {
            const selected = size === pageSize;
            return (
              <Pressable
                key={size}
                accessibilityRole="radio"
                aria-checked={selected}
                style={[styles.sizeChip, selected && styles.sizeChipSelected]}
                onPress={() => changePageSize(size)}
              >
                <Text style={[styles.sizeChipText, selected && styles.sizeChipTextSelected]}>{size}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      {pager}
    </View>
  ) : undefined;


  return (
    <View style={styles.screen}>
      {/* A busca fica parada no topo; só a lista rola. */}
      <View style={styles.searchBar}>
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
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.orange} size="large" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          ref={listRef}
          data={loadError ? [] : budgets}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={header}
          ListFooterComponent={pager}
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
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.light },
  // A lista ocupa a largura toda (a barra de rolagem fica no canto da janela, como nas outras telas);
  // só o conteúdo é centralizado e limitado a 720px, igual à busca.
  searchBar: { width: "100%", maxWidth: 720, alignSelf: "center", paddingHorizontal: 16, paddingTop: 16 },
  list: { width: "100%", maxWidth: 720, alignSelf: "center", paddingHorizontal: 16, paddingBottom: 20 },
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
  pagingHeader: { gap: 10, marginBottom: 12 },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  summary: { fontSize: 15, fontWeight: "600", color: COLORS.gray },
  sizeRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  sizeLabel: { fontSize: 15, color: COLORS.ink, fontWeight: "600" },
  sizeOptions: { flexDirection: "row", gap: 6 },
  sizeChip: {
    minWidth: 44,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
  },
  sizeChipSelected: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  sizeChipText: { color: COLORS.ink, fontSize: 15, fontWeight: "700" },
  sizeChipTextSelected: { color: COLORS.white },
  pager: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  pagerButton: { flexShrink: 1 },
  pageInfo: { fontSize: 15, fontWeight: "700", color: COLORS.ink, textAlign: "center" },
});
