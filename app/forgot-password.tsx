import { useRouter } from "expo-router";
import { useState } from "react";
import AuthLayout, { AuthLink, AuthMessage } from "../src/components/AuthLayout";
import Button from "../src/components/ui/Button";
import Field from "../src/components/ui/Field";
import { useAuth } from "../src/hooks/useAuth";
import { friendlyError } from "../src/utils/errors";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const goToLogin = () => (router.canGoBack() ? router.back() : router.replace("/login"));

  const submit = async () => {
    if (!EMAIL.test(email.trim())) {
      setError("Digite um e-mail válido.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (e) {
      setError(friendlyError(e, "Não foi possível enviar o e-mail. Tente novamente."));
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout title="Confira seu e-mail">
        {/* Mesma mensagem exista ou não a conta, para não revelar quem tem acesso. */}
        <AuthMessage type="success">
          Se {email.trim()} tiver acesso ao sistema, vai chegar um e-mail com o link para criar uma nova senha.
          Pode levar alguns minutos — confira também a caixa de spam.
        </AuthMessage>
        <Button title="Voltar para o login" icon="arrow-back" size="lg" onPress={goToLogin} />
        <AuthLink title="Não chegou? Enviar de novo" onPress={() => setSent(false)} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Esqueci minha senha"
      subtitle="Digite seu e-mail. Vamos enviar um link para você criar uma senha nova."
    >
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
        onSubmitEditing={submit}
      />

      {error && <AuthMessage type="error">{error}</AuthMessage>}

      <Button title="Enviar link" icon="mail-outline" size="lg" loading={loading} onPress={submit} />
      <AuthLink title="Voltar para o login" onPress={goToLogin} />
    </AuthLayout>
  );
}
