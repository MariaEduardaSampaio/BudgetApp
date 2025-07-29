import React, { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  Alert,
  View,
  ScrollView,
  Text,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Modal,
  FlatList,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import DateTimePicker from '@react-native-community/datetimepicker';

const { width } = Dimensions.get('window');

type ServiceField = 'description' | 'quantity' | 'price';

export default function HomeScreen() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [color, setColor] = useState('');
  const [year, setYear] = useState('');
  const [services, setServices] = useState([{ description: '', quantity: '', price: '' }]);
  const [date, setDate] = useState(new Date());
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showExpiresPicker, setShowExpiresPicker] = useState(false);
  const [showYearModal, setShowYearModal] = useState(false);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1979 }, (_, i) => 1980 + i);

  const formatCurrency = (value: string) => {
    let numeric = value.replace(/\D/g, '');
    let number = parseFloat(numeric) / 100;
    if (isNaN(number)) number = 0;
    return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatPhone = (value: string) => {
    let numeric = value.replace(/\D/g, '').slice(0, 11);
    if (numeric.length <= 10) {
      return numeric.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim();
    }
    return numeric.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim();
  };

  const formatPlate = (value: string) => {
    let formatted = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (formatted.length <= 3) return formatted;
    if (formatted.length <= 4) return formatted.replace(/^([A-Z]{3})([0-9A-Z]{0,1})$/, '$1-$2');
    return formatted.replace(/^([A-Z]{3})([0-9][A-Z0-9]{1})([0-9]{0,2})$/, '$1-$2$3');
  };

  const validateFields = () => {
    const missing = [];
    if (!name) missing.push('Nome do Cliente');
    if (!phone || phone.replace(/\D/g, '').length < 10) missing.push('Telefone válido');
    if (!brand) missing.push('Marca');
    if (!model) missing.push('Modelo');
    if (!licensePlate || licensePlate.length < 8) missing.push('Placa válida');
    if (!year) missing.push('Ano');

    services.forEach((s, i) => {
      if (!s.description) missing.push(`Descrição do serviço ${i + 1}`);
      if (!s.quantity) missing.push(`Quantidade do serviço ${i + 1}`);
      if (!s.price) missing.push(`Preço do serviço ${i + 1}`);
    });

    if (missing.length > 0) {
      Alert.alert('Campos obrigatórios', `Preencha: ${missing.join(', ')}`);
      return false;
    }
    return true;
  };

  const generatePdf = async () => {
    if (!validateFields()) return;

    try {
      const cleanServices = services.map(s => ({
        description: s.description,
        quantity: parseInt(s.quantity),
        price: parseFloat(s.price.replace(/[R$\s.]/g, '').replace(',', '.')) || 0
      }));

      const payload = {
        client: { name, phone, address },
        vehicle: { brand, model, licensePlate, color, year: parseInt(year) },
        services: cleanServices,
        date,
        expiresAt
      };

      const response = await fetch("http://192.168.0.10:5000/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("Erro ao gerar PDF");

      const pdfBytes = await response.arrayBuffer();
      const fileUri = FileSystem.documentDirectory + "orcamento.pdf";
      await FileSystem.writeAsStringAsync(fileUri, Buffer.from(pdfBytes).toString('base64'), {
        encoding: FileSystem.EncodingType.Base64
      });

      await Sharing.shareAsync(fileUri);
    } catch (error: any) {
      Alert.alert("Erro", error.message);
    }
  };

  const updateService = (index: number, field: ServiceField, value: string) => {
    const updated = [...services];
    updated[index][field] = field === 'price' ? formatCurrency(value) : value;
    setServices(updated);
  };

  const addService = () => {
    setServices([...services, { description: '', quantity: '', price: '' }]);
  };

  const removeService = (index: number) => {
    const updated = services.filter((_, i) => i !== index);
    setServices(updated);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardView}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.wrapper}>
          <View style={styles.header}>
            <Text style={styles.headerText}>Orçamentos Alocar</Text>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.sectionTitle}>Informações do Cliente</Text>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Nome do Cliente *</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName} />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Telefone *</Text>
              <TextInput style={styles.input} value={phone} onChangeText={(t) => setPhone(formatPhone(t))} keyboardType="phone-pad" />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Endereço</Text>
              <TextInput style={styles.input} value={address} onChangeText={setAddress} />
            </View>

            <Text style={styles.sectionTitle}>Informações do Veículo</Text>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Marca *</Text>
              <TextInput style={styles.input} value={brand} onChangeText={setBrand} />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Modelo *</Text>
              <TextInput style={styles.input} value={model} onChangeText={setModel} />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Placa *</Text>
              <TextInput style={styles.input} value={licensePlate} onChangeText={(t) => setLicensePlate(formatPlate(t))} />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Cor</Text>
              <TextInput style={styles.input} value={color} onChangeText={setColor} />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Ano *</Text>
              <Pressable style={styles.dateButton} onPress={() => setShowYearModal(true)}>
                <Text style={styles.dateButtonText}>{year ? year : 'Selecione o ano'}</Text>
              </Pressable>
            </View>

            <Modal visible={showYearModal} animationType="slide" transparent>
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Selecione o Ano</Text>
                  <FlatList
                    data={years.map(y => y.toString())}
                    keyExtractor={(item) => item}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.modalItem}
                        onPress={() => {
                          setYear(item);
                          setShowYearModal(false);
                        }}
                      >
                        <Text style={styles.modalItemText}>{item}</Text>
                      </TouchableOpacity>
                    )}
                  />
                  <Pressable style={styles.closeButton} onPress={() => setShowYearModal(false)}>
                    <Text style={styles.closeButtonText}>Fechar</Text>
                  </Pressable>
                </View>
              </View>
            </Modal>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Data do Orçamento *</Text>
              <Pressable style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
                <Text style={styles.dateButtonText}>{date.toLocaleDateString('pt-BR')}</Text>
              </Pressable>
              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="default"
                  onChange={(e, selected) => {
                    setShowDatePicker(false);
                    if (selected) setDate(selected);
                  }}
                />
              )}
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Data de Expiração</Text>
              <Pressable style={styles.dateButton} onPress={() => setShowExpiresPicker(true)}>
                <Text style={styles.dateButtonText}>{expiresAt ? expiresAt.toLocaleDateString('pt-BR') : 'Selecionar data'}</Text>
              </Pressable>
              {showExpiresPicker && (
                <DateTimePicker
                  value={expiresAt || new Date()}
                  mode="date"
                  display="default"
                  onChange={(e, selected) => {
                    setShowExpiresPicker(false);
                    if (selected) setExpiresAt(selected);
                  }}
                />
              )}
            </View>

            <Text style={styles.sectionTitle}>Serviços</Text>
            {services.map((service, index) => (
              <View key={index} style={styles.serviceBox}>
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Descrição *</Text>
                  <TextInput style={styles.input} value={service.description} onChangeText={(text) => updateService(index, 'description', text)} />
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Quantidade *</Text>
                  <TextInput style={styles.input} keyboardType="numeric" value={service.quantity} onChangeText={(text) => updateService(index, 'quantity', text)} />
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Preço *</Text>
                  <TextInput style={styles.input} keyboardType="numeric" value={service.price} onChangeText={(text) => updateService(index, 'price', text)} />
                </View>
                {services.length > 1 && (
                  <Pressable style={styles.removeButton} onPress={() => removeService(index)}>
                    <Text style={styles.removeButtonText}>Remover</Text>
                  </Pressable>
                )}
              </View>
            ))}
            <Pressable style={styles.addButton} onPress={addService}>
              <Text style={styles.addButtonText}>+ Adicionar Serviço</Text>
            </Pressable>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.mainButton} onPress={generatePdf}>
              <Text style={styles.mainButtonText}>Gerar PDF</Text>
            </Pressable>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: { flex: 1 },
  wrapper: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 20, backgroundColor: '#f4f4f4', borderBottomWidth: 1, borderBottomColor: '#ddd' },
  headerText: { fontSize: width * 0.07, fontWeight: 'bold', textAlign: 'center' },
  scrollContent: { padding: 20, paddingBottom: 150 },
  sectionTitle: { fontSize: width * 0.05, fontWeight: 'bold', marginVertical: 10, color: '#333' },
  fieldGroup: { marginBottom: 12 },
  label: { fontSize: width * 0.04, fontWeight: '500', marginBottom: 6, color: '#555' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 5, color: '#000', fontSize: width * 0.04 },
  dateButton: { borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 5, backgroundColor: '#f9f9f9' },
  dateButtonText: { fontSize: width * 0.04, color: '#333' },
  footer: { position: 'absolute', bottom: 20, left: 20, right: 20 },
  mainButton: { backgroundColor: '#007bff', padding: 15, borderRadius: 8, alignItems: 'center' },
  mainButtonText: { color: '#fff', fontSize: width * 0.05, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', maxHeight: '70%', backgroundColor: '#fff', borderRadius: 10, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  modalItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#ddd' },
  modalItemText: { fontSize: 16, textAlign: 'center' },
  closeButton: { marginTop: 10, backgroundColor: '#007bff', padding: 12, borderRadius: 8, alignItems: 'center' },
  closeButtonText: { color: '#fff', fontWeight: 'bold' },
  serviceBox: { marginBottom: 15, padding: 10, borderWidth: 1, borderColor: '#ccc', borderRadius: 8 },
  removeButton: { backgroundColor: '#ff4d4d', padding: 10, borderRadius: 5, marginTop: 10, alignItems: 'center' },
  removeButtonText: { color: '#fff', fontWeight: 'bold' },
  addButton: { backgroundColor: '#28a745', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 20 },
  addButtonText: { color: '#fff', fontWeight: 'bold', fontSize: width * 0.04 }
});
