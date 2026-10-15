import { useRouter } from "expo-router";
import { useState } from "react";
import AuthLayout, { AuthLink, AuthMessage, ShowPasswordToggle } from "../src/components/AuthLayout";
import Button from "../src/components/ui/Button";
import Field from "../src/components/ui/Field";
import { useAuth } from "../src/hooks/useAuth";
import { friendlyError } from "../src/utils/errors";
import { getPasswordErrors, MIN_PASSWORD_LENGTH, PasswordErrors } from "../src/utils/validators";

/**
 * Criar nova senha. Usada em dois casos:
 * - pelo link do e-mail de "esqueci minha senha" (recovering) — ao salvar, entra no app;
 * - por quem já está logado, em Conta → Trocar senha — ao salvar, volta para o app.
 */
export default function ResetPasswordScreen() {
  const router = useRouter();
  const { session, recovering, updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<PasswordErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const goToApp = () => (router.canGoBack() ? router.back() : router.replace("/"));

  const submit = async () => {
    const errors = getPasswordErrors(password, confirmation);
    setFieldErrors(errors);
    if (errors.password || errors.confirmation) return;

    setError(null);
    setLoading(true);
    try {
      await updatePassword(password);
      setDone(true);
    } catch (e) {
      setError(friendlyError(e, "Não foi possível trocar a senha. Tente novamente."));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <AuthLayout title="Senha alterada!">
        <AuthMessage type="success">Pronto! Da próxima vez, entre com a senha nova.</AuthMessage>
        <Button title="Ir para os orçamentos" icon="arrow-forward" size="lg" onPress={() => router.replace("/")} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={recovering ? "Criar nova senha" : "Trocar senha"}
      subtitle={`${session?.user.email ?? ""}\nUse pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`}
    >
      <Field
        label="Nova senha"
        value={password}
        onChangeText={setPassword}
        error={fieldErrors.password}
        placeholder="Nova senha"
        secureTextEntry={!showPasswords}
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <Field
        label="Repita a nova senha"
        value={confirmation}
        onChangeText={setConfirmation}
        error={fieldErrors.confirmation}
        placeholder="Repita a nova senha"
        secureTextEntry={!showPasswords}
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        onSubmitEditing={submit}
        containerStyle={{ marginBottom: 6 }}
      />
      <ShowPasswordToggle plural visible={showPasswords} onToggle={() => setShowPasswords((v) => !v)} />

      {error && <AuthMessage type="error">{error}</AuthMessage>}

      <Button title="Salvar nova senha" icon="checkmark" size="lg" loading={loading} onPress={submit} />
      {/* Pelo link do e-mail não há para onde "voltar": a pessoa precisa criar a senha. */}
      {!recovering && <AuthLink title="Cancelar" onPress={goToApp} />}
    </AuthLayout>
  );
}
