import { createElement, Fragment, isValidElement, ReactNode } from "react";

/**
 * FlatList sem virtualização: o de verdade só desenha os itens que cabem na tela,
 * e o jsdom não tem tela (ficariam só 10). Aqui todos os itens são desenhados.
 * O babel da web troca `import { FlatList } from "react-native"` por este módulo específico:
 * Uso: jest.mock("react-native-web/dist/exports/FlatList", () => jest.requireActual("<caminho>/test-utils/fakeFlatList").fakeFlatListModule);
 */
interface Props<T> {
    data: readonly T[] | null | undefined;
    renderItem: (info: { item: T; index: number }) => ReactNode;
    keyExtractor?: (item: T, index: number) => string;
    ListHeaderComponent?: ReactNode;
    ListFooterComponent?: ReactNode;
    ListEmptyComponent?: ReactNode;
}

const asNode = (component: unknown): ReactNode =>
    component == null || isValidElement(component) ? (component as ReactNode) : createElement(component as any);

function SimpleFlatList<T>({ data, renderItem, keyExtractor, ListHeaderComponent, ListFooterComponent, ListEmptyComponent }: Props<T>) {
    const items = data ?? [];
    return (
        <div>
            {asNode(ListHeaderComponent)}
            {items.length === 0
                ? asNode(ListEmptyComponent)
                : items.map((item, index) => (
                      <Fragment key={keyExtractor ? keyExtractor(item, index) : index}>{renderItem({ item, index })}</Fragment>
                  ))}
            {asNode(ListFooterComponent)}
        </div>
    );
}

export const fakeFlatListModule = { __esModule: true, default: SimpleFlatList };
