/**
 * Ionicons falso: o de verdade carrega a fonte dos ícones, o que não existe no jsdom.
 * Uso: jest.mock("@expo/vector-icons/Ionicons", () => jest.requireActual("<caminho>/test-utils/fakeIcons").fakeIoniconsModule);
 */
function Ionicons(_props: { name: string }) {
    return null;
}
Ionicons.glyphMap = {};

export const fakeIoniconsModule = { __esModule: true, default: Ionicons };
