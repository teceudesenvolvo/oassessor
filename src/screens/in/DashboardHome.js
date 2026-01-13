import React from 'react';

export default function DashboardHome() {
  return (
    <>
      <div className="dashboard-card welcome-card">
        <h3>Bem-vindo ao Painel, Candidato!</h3>
        <p>Aqui está o resumo da sua campanha hoje.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h4>Total de Eleitores</h4>
          <div className="stat-value">2.450</div>
          <span className="stat-trend positive">+12% essa semana</span>
        </div>
        <div className="stat-card">
          <h4>Equipe Ativa</h4>
          <div className="stat-value">14</div>
          <span className="stat-trend">Assessores em campo</span>
        </div>
        <div className="stat-card">
          <h4>Metas do Dia</h4>
          <div className="stat-value">85%</div>
          <span className="stat-trend positive">Concluídas</span>
        </div>
      </div>
    </>
  );
}