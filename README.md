# RCP Connect

Aplicação React/Vite do RCP Connect com Supabase remoto como backend principal e Netlify como frontend de produção inicial.

## Produção

- Frontend: `https://rcp-connect-web-pedro.netlify.app`
- Supabase: configurado por variáveis de ambiente, sem project ref publicado no repositório

## Setup

1. Instale dependências com `npm install`
2. Copie `.env.example` para `.env`
3. Preencha:
   `SUPABASE_URL`
   `SUPABASE_ANON_KEY`
4. Rode com Netlify Functions para que o browser use `/api/*`:
   `npx netlify dev`

## Fluxo de Auth

- Magic link por email
- Email/password pelo endpoint serverless `/api/auth/login`
- A sessão fica em cookies `HttpOnly`, sem tokens Supabase acessíveis ao JavaScript do browser
- Primeiro acesso cria `Person` e `User` automaticamente com role inicial `MEMBER`

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
