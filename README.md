# RCP Connect

Aplicação React/Vite do RCP Connect com Supabase remoto como backend principal e Netlify como frontend de produção inicial.

## Produção

- Frontend: `https://rcp-connect-web-pedro.netlify.app`
- Vercel: `https://rcp-connect.vercel.app`
- Supabase: configurado por variáveis de ambiente, sem project ref publicado no repositório

## Setup

1. Instale dependências com `npm install`
2. Copie `.env.example` para `.env`
3. Preencha:
   `SUPABASE_URL`
   `SUPABASE_ANON_KEY`
   `VITE_ENABLE_GOOGLE_AUTH`
4. Rode com Netlify Functions para que o browser use `/api/*`:
   `npx netlify dev`

## Fluxo de Auth

- Email/password pelo endpoint serverless `/api/auth/login`
- Google OAuth pelo endpoint serverless `/api/auth/google`, com callback em `/api/auth/callback`
- A sessão fica em cookies `HttpOnly`, sem tokens Supabase acessíveis ao JavaScript do browser
- Primeiro acesso cria `Person` e `User` automaticamente com role inicial `MEMBER`

## Redirects de OAuth

No Supabase Auth, use um domínio estável na allowlist, como `https://rcp-connect.vercel.app/api/auth/callback` ou `https://rcp-connect-web-pedro.netlify.app/api/auth/callback`. Evite URLs de deploy com hash da Vercel, porque elas podem deixar de existir e causar `DEPLOYMENT_NOT_FOUND` após o login Google.

## Validação

- `npm run lint`
- `npm run build`
- `npm run test:run`
- `npm run test:e2e`

## Supabase

- `supabase/config.toml` está alinhado com o Netlify e o projeto remoto
- `supabase/migrations/` contém a base inicial e a expansão de schema para o lançamento
- `supabase/seed.sql` mantém `Role` e `Campus` como seed inicial

## Estado atual

- O frontend já não depende de `mockData`
- Os módulos principais usam `DataContext` assíncrono ligado ao Supabase
- Algumas associações avançadas dependem da migration aditiva:
  `FamilyMember`
  `MinistryMember`
  `EventRegistration`
  `ScheduleAssignment`
  `NotificationPreference`
  `AppSetting`
