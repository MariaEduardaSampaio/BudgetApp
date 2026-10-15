import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Button from "../src/components/ui/Button";
import Field from "../src/components/ui/Field";
import { COLORS, RADIUS } from "../src/constants/theme";
import { WORKSHOP } from "../src/constants/workshop";
import { useAuth } from "../src/hooks/useAuth";
import { friendlyError } from "../src/utils/errors";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) {
      setError("Preencha o e-mail e a senha.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      // Depois do login, as rotas protegidas liberam o app automaticamente (ver app/_layout.tsx).
      await signIn(email, password);
    } catch (e) {
      setError(friendlyError(e, "Não foi possível entrar. Tente novamente."));
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.brand}>
        <View style={styles.logo}>
          <Ionicons name="car-sport" size={34} color={COLORS.ink} />
        </View>
        <Text style={styles.brandName}>{WORKSHOP.shortName}</Text>
        <Text style={styles.brandTagline}>Orçamentos</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Entrar</Text>

        <Field
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          placeholder="seu@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
        />
        <Field
          label="Senha"
          value={password}
          onChangeText={setPassword}
          placeholder="Sua senha"
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          onSubmitEditing={submit}
          containerStyle={{ marginBottom: 6 }}
        />
        <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.showPassword} hitSlop={8}>
          <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={COLORS.gray} />
          <Text style={styles.showPasswordText}>{showPassword ? "Esconder senha" : "Mostrar senha"}</Text>
        </Pressable>

        {error && (
          <View style={styles.error}>
            <Ionicons name="alert-circle" size={18} color={COLORS.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Button title="Entrar" icon="log-in-outline" size="lg" loading={loading} onPress={submit} />
      </View>

      <Text style={styles.help}>Não tem acesso ou esqueceu a senha? Fale com quem administra o sistema.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.ink },
  content: { flexGrow: 1, justifyContent: "center", padding: 20, width: "100%", maxWidth: 440, alignSelf: "center" },
  brand: { alignItems: "center", marginBottom: 28 },
  logo: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.orange,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  brandName: { color: COLORS.white, fontSize: 26, fontWeight: "800" },
  brandTagline: { color: "#BDBDBD", fontSize: 16, marginTop: 2 },
  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 20 },
  title: { fontSize: 22, fontWeight: "800", color: COLORS.ink, marginBottom: 16 },
  showPassword: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", marginBottom: 16 },
  showPasswordText: { color: COLORS.gray, fontSize: 14, fontWeight: "600" },
  error: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.dangerSoft,
    borderRadius: RADIUS.sm,
    padding: 12,
    marginBottom: 14,
  },
  errorText: { color: COLORS.danger, fontSize: 15, flex: 1 },
  help: { color: "#BDBDBD", fontSize: 14, textAlign: "center", marginTop: 20, lineHeight: 20 },
});
