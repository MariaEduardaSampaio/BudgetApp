import { getPlateType } from "../utils/validators";
import Field from "./ui/Field";
import Section, { Row } from "./ui/Section";

interface Props {
    brand: string;
    model: string;
    licensePlate: string;
    color: string;
    year: string;
    onBrandChange: (v: string) => void;
    onModelChange: (v: string) => void;
    onLicenseChange: (v: string) => void;
    onColorChange: (v: string) => void;
    onYearChange: (v: string) => void;
    errorFor: (key: string) => string | undefined;
}

export default function VehicleForm({
    brand, model, licensePlate, color, year,
    onBrandChange, onModelChange, onLicenseChange, onColorChange, onYearChange, errorFor
}: Props) {
    const plateType = getPlateType(licensePlate);
    const plateHint = plateType === "mercosul" ? "✓ Placa Mercosul" : plateType === "antiga" ? "✓ Placa modelo antigo" : "ABC-1234 (antiga) ou ABC1D23 (Mercosul)";

    return (
        <Section title="Veículo" icon="car-sport-outline">
            <Row>
                <Field containerStyle={{ flex: 1 }} label="Marca" required value={brand} onChangeText={onBrandChange} error={errorFor("brand")} placeholder="Fiat" maxLength={60} />
                <Field containerStyle={{ flex: 1 }} label="Modelo" required value={model} onChangeText={onModelChange} error={errorFor("model")} placeholder="Uno" maxLength={60} />
            </Row>
            <Row>
                <Field containerStyle={{ flex: 3 }} label="Placa" required value={licensePlate} onChangeText={onLicenseChange} error={errorFor("licensePlate")} hint={plateHint} placeholder="ABC1D23" autoCapitalize="characters" autoCorrect={false} maxLength={8} />
                <Field containerStyle={{ flex: 2 }} label="Ano" required value={year} onChangeText={onYearChange} error={errorFor("year")} placeholder="2015" keyboardType="numeric" maxLength={4} />
            </Row>
            <Field label="Cor" value={color} onChangeText={onColorChange} placeholder="Prata" maxLength={40} />
        </Section>
    );
}
