# Auditoria de Preparação para Escala - RCP Connect

Data da auditoria: 2026-05-05

Escopo desta rodada:
- Apenas documentação e auditoria leve do código local no clone oficial.
- Sem alterações funcionais.
- Sem alterações em autenticação, RLS, migrations, `/api/data`, `package.json` ou Supabase remoto.
- Sem testes de carga em produção.

## 1. Resumo executivo

A arquitetura atual parece adequada para um MVP e para uma fase inicial controlada: um frontend React/Vite, uma API serverless no Vercel e o Supabase como Auth/Postgres formam uma base simples, produtiva e com baixo custo operacional.

Os maiores riscos para uma quantidade grande de utilizadores estão concentrados em carregamento global de dados, consultas amplas, payloads crescentes e ausência de limites explícitos. O endpoint `/api/data` agrega muitas tabelas em uma única resposta, o `DataContext` hidrata grande parte do domínio de uma vez, e várias páginas filtram/paginam no cliente depois de receber todos os dados disponíveis. Esse padrão é simples para MVP, mas pode degradar quando `Person`, `CellGroup`, `FamilyMember`, `Event`, notificações e acompanhamentos crescerem.

Antes de abrir para muitos utilizadores, as áreas que mais precisam de atenção são:
- Definir metas de escala mensuráveis.
- Medir tamanho e duração de `/api/data`.
- Introduzir paginação server-side nos domínios de maior crescimento.
- Revisar índices, foreign keys e planos de queries no Postgres.
- Criar staging antes de qualquer teste de carga.
- Adicionar observabilidade, alertas, rate limiting e critérios de rollback.

## 2. Arquitetura atual

Fluxo principal observado:

```text
Frontend React/Vite
  ↓
Vercel/serverless API
  ↓
Supabase Auth
  ↓
Supabase Postgres
  ↓
RLS/policies
  ↓
DataContext/frontend
```

Componentes principais:
- Frontend: React 19, Vite 6, React Router, Tailwind, componentes próprios.
- API: handler central em `server/api-handler.js`, exposto por `/api/index` via `vercel.json`.
- Dados: Supabase/Postgres com migrations SQL versionadas em `supabase/migrations/`.
- Estado: `src/contexts/DataContext.tsx` centraliza dados de domínio e operações de mutação.
- Deploy: configuração Vercel com rewrite de `/api/(.*)` para `/api/index?path=$1`; também existe `netlify.toml`, mas a rota API auditada está modelada para Vercel.

## 3. O que significa "gigante"

Antes de falar em escala, o projeto precisa definir metas operacionais. Esta tabela não inventa números finais; ela existe para ser preenchida com objetivos reais do produto e limites de custo.

| Métrica | Valor alvo | Observações |
| --- | --- | --- |
| MAU - utilizadores ativos mensais | A definir | Quantos utilizadores únicos por mês. |
| DAU - utilizadores ativos diários | A definir | Base para estimar tráfego diário. |
| Utilizadores simultâneos | A definir | Quantas sessões ativas ao mesmo tempo. |
| Requests por segundo | A definir | Separar média, pico e endpoints críticos. |
| Writes por segundo | A definir | Incluir pessoas, famílias, eventos, notificações e leituras. |
| Tamanho esperado da base de dados | A definir | Linhas por tabela e crescimento mensal. |
| P95 de latência | A definir | Principal meta de UX para endpoints críticos. |
| P99 de latência | A definir | Meta para cauda longa e picos. |
| Erro máximo aceitável | A definir | Exemplo de gate futuro: abaixo de 1%. |
| Teto de custo mensal | A definir | Vercel, Supabase e observabilidade. |

## 4. Riscos principais encontrados

### `/api/data` agrega muitas tabelas

Em `server/api-handler.js`, `getData()` monta uma resposta única com 21 consultas em `Promise.all`: 5 tabelas obrigatórias (`Campus`, `Role`, `User`, `Person`, `CellGroup`) e 16 blocos opcionais/condicionais via `optionalSelect` ou equivalente (`DiscipleshipPair`, `FollowUp`, `Family`, `Ministry`, `Event`, `Schedule`, `FamilyMember`, `MinistryMember`, `EventRegistration`, `ScheduleAssignment`, `NotificationPreference`, `AppSetting`, `PrayerRequest`, `SystemNotification`, `DiscipleshipJournal`, `FamilyRemovalRequest` para admin).

Risco: conforme o volume cresce, cada abertura do app pode disparar consultas amplas, payload grande e processamento adicional de filtragem no servidor e no cliente.

### `getAuthUser()` calcula escopo lendo tabelas amplas

O cálculo de escopo (`computeScope`) lê `Person` com `id, campusId, cellGroupId` e `CellGroup` com `id, leaderId, campusId` para montar `supervisedCellIds`, `memberIds` e `leaderPersonIds`. Isso é útil para permissões de leitura no frontend, mas tende a crescer junto com a base de pessoas e células.

Risco: cada `/api/data` também paga esse custo antes de responder.

### `DataContext` centraliza muitos dados globais

`src/contexts/DataContext.tsx` chama `apiRequest('/data')`, mapeia a resposta inteira para o estado global e, após várias mutações, chama `refetch()` novamente. Isso simplifica consistência para MVP.

Risco: operações pequenas podem recarregar o domínio inteiro, aumentando latência, tráfego e renderizações.

### Paginação e filtros estão no cliente

`src/pages/Pessoas.tsx` usa `PER_PAGE = 8`, mas a paginação acontece sobre `filtered.slice(...)` depois de receber todos os `persons` do `DataContext`. As páginas de células, família, eventos e dashboard também dependem de arrays globais e fazem muitos `filter`, `map` e `slice` no cliente.

Risco: a UX pode continuar mostrando poucas linhas, mas o custo real já foi pago no backend, na rede e na memória do browser.

### Family, People, Cells e Events são domínios de crescimento

As tabelas e telas com maior tendência de crescimento são `Person`, `FamilyMember`, `CellGroup`, `Event`, `EventRegistration`, `SystemNotification`, `PrayerRequest`, `FollowUp` e `DiscipleshipJournal`.

Risco: sem paginação, índices adequados e métricas por endpoint, o crescimento pode aparecer primeiro como lentidão em `/api/data`, dashboard, pessoas e família.

### Serverless + Postgres connection pressure

A API roda em modelo serverless. Picos de tráfego podem gerar muitas invocações simultâneas chamando Supabase/Postgres. A documentação da Vercel destaca limites de execução, payload e comportamento de funções serverless, e a documentação do Supabase recomenda acompanhar conexões, planos de query e advisors.

Risco: mesmo sem CPU alta no frontend, picos podem pressionar conexões e consultas simultâneas no banco.

### RLS e funções SECURITY DEFINER precisam de revisão de performance

As migrations incluem muitas policies RLS e várias funções `SECURITY DEFINER`, especialmente em escopo de pessoas, células, família, notificações e discipulado.

Risco: policies complexas podem gerar planos mais caros, especialmente quando combinadas com consultas amplas e tabelas grandes.

### Ausência de cache explícito para dados de aplicação

O handler retorna `Cache-Control: no-store` em respostas utilitárias/autenticação e não foi observado cache de aplicação para `/api/data`.

Risco: leituras repetidas de dados pouco voláteis, como campus, roles e settings, podem ser recalculadas e reenviadas com frequência.

### Ausência de rate limiting explícito

Não foi encontrado controle explícito de rate limiting nos endpoints auditados.

Risco: endpoints de busca, autenticação via API, convites, notificações e mutações podem ser pressionados por uso acidental, automações ou abuso.

### Endpoints com operações sequenciais

Fluxos de família fazem várias operações sequenciais: criar família, inserir membro, procurar pessoa, verificar família existente, inserir convite, procurar nome da família, procurar remetente e criar notificação.

Risco: em tráfego maior, esses fluxos podem ficar sensíveis a latência acumulada e falhas parciais.

### Migrations e drift remoto

O repositório contém várias migrations incrementais relacionadas a família, RLS, notificações e funções auxiliares. A auditoria desta rodada não comparou com Supabase remoto.

Risco: diferença entre repo/migrations e banco remoto pode causar comportamento inesperado, falha de deploy ou problemas de performance invisíveis no código.

## 5. Auditoria por área

### A. Frontend

Observações:
- O app usa React/Vite e carrega o domínio via `DataContext`.
- `Pessoas` tem paginação visual, mas não server-side.
- `Celulas`, `Familia`, `Eventos` e `Dashboard` consomem arrays globais e filtram localmente.
- Modais e dropdowns dependem de listas já carregadas em memória.
- Avatares aparecem no modelo de `Person`; é importante monitorar tamanho e origem das imagens.
- O bundle size não foi medido nesta auditoria, mas `npm run build` deve reportar tamanhos de chunks.

Riscos:
- Renderização lenta em listas grandes.
- Memória maior no browser por sessão.
- Re-renderizações amplas após `refetch()`.
- Custo oculto por filtros client-side.

Checklist futuro:
- Medir tamanho do bundle por build.
- Medir tempo de hidratação/render de telas principais.
- Identificar listas que precisam de paginação server-side.
- Avaliar lazy loading de rotas ou componentes pesados.
- Definir limite de tamanho de avatar/imagem.

### B. Backend/API

Observações:
- `/api/data` é o principal endpoint agregador.
- `optionalSelect` permite que tabelas ainda não aplicadas no remoto não quebrem todo o carregamento.
- Mutations de `DataContext` chamam endpoints pequenos, mas em seguida recarregam `/api/data`.
- Endpoints de família têm várias chamadas Supabase sequenciais.
- Notificações usam `readBy` e leitura/atualização de várias notificações visíveis.
- Tratamento de erro existe, mas alguns erros de banco podem chegar como erro genérico se não forem mapeados para mensagens de domínio.

Riscos:
- Payload grande em `/api/data`.
- Muitas consultas por request.
- Falta de paginação e limites.
- Falta de rate limiting.
- Repetição de chamadas Supabase em fluxos de mutação.
- Possível pressão de conexão em picos serverless.

Checklist futuro:
- Medir duração de `/api/data` por etapa.
- Medir bytes da resposta.
- Medir número de linhas por coleção retornada.
- Separar endpoints paginados por domínio em fase futura.
- Adicionar limites e validação de query params antes de expor paginação.
- Mapear erros conhecidos de constraints para respostas 400/409 amigáveis.

### C. Supabase/Postgres

Observações:
- Migrations criam tabelas principais e expansões para `Person`, `CellGroup`, `Family`, `FamilyMember`, `Event`, `Schedule`, notificações, pedidos de oração e discipulado.
- Existem índices explícitos em campos importantes como `Person.cellGroupId`, `Person.campusId`, `CellGroup.leaderId`, `CellGroup.disciplerId`, `FollowUp.personId`, `FollowUp.responsibleId`, `Event.date` e `Schedule.date`.
- Existe índice único parcial para impedir mais de uma família aceita por pessoa em `FamilyMember_person_accepted_idx`.
- Existem muitas policies RLS e funções `SECURITY DEFINER`.
- Nem todas as foreign keys observadas tiveram índice explícito visível nas migrations, por exemplo tabelas de junção como `FamilyMember`, `EventRegistration`, `ScheduleAssignment` e `MinistryMember` merecem revisão.

Riscos:
- Sequential scans em tabelas que crescem.
- RLS com funções auxiliares gerando planos caros.
- Índices ausentes em foreign keys usadas em filtros/joins.
- Migrations parcialmente aplicadas no remoto.
- Índices únicos falhando em rollout se dados antigos violarem a regra.

Checklist futuro:
- Rodar Supabase Database Advisor em staging/remoto apropriado.
- Verificar `EXPLAIN ANALYZE` para queries críticas.
- Revisar índices por foreign key e por filtros reais.
- Medir `pg_stat_statements` em staging.
- Validar drift entre migrations do repo e banco remoto antes de deploy.
- Testar restore e rollback de migrations.

### D. Vercel/serverless

Observações:
- `vercel.json` reescreve `/api/(.*)` para `/api/index?path=$1`.
- O app define headers de segurança globais.
- Não foi encontrado ajuste específico de região ou timeout por função.
- Payloads grandes e cold starts não foram medidos nesta rodada.

Riscos:
- Cold start afetar P95/P99.
- Invocações simultâneas pressionarem Postgres/Supabase.
- Payload grande em `/api/data` aumentar tempo e custo.
- Região Vercel/Supabase distante aumentar latência.

Checklist futuro:
- Confirmar região Vercel e região Supabase.
- Medir cold start e duração de função.
- Definir limites de payload aceitáveis.
- Criar alertas de erro, timeout e duração.
- Confirmar limites aplicáveis do plano usado.

### E. GitHub/CI

Observações:
- `package.json` contém scripts `lint`, `build`, `test:run` e `test:e2e`.
- Não foi encontrada pasta `.github/workflows` no clone auditado.
- A auditoria não criou workflows.

Riscos:
- Falhas de build/test podem ser descobertas tarde.
- Migrations podem divergir sem verificação manual.
- Smoke tests podem não rodar antes de deploy.

Checklist futuro:
- Criar workflow manual ou por PR para lint/build/test.
- Adicionar smoke tests leves.
- Adicionar check de migrations sem executar carga pesada.
- Não rodar load test em todo PR.

## 6. Recomendações sem implementação

### Prioridade Alta

- Medir tamanho, duração e número de linhas de `/api/data`.
- Definir metas de escala e gates de aprovação antes de otimizar.
- Criar ambiente staging com banco separado.
- Revisar índices de tabelas que crescem: `Person`, `FamilyMember`, `CellGroup`, `Event`, `EventRegistration`, `SystemNotification`, `PrayerRequest`, `FollowUp`.
- Planejar paginação server-side para Pessoas e domínios grandes.
- Criar observabilidade básica para duração, erro e tamanho de payload.
- Validar drift entre migrations do repo e Supabase remoto antes de mudanças de schema.

### Prioridade Média

- Separar dados estáticos ou pouco voláteis de `/api/data`, como `Campus`, `Role` e settings.
- Criar endpoints de leitura paginados por domínio.
- Adicionar cache seguro para dados não sensíveis ou pouco voláteis.
- Mapear erros de constraints para respostas de domínio.
- Avaliar rate limiting para endpoints críticos.
- Medir bundle size e considerar lazy loading.
- Criar workflows GitHub Actions para lint/build/test e smoke test.

### Prioridade Futura

- Testes de carga em staging com k6 ou Artillery.
- Dashboards de SLO por endpoint.
- Otimizações baseadas em `pg_stat_statements`.
- Estratégia de cache por papel/permissão.
- Filas ou jobs assíncronos para notificações, se o volume justificar.
- Arquitetura incremental para quebrar `/api/data` quando métricas mostrarem necessidade.

## 7. Plano de testes de carga futuro

Este plano é teórico e deve rodar apenas em staging, nunca em produção.

1. Criar ambiente staging.
2. Criar banco Supabase staging separado.
3. Popular dados sintéticos com distribuição realista: pessoas, células, famílias, eventos, notificações e pedidos.
4. Criar smoke test para login, `/api/data`, pessoas, células, família e eventos.
5. Executar ramp-up progressivo até a meta definida.
6. Executar spike test para picos curtos.
7. Executar soak test para estabilidade por período prolongado.
8. Medir P50, P95, P99, taxa de erro, timeouts, payload, CPU/IO Postgres, conexões, memória e custo estimado.
9. Comparar resultados com os gates de aprovação.

Ferramentas possíveis:
- k6.
- Artillery.

Observação: não instalar ferramentas nesta rodada.

## 8. Critérios de aprovação

Gates sugeridos para liberar escala:
- P95 abaixo do alvo definido.
- P99 abaixo do alvo definido ou com degradação aceitável documentada.
- Taxa de erro abaixo de 1%.
- Zero timeouts recorrentes em endpoints críticos.
- Postgres com CPU e IO controlados.
- Conexões sem explosão em picos.
- `/api/data` e endpoints críticos sem payload exagerado.
- Queries críticas sem sequential scan inesperado.
- Backups configurados.
- Restore testado.
- Rollback de migrations testado.
- Alertas de custo e erro ativos.

## 9. Checklist de go-live

- Backups configurados.
- Restore testado em ambiente seguro.
- Rollback de migrations documentado.
- Alertas Vercel configurados.
- Alertas Supabase configurados.
- Cost alerts definidos.
- Logs de erro acessíveis.
- Runbook de incidente escrito.
- Dono de incidentes definido.
- Limite conhecido de utilizadores simultâneos.
- Staging validado.
- Smoke tests verdes.
- Plano de comunicação para incidente.

## 10. Próximas ações recomendadas

### A. Ações seguras para próxima rodada

- Medir tamanho da resposta de `/api/data` em dev/staging.
- Adicionar logs locais de duração de `/api/data` em dev/staging.
- Medir número de linhas por coleção retornada em `/api/data`.
- Criar um relatório de índices esperados para `FamilyMember`, `Person`, `CellGroup`, `Event`, `EventRegistration`, `SystemNotification`, `PrayerRequest` e `FollowUp`.
- Definir as metas da tabela de escala.
- Criar staging antes de qualquer load test.
- Identificar a primeira tela candidata a paginação server-side, provavelmente Pessoas.

### B. Ações que precisam de aprovação

- Instalar k6 ou Artillery.
- Criar workflows GitHub Actions.
- Alterar migrations.
- Alterar RLS.
- Criar cache.
- Quebrar `/api/data` em endpoints menores.
- Criar endpoints paginados.
- Alterar limites, planos ou região de Vercel/Supabase.
- Acessar Supabase remoto para comparar schema.

### C. Não fazer agora

- Teste de carga em produção.
- Refactor grande sem métricas.
- Otimização sem alvo.
- Trocar stack.
- Instalar libs sem necessidade.
- Alterar autenticação.
- Alterar RLS.
- Mexer em migrations.
- Fazer push automático.

## 11. Validação desta rodada

Comandos solicitados:

```text
npm run lint
npm run build
npm run test:run
```

Resultados executados nesta rodada:

| Comando | Resultado | Observação |
| --- | --- | --- |
| `npm run lint` | Falhou | `tsc` não é reconhecido; dependências locais não estão instaladas no clone limpo. |
| `npm run build` | Falhou | `vite` não é reconhecido; dependências locais não estão instaladas no clone limpo. |
| `npm run test:run` | Falhou | `vitest` não é reconhecido; dependências locais não estão instaladas no clone limpo. |

Não foi executado `npm install` e nenhuma dependência foi instalada, conforme restrição desta rodada.

## 12. Fontes oficiais usadas como referência

- Vercel Functions Limits: https://vercel.com/docs/functions/limitations
- Vercel Functions Concurrency and Scaling: https://vercel.com/docs/functions/runtimes/concurrency-scaling
- Supabase Database Advisors: https://supabase.com/docs/guides/database/database-advisors
- Supabase pg_stat_statements: https://supabase.com/docs/guides/database/extensions/pg_stat_statements
- GitHub Actions workflows: https://docs.github.com/en/actions/using-workflows/about-workflows
