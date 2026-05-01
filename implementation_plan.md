# Família V2 - Agregado Familiar (RCP Connect)

Este plano detalha a implementação do novo sistema de famílias, que tem como objetivo representar a "Casa" (o agregado familiar próximo) de um membro. O foco é segurança de RLS, design UI claro, e a introdução de papéis familiares.

> [!IMPORTANT]
> **Segurança RLS e Dados:**
> Todo o processo baseia-se em *adições seguras*. Não faremos drop de tabelas, nem exporemos acesso indevido por RLS. Os admins controlam remoções definitivas e os próprios utilizadores controlam a entrada no próprio agregado.

## User Review Required
Por favor, rever as policies propostas e as novas estruturas de base de dados apresentadas abaixo. A tua confirmação far-nos-á arrancar a bateria de tarefas de forma autónoma, parando apenas se houverem conflitos técnicos de risco.

## Open Questions
- Existe alguma preferência pelo nome da nova tabela de pedidos de remoção? Assumirei `FamilyRemovalRequest`.

## Proposed Changes

---

### Phase 1: Estabilização (Task 1) [CONCLUÍDO ✅]

O erro atual de "Erro ao aceitar convite" e provável erro a rejeitar convites deve-se à restrição RLS imposta às operações de `UPDATE` e `DELETE` na tabela `FamilyMember`, que atualmente só permitem acesso a administradores. 

#### [NEW] `supabase/migrations/[TIMESTAMP]_fix_family_member_update_delete.sql`
- **Migration:** Substituir a policy de `UPDATE` para permitir que o convidado atualize o seu próprio convite pendente. Criar policy de `DELETE` para permitir que o convidado apague (rejeite) o seu próprio convite pendente.

---

### Phase 2: Reforço de Dados (Tasks 2 e 3) [CONCLUÍDO ✅]

Auditoria do schema revela que as tabelas `Family` e `FamilyMember` já suportam a maior parte do necessário. O campo `relationship` já existe, mas vamos padronizá-lo e adicionar novos campos mínimos.

#### [NEW] `supabase/migrations/[TIMESTAMP]_familia_v2_schema.sql`
- **Tabela FamilyMember:** 
  - `ADD COLUMN IF NOT EXISTS "invitedByPersonId" text` (opcional).
  - `ADD COLUMN IF NOT EXISTS "acceptedAt" timestamptz`.
- **Nova Tabela FamilyRemovalRequest:**
  - `id text PRIMARY KEY`
  - `familyId text`
  - `personId text`
  - `requestedByPersonId text`
  - `reason text`
  - `status text DEFAULT 'PENDING'`
  - `createdAt timestamptz DEFAULT NOW()`
  - `resolvedAt timestamptz`
  - `resolvedByPersonId text`
- **Policies:** Utilizadores podem inserir requests se pertencerem à família; apenas admins atualizam para APPROVED/REJECTED.

---

### Phase 3: Backend e Context (Tasks 4 e 5) [CONCLUÍDO ✅]

#### [MODIFY] `server/api-handler.js`
- Adicionar suporte a campos de relação (Pai, Mãe, Filho, etc.) durante o convite.
- Atualizar a função `/family-members/accept` para não fazer `.select()` onde não deva, caso haja ainda restrição.
- Criar novo endpoint `/family` (POST) para criar família diretamente.
- Criar endpoint para submeter um `removal-request`.

#### [MODIFY] `src/contexts/DataContext.tsx`
- Refletir os novos campos e a criação das requisições de remoção para a UI.

#### [MODIFY] `src/types/domain.ts`
- Atualizar `FamilyMember` com `acceptedAt` e `invitedByPersonId`.
- Adicionar o type `FamilyRemovalRequest`.

---

### Phase 4: UI/UX (Tasks 6, 7, 8 e 9) [CONCLUÍDO ✅]

#### [MODIFY] `src/pages/Familia.tsx`
- Introduzir um "Empty State" atraente para quem não tem família, com botão "Criar Família".
- Adicionar os modais de confirmação descritos (para enviar e para receber convites).
- Implementar lista de membros bonita (avatar circular, posição, labels).
- Painel modal em clique para ver os dados básicos do familiar (telefone, email, morada, botão de Mapas).
- Botão/lógica para "Solicitar Remoção" a admins. Se o utilizador logado for Admin, mostra botão vermelho direto para "Remover Membro".

## Verification Plan

### Automated Tests
- Correr `npm run lint`, `npm run build` e `npm run test:run` a cada passo para garantir retrocompatibilidade.

### Manual Verification
- Teste de fluxo completo na Web: 
  1. Criação a zero.
  2. Convite com posição ("Mãe").
  3. Aceitação por outro perfil.
  4. Visualização de cartões na UI.
  5. Pedido de remoção enviado por um utilizador comum.
  6. Remoção feita com sucesso por um Admin.
