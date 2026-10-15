import Field from "./ui/Field";
import Section from "./ui/Section";

interface Props {
    name: string;
    phone: string;
    address: string;
    onNameChange: (v: string) => void;
    onPhoneChange: (v: string) => void;
    onAddressChange: (v: string) => void;
    hasError: (key: string) => boolean;
}

export default function ClientForm({ name, phone, address, onNameChange, onPhoneChange, onAddressChange, hasError }: Props) {
    return (
        <Section title="Cliente" icon="person-outline">
            <Field label="Nome" required value={name} onChangeText={onNameChange} error={hasError("name")} placeholder="Nome do cliente" autoCapitalize="words" />
            <Field label="Telefone" required value={phone} onChangeText={onPhoneChange} error={hasError("phone")} placeholder="(31) 99999-9999" keyboardType="phone-pad" />
            <Field label="Endereço" value={address} onChangeText={onAddressChange} placeholder="Rua, número, bairro" />
        </Section>
    );
}
