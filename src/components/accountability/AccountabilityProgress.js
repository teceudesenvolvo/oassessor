import React from 'react';

const PROGRESS_STEPS = [
  { key: 'configuracao', label: 'Configuração' },
  { key: 'contas', label: 'Contas' },
  { key: 'receitas', label: 'Receitas' },
  { key: 'despesas', label: 'Despesas' },
  { key: 'documentos', label: 'Documentos' },
  { key: 'conciliacao', label: 'Conciliação' },
  { key: 'revisao', label: 'Revisão' },
  { key: 'fechamento', label: 'Fechamento' }
];

export default function AccountabilityProgress({ checks = {}, progress = 0 }) {
  return (
    <div className="accountability-progress-shell">
      <div className="campaign-goal-progress">
        <div className="campaign-goal-progress-bar" style={{ width: `${progress}%` }} />
      </div>
      <div className="accountability-progress-grid">
        {PROGRESS_STEPS.map((step) => (
          <div key={step.key} className={`accountability-progress-item ${checks[step.key] ? 'done' : ''}`}>
            <strong>{step.label}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
