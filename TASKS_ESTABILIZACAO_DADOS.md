# Plano de Estabilização de Dados - RCP Connect

Este documento acompanha a execução das tarefas de auditoria, resiliência e correção de dados da aplicação.

## Checklist

- [x] Task 1 — Auditar schema esperado vs queries atuais
- [x] Task 2 — Tornar /data resiliente a falhas parciais
- [x] Task 3 — Corrigir DataContext para não limpar EMPTY_STATE agressivamente
- [x] Task 4 — Restaurar endereço/morada em Meu Perfil
- [x] Task 5 — Corrigir "Membro desde" com data real
- [x] Task 6 — Verificar integridade do telefone
- [x] Task 7 — Verificar migration pendente/SystemNotification
- [x] Task 8 — Criar roteiro de teste manual orientado

---

## Detalhamento da Execução

### Task 1 — Auditoria
- **Status**: Concluída
- **Resultado**: Identificado que `SystemNotification` e outras tabelas secundárias causavam falhas totais no carregamento devido à falta de resiliência.

### Task 2 — Resiliência no Backend
- **Status**: Concluída
- **Arquivos alterados**: `server/api-handler.js`
- **Resultado**: Tabelas secundárias agora são carregadas via `optionalSelect`. Se uma tabela não existir ou falhar, o `/data` retorna `[]` em vez de erro 500. Corrigido bug de referência em `discipleshipJournalsResult`.

### Task 3 — Corrigir DataContext
- **Status**: Concluída
- **Arquivos alterados**: `src/contexts/DataContext.tsx`
- **Resultado**: O `refetch` agora preserva o estado anterior em caso de erro, evitando que a interface fique vazia ("flash" de desaparecimento) se já houver dados carregados.

### Task 4 — Restaurar endereço/morada
- **Status**: Concluída (Verificado)
- **Arquivos**: `src/pages/MeuPerfil.tsx`
- **Resultado**: O campo de morada já estava implementado e mapeado para o Google Maps. A restauração ocorreu automaticamente após a correção da resiliência dos dados nas tasks anteriores.

### Task 5 — Corrigir "Membro desde"
- **Status**: Concluída
- **Arquivos alterados**: `server/api-handler.js`, `src/contexts/DataContext.tsx`
- **Resultado**: Adicionado `createdAt` à query de `Person`. O mapeamento agora usa a data real de criação (do User ou da Person) para exibir o ano correto de adesão, em vez de um valor fixo.

### Task 6 — Integridade do Telefone
- **Status**: Concluída (Verificado)
- **Arquivos**: `ProfileEditModal.tsx`, `CompletarPerfil.tsx`
- **Resultado**: Confirmado que a normalização e salvaguarda do telefone estão operacionais e não interferem nos outros campos (morada/avatar).

### Task 7 — Migration SystemNotification
- **Status**: Concluída (Verificado)
- **Arquivos**: `supabase/migrations/20260424_system_notifications.sql`
- **Resultado**: A migration já existe no projeto. O backend já foi ajustado na Task 2 para tratar esta tabela como opcional, prevenindo quebras caso a migration não tenha sido aplicada no banco remoto.

---

## Roteiro de Teste Manual

Este roteiro deve ser seguido para validar as correções em ambiente de produção/staging:

1.  **Acesso Inicial**:
    - Fazer login com uma conta de `MEMBER`.
2.  **Verificação de Perfil**:
    - Navegar para **"Meu Perfil"**.
    - Confirmar se o **Telefone** e **Morada** aparecem corretamente.
    - Confirmar se o campo **"Membro desde"** mostra um ano real (ex: 2024 ou 2025) e não apenas o ano atual de forma hardcoded.
    - Clicar em **"Ver no Google Maps"** na morada e confirmar se abre a localização correta.
3.  **Edição de Dados**:
    - Clicar em **"Atualizar Dados"**.
    - Alterar o telefone e a morada.
    - Guardar e confirmar que os dados persistem após um **Refresh (F5)** na página.
4.  **Resiliência de Dados**:
    - Navegar para o **Dashboard**.
    - Confirmar que a lista de pessoas e células está visível.
    - *Opcional*: Simular uma falha de rede ou timeout e verificar se os dados que já estavam na tela **não desaparecem** (o `DataContext` deve preservar o estado).
5.  **Onboarding (Novos Usuários)**:
    - Se possível, testar com um novo utilizador para confirmar que o ecrã de **"Completar Perfil"** guarda o telefone e a morada corretamente no primeiro acesso.
