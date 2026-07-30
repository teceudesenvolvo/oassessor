import React from 'react';
import { NavLink } from 'react-router-dom';

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
  return (
    <div className="profile-tabs-row accountability-tabs-row">
      {ACCOUNTABILITY_TABS.map((tab) => (
        <NavLink
          key={tab.key}
          to={`/dashboard/prestacao-contas/${tab.key}`}
          className={({ isActive }) => `profile-tab-btn ${isActive ? 'active' : ''}`}
        >
          {tab.label}
        </NavLink>
      ))}
    </div>
  );
}
