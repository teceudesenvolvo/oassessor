import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';

export const ACCOUNTABILITY_TABS = [
  { key: 'visao-geral', label: 'Visão Geral' },
  { key: 'configuracao', label: 'Configuração' },
  { key: 'contas-bancarias', label: 'Contas Bancárias' },
  { key: 'receitas', label: 'Receitas' },
  { key: 'despesas', label: 'Despesas' },
  { key: 'cadastros', label: 'Cadastros' },
  { key: 'documentos', label: 'Documentos' },
  { key: 'conciliacao', label: 'Conciliação' },
  { key: 'orcamento', label: 'Orçamento' },
  { key: 'pendencias', label: 'Pendências' },
  { key: 'relatorios', label: 'Relatórios' },
  { key: 'revisao', label: 'Revisão' },
  { key: 'fechamento', label: 'Fechamento' }
];

export default function AccountabilityTabs() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentTab = ACCOUNTABILITY_TABS.find((tab) => location.pathname.includes(`/prestacao-contas/${tab.key}`))?.key || 'visao-geral';

  return (
    <>
      <div className="accountability-mobile-select">
        <label className="funnel-filter-field full">
          <span>Navegação da prestação</span>
          <select
            className="campaign-filter-select"
            value={currentTab}
            onChange={(event) => navigate(`/dashboard/prestacao-contas/${event.target.value}`)}
          >
            {ACCOUNTABILITY_TABS.map((tab) => (
              <option key={tab.key} value={tab.key}>{tab.label}</option>
            ))}
          </select>
        </label>
      </div>

      <nav className="accountability-sidebar-nav">
        {ACCOUNTABILITY_TABS.map((tab) => (
          <NavLink
            key={tab.key}
            to={`/dashboard/prestacao-contas/${tab.key}`}
            className={({ isActive }) => `profile-tab-btn ${isActive ? 'active' : ''}`}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
