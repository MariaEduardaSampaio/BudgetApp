import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import AuthLayout, { AuthLink, AuthMessage, ShowPasswordToggle } from "../src/components/AuthLayout";
import Button from "../src/components/ui/Button";
import Field from "../src/components/ui/Field";
import { useAuth } from "../src/hooks/useAuth";
import { friendlyError } from "../src/utils/errors";

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, linkError, clearLinkError } = useAuth();
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

  const goToForgotPassword = () => {
    clearLinkError();
    router.push("/forgot-password");
  };

  return (
    <AuthLayout
      title="Entrar"
      footer={<Text style={styles.help}>Não tem acesso? Fale com quem administra o sistema.</Text>}
    >
      {linkError && (
        <AuthMessage type="error">
          O link de troca de senha expirou ou já foi usado. Toque em &quot;Esqueci minha senha&quot; para receber outro.
        </AuthMessage>
      )}

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
      <ShowPasswordToggle visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />

      {error && <AuthMessage type="error">{error}</AuthMessage>}

      <Button title="Entrar" icon="log-in-outline" size="lg" loading={loading} onPress={submit} />
      <AuthLink title="Esqueci minha senha" onPress={goToForgotPassword} />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  help: { color: "#BDBDBD", fontSize: 14, textAlign: "center", marginTop: 20, lineHeight: 20 },
});
