import React from 'react';
import { RefreshCcw } from 'lucide-react';
import StatusBadge from './StatusBadge';
import AccountabilityProgress from './AccountabilityProgress';

export default function AccountabilityHeader({ header, checks, onReload }) {
  return (
    <section className="campaign-filters-card accountability-header-card">
      <div className="campaign-filters-header">
        <div>
          <p className="campaign-kicker">Prestação de Contas da Campanha</p>
          <h3>{header?.campaignName || 'Campanha principal'}</h3>
        </div>
        <button type="button" className="btn-secondary" onClick={onReload}>
          <RefreshCcw size={16} />
          Atualizar
        </button>
      </div>

      <div className="accountability-header-grid">
        <div className="campaign-note-item">
          <strong>Candidato</strong>
          <p>{header?.candidateName || 'Não informado'}</p>
        </div>
        <div className="campaign-note-item">
          <strong>Cargo e eleição</strong>
          <p>{header?.office || 'Cargo não informado'} • {header?.electionLabel || 'Eleição não informada'}</p>
        </div>
        <div className="campaign-note-item">
          <strong>Turno e território</strong>
          <p>{header?.round || 'Turno não informado'} • {header?.city || 'Município'}/{header?.state || 'UF'}</p>
        </div>
        <div className="campaign-note-item">
          <strong>Situação</strong>
          <p><StatusBadge status={header?.accountabilityStatus || 'não iniciada'} /></p>
        </div>
        <div className="campaign-note-item">
          <strong>Período selecionado</strong>
          <p>{header?.selectedPeriod || 'Ciclo completo'}</p>
        </div>
        <div className="campaign-note-item">
          <strong>Responsáveis</strong>
          <p>{header?.financialManager || 'Financeiro não definido'} • {header?.accountantName || 'Contador não definido'}</p>
        </div>
      </div>

      <AccountabilityProgress checks={checks} progress={header?.progress || 0} />
    </section>
  );
}
