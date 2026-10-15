/**
 * Monta o filtro de busca do Histórico no formato do Supabase (PostgREST),
 * para a busca acontecer no banco em vez de baixar todos os orçamentos.
 *
 * Procura por nome do cliente, modelo, placa e número do orçamento.
 * Devolve null quando não há o que buscar.
 */
export const buildBudgetSearchFilter = (search: string): string | null => {
    // Vírgula, parênteses, aspas, barra e * têm significado na sintaxe do filtro: removemos.
    const term = search.replace(/[,()"\\*%]/g, " ").trim().replace(/\s+/g, " ");
    if (!term) return null;

    const filters = [`client_name.ilike.*${term}*`, `vehicle_model.ilike.*${term}*`];

    // Placa: só quando o texto parece placa; ignora hífen e espaços ("abc1234" acha "ABC-1234").
    const plate = term.toUpperCase().replace(/[-\s]/g, "");
    if (/^[A-Z0-9]{1,7}$/.test(plate)) {
        const platePattern = plate.length > 3 ? `${plate.slice(0, 3)}*${plate.slice(3)}` : plate;
        filters.push(`vehicle_plate.ilike.*${platePattern}*`);
    }

    // Número: "7", "07" ou "0007" acham o orçamento Nº 0007.
    if (/^\d{1,9}$/.test(term)) filters.push(`number.eq.${Number(term)}`);

    return filters.join(",");
};
