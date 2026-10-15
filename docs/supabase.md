# Configurando o Supabase

Passo a passo para colocar o banco de dados e o login no ar. Leva uns 20 minutos.

## 1. Criar o projeto

1. Entre em [supabase.com](https://supabase.com) → **Start your project** → entre com o GitHub.
2. **New project**:
   - **Name:** `oficina-alocar`
   - **Database Password:** clique em *Generate a password* e **guarde num lugar seguro** (gerenciador de senhas).
   - **Region:** `South America (São Paulo)` — mais perto, mais rápido.
   - Plano **Free**.
3. Espere o projeto ficar pronto (~2 min).

> O plano gratuito **pausa o projeto depois de 7 dias sem nenhum acesso**. Com uso frequente não acontece; se pausar, é só entrar no painel e clicar em *Restore*.

## 2. Criar as tabelas

1. Menu lateral → **SQL Editor** → **New query**.
2. Cole **todo** o conteúdo de [`supabase/migrations/20261015000000_initial_schema.sql`](../supabase/migrations/20261015000000_initial_schema.sql) e clique em **Run**.
   Deve aparecer *Success. No rows returned*.
3. Numa nova query, crie a oficina:

   ```sql
   insert into public.workshops (name) values ('Oficina Alocar');
   ```

## 3. Desligar o cadastro público

Só quem você cadastrar pode entrar.

**Authentication** → **Sign In / Providers** → em *User Signups*, **desative "Allow new users to sign up"** → **Save**.

## 4. Criar os usuários

**Authentication** → **Users** → **Add user** → **Create new user**, para cada pessoa (seu pai, seu irmão e você, para testar):

- **Email** e **Password** da pessoa (senha com pelo menos 8 caracteres)
- Marque **Auto Confirm User**

## 5. Vincular os usuários à oficina

No **SQL Editor**, troque os e-mails e rode. O script cria a oficina se ela ainda não existir e **mostra no resultado cada vínculo criado**:

```sql
insert into public.workshops (name)
select 'Oficina Alocar'
 where not exists (select 1 from public.workshops where name = 'Oficina Alocar');

insert into public.workshop_members (workshop_id, user_id)
select w.id, u.id
  from public.workshops w
  join auth.users u
    on lower(u.email) in ('email-do-pai@gmail.com', 'email-do-irmao@gmail.com', 'seu-email@gmail.com')
 where w.name = 'Oficina Alocar'
on conflict do nothing
returning user_id;
```

> **Atenção:** se o resultado vier **vazio** ("No rows returned"), **ninguém foi vinculado**: o e-mail não existe neste projeto (confira se o painel aberto é o mesmo projeto da `EXPO_PUBLIC_SUPABASE_URL`) ou o usuário já estava vinculado.

Para conferir quem tem acesso:

```sql
select u.email, w.name
  from public.workshop_members m
  join auth.users u on u.id = m.user_id
  join public.workshops w on w.id = m.workshop_id;
```

> Usuário que fizer login sem estar vinculado não vê nenhum orçamento e recebe a mensagem *"Seu usuário ainda não está vinculado a uma oficina"* ao tentar salvar.

## 6. Pegar as chaves

**Project Settings** (engrenagem) → **API Keys**:

- **Project URL** (também em *Data API*): `https://xxxx.supabase.co`
- **Publishable key**: `sb_publishable_...` (se o painel mostrar só as chaves antigas, use a **anon public**)

> Nunca use a **secret** / **service_role** no site: ela ignora a segurança do banco.

## 7. Configurar o site

### No seu computador

Copie `.env.example` para `.env.local` e preencha:

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_...
```

Depois rode `npx expo start --web --clear` (o `--clear` é necessário sempre que mudar essas variáveis, porque o Expo coloca os valores dentro do código no build).

### Na Vercel

Projeto → **Settings** → **Environment Variables** → adicione as duas variáveis (mesmos nomes e valores), marcando **Production**, **Preview** e **Development**.

Depois: **Deployments** → no último deploy, **⋯** → **Redeploy**. (As variáveis só entram num build novo.)

## 8. Testar

1. Abra o site → deve aparecer a tela de **login**.
2. Entre com o seu usuário → crie um orçamento → ele recebe o **Nº 0001**.
3. Entre com outro usuário (ex.: aba anônima) → o orçamento aparece para ele também.
4. Se o celular já tinha orçamentos salvos da versão antiga, o **Histórico** mostra o botão **"Enviar para a nuvem"**.

## 9. E-mail de "Esqueci minha senha"

O site tem as telas **Esqueci minha senha** (no login) e **Conta → Trocar senha** (logado). Para o e-mail de troca de senha funcionar, faça estas três configurações:

### 9.1 Endereços permitidos

**Authentication** → **URL Configuration**:

- **Site URL:** `https://alocar-budgets.vercel.app`
- **Redirect URLs** → *Add URL*:
  - `https://alocar-budgets.vercel.app/reset-password`
  - `http://localhost:8081/reset-password` (para testar no seu computador)

> Se trocar o domínio do site na Vercel, atualize aqui também.

### 9.2 Servidor de e-mail (SMTP) — obrigatório

O e-mail padrão do Supabase **só envia para os e-mails da equipe do projeto no Supabase** (ou seja, o do seu pai não receberia) e no máximo poucos e-mails por hora. Use um Gmail para enviar:

1. Na conta Google que vai enviar (pode ser a sua ou uma da oficina): **Conta Google** → **Segurança** → ative a **Verificação em duas etapas**.
2. Ainda em Segurança, procure **Senhas de app** → crie uma chamada `Supabase` → copie a senha de 16 letras.
3. No Supabase: **Authentication** → **Emails** → aba **SMTP Settings** → ative **Enable custom SMTP**:
   - **Sender email:** o Gmail acima
   - **Sender name:** `Oficina Alocar`
   - **Host:** `smtp.gmail.com`
   - **Port:** `465`
   - **Username:** o Gmail acima
   - **Password:** a senha de app de 16 letras
4. **Save**.

### 9.3 Texto do e-mail em português

**Authentication** → **Emails** → aba **Templates** → **Reset Password**:

- **Subject:** `Criar nova senha – Orçamentos Oficina Alocar`
- **Body:**

  ```html
  <h2>Criar nova senha</h2>
  <p>Recebemos um pedido para trocar a senha do site de orçamentos da <strong>Oficina Alocar</strong>.</p>
  <p><a href="{{ .ConfirmationURL }}">Clique aqui para criar uma nova senha</a></p>
  <p>O link vale por 1 hora. Se não foi você que pediu, é só ignorar este e-mail.</p>
  ```

### Testar

Saia da conta → **Esqueci minha senha** → seu e-mail → abra o link → **Criar nova senha** → depois de salvar, você já entra no app.

## Plano B: trocar a senha pelo SQL

Se o e-mail não chegar por algum motivo, você pode definir uma senha nova direto pelo **SQL Editor**:

```sql
update auth.users
   set encrypted_password = extensions.crypt('NOVA-SENHA-AQUI', extensions.gen_salt('bf'))
 where email = 'email-da-pessoa@gmail.com';
```
