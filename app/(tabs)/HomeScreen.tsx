import ClientForm from "../../src/components/ClientForm";
import VehicleForm from "../../src/components/VehicleForm";
import ServicesList from "../../src/components/ServicesList";
import { useBudgetForm } from "../../src/hooks/useBudgetForm";
import { ScrollView, Pressable, Text, View } from "react-native";

export default function HomeScreen() {
  const {
    name, setName, phone, setPhone, address, setAddress,
    brand, setBrand, model, setModel, licensePlate, setLicensePlate,
    color, setColor, year, setYear,
    services, updateService, addService, removeService,
    generatePdf
  } = useBudgetForm();

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      <ClientForm name={name} phone={phone} address={address} onNameChange={setName} onPhoneChange={setPhone} onAddressChange={setAddress} />
      <VehicleForm brand={brand} model={model} licensePlate={licensePlate} color={color} year={year} onBrandChange={setBrand} onModelChange={setModel} onLicenseChange={setLicensePlate} onColorChange={setColor} onYearChange={setYear} />
      <ServicesList services={services} onChange={updateService} onAdd={addService} onRemove={removeService} />
      <Pressable onPress={generatePdf} style={{ backgroundColor: "#007bff", padding: 15, borderRadius: 8, alignItems: "center" }}>
        <Text style={{ color: "#fff", fontWeight: "bold" }}>Gerar PDF</Text>
      </Pressable>
    </ScrollView>
  );
}
