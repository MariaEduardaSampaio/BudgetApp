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
    hasError: (key: string) => boolean;
}

export default function VehicleForm({
    brand, model, licensePlate, color, year,
    onBrandChange, onModelChange, onLicenseChange, onColorChange, onYearChange, hasError
}: Props) {
    return (
        <Section title="Veículo" icon="car-sport-outline">
            <Row>
                <Field containerStyle={{ flex: 1 }} label="Marca" required value={brand} onChangeText={onBrandChange} error={hasError("brand")} placeholder="Fiat" />
                <Field containerStyle={{ flex: 1 }} label="Modelo" required value={model} onChangeText={onModelChange} error={hasError("model")} placeholder="Uno" />
            </Row>
            <Row>
                <Field containerStyle={{ flex: 3 }} label="Placa" required value={licensePlate} onChangeText={onLicenseChange} error={hasError("licensePlate")} placeholder="ABC-1D23" autoCapitalize="characters" />
                <Field containerStyle={{ flex: 2 }} label="Ano" required value={year} onChangeText={onYearChange} error={hasError("year")} placeholder="2015" keyboardType="numeric" maxLength={4} />
            </Row>
            <Field label="Cor" value={color} onChangeText={onColorChange} placeholder="Prata" />
        </Section>
    );
}
