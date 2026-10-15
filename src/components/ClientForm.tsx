import Field from "./ui/Field";
import Section from "./ui/Section";

interface Props {
    name: string;
    phone: string;
    address: string;
    onNameChange: (v: string) => void;
    onPhoneChange: (v: string) => void;
    onAddressChange: (v: string) => void;
    errorFor: (key: string) => string | undefined;
}

export default function ClientForm({ name, phone, address, onNameChange, onPhoneChange, onAddressChange, errorFor }: Props) {
    return (
        <Section title="Cliente" icon="person-outline">
            <Field label="Nome" required value={name} onChangeText={onNameChange} error={errorFor("name")} placeholder="Nome do cliente" autoCapitalize="words" />
            <Field label="Telefone" required value={phone} onChangeText={onPhoneChange} error={errorFor("phone")} placeholder="(31) 99999-9999" keyboardType="phone-pad" />
            <Field label="Endereço" value={address} onChangeText={onAddressChange} placeholder="Rua, número, bairro" />
        </Section>
    );
}
