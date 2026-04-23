# RCP Connect

Aplicação React/Vite do RCP Connect com Supabase remoto como backend principal e Netlify como frontend de produção inicial.

## Produção

- Frontend: `https://rcp-connect-web-pedro.netlify.app`
- Supabase: `https://jmheztwhdrjfzfkibwko.supabase.co`

## Setup

1. Instale dependências com `npm install`
2. Copie `.env.example` para `.env`
3. Preencha:
   `VITE_SUPABASE_URL`
   `VITE_SUPABASE_ANON_KEY`
   `VITE_APP_URL`
   `VITE_ENABLE_GOOGLE_AUTH`
4. Rode `npm run dev`

## Fluxo de Auth

- Magic link por email
- Google OAuth opcional, ativado apenas quando o provider estiver configurado no Supabase e `VITE_ENABLE_GOOGLE_AUTH="true"`
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
