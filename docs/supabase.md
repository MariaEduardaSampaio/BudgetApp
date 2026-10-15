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

No **SQL Editor**, troque os e-mails e rode:

```sql
insert into public.workshop_members (workshop_id, user_id)
select w.id, u.id
  from public.workshops w
  join auth.users u on u.email in ('email-do-pai@gmail.com', 'email-do-irmao@gmail.com', 'seu-email@gmail.com')
 where w.name = 'Oficina Alocar';
```

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

## Esqueceu a senha?

O site ainda não tem a tela de "esqueci minha senha" (o e-mail de recuperação do Supabase levaria para uma página que não existe). Por enquanto, defina uma senha nova pelo **SQL Editor**:

```sql
update auth.users
   set encrypted_password = extensions.crypt('NOVA-SENHA-AQUI', extensions.gen_salt('bf'))
 where email = 'email-da-pessoa@gmail.com';
```
