import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { PAGE_ALLOWED_ROLES } from './hooks/usePermissions';

import Dashboard       from './pages/Dashboard';
import Login           from './pages/Login';
import MeuPerfil       from './pages/MeuPerfil';
import MinhaAgenda     from './pages/MinhaAgenda';
import Pessoas         from './pages/Pessoas';
import PerfilPessoa    from './pages/PerfilPessoa';
import Familias        from './pages/Familias';
import Lideranca       from './pages/Lideranca';
import Celulas         from './pages/Celulas';
import Ministerios     from './pages/Ministerios';
import Eventos         from './pages/Eventos';
import Discipulado     from './pages/Discipulado';
import Acompanhamento  from './pages/Acompanhamento';
import Escalas         from './pages/Escalas';
import Relatorios      from './pages/Relatorios';
import Configuracoes   from './pages/Configuracoes';

/**
 * Cada rota tem o seu próprio ProtectedRoute com allowedRoles derivado de
 * PAGE_ALLOWED_ROLES (usePermissions.ts). Isto garante que uma URL digitada
 * directamente também é bloqueada — não apenas via navegação.
 */
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Container autenticado (qualquer role) */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Layout />}>

          {/* Dashboard — todos os roles */}
          <Route index element={<Dashboard />} />

          {/* Meu Perfil — exclusivo para MEMBER */}
          <Route element={<ProtectedRoute allowedRoles={PAGE_ALLOWED_ROLES['/meu-perfil']} />}>
            <Route path="meu-perfil" element={<MeuPerfil />} />
          </Route>

          {/* Minha Agenda — todos os roles */}
          <Route element={<ProtectedRoute allowedRoles={PAGE_ALLOWED_ROLES['/minha-agenda']} />}>
            <Route path="minha-agenda" element={<MinhaAgenda />} />
          </Route>

          {/* Pessoas — LEADER+ */}
          <Route element={<ProtectedRoute allowedRoles={PAGE_ALLOWED_ROLES['/pessoas']} />}>
            <Route path="pessoas"     element={<Pessoas />} />
            <Route path="pessoas/:id" element={<PerfilPessoa />} />
          </Route>

          {/* Famílias — PASTOR, ADMIN */}
          <Route element={<ProtectedRoute allowedRoles={PAGE_ALLOWED_ROLES['/familias']} />}>
            <Route path="familias" element={<Familias />} />
          </Route>

          {/* Liderança — DISCIPLER+ */}
          <Route element={<ProtectedRoute allowedRoles={PAGE_ALLOWED_ROLES['/lideranca']} />}>
            <Route path="lideranca" element={<Lideranca />} />
          </Route>

          {/* Células — LEADER+ */}
          <Route element={<ProtectedRoute allowedRoles={PAGE_ALLOWED_ROLES['/celulas']} />}>
            <Route path="celulas" element={<Celulas />} />
          </Route>

          {/* Ministérios — PASTOR, ADMIN */}
          <Route element={<ProtectedRoute allowedRoles={PAGE_ALLOWED_ROLES['/ministerios']} />}>
            <Route path="ministerios" element={<Ministerios />} />
          </Route>

          {/* Eventos — todos os roles */}
          <Route path="eventos" element={<Eventos />} />

          {/* Discipulado — LEADER+ */}
          <Route element={<ProtectedRoute allowedRoles={PAGE_ALLOWED_ROLES['/discipulado']} />}>
            <Route path="discipulado" element={<Discipulado />} />
          </Route>

          {/* Acompanhamento — LEADER+ */}
          <Route element={<ProtectedRoute allowedRoles={PAGE_ALLOWED_ROLES['/acompanhamento']} />}>
            <Route path="acompanhamento" element={<Acompanhamento />} />
          </Route>

          {/* Escalas — PASTOR, ADMIN */}
          <Route element={<ProtectedRoute allowedRoles={PAGE_ALLOWED_ROLES['/escalas']} />}>
            <Route path="escalas" element={<Escalas />} />
          </Route>

          {/* Relatórios — DISCIPLER+ */}
          <Route element={<ProtectedRoute allowedRoles={PAGE_ALLOWED_ROLES['/relatorios']} />}>
            <Route path="relatorios" element={<Relatorios />} />
          </Route>

          {/* Configurações — ADMIN apenas */}
          <Route element={<ProtectedRoute allowedRoles={PAGE_ALLOWED_ROLES['/configuracoes']} />}>
            <Route path="configuracoes" element={<Configuracoes />} />
          </Route>

        </Route>
      </Route>

      {/* Qualquer rota desconhecida → home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
