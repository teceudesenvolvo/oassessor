import React from 'react';
import { useOutletContext } from 'react-router-dom';
import InsightPanel from '../../../components/dashboard/InsightPanel';
import { useAccountabilityEntity } from '../../../hooks/useAccountabilityEntity';

export default function ReconciliationTab() {
  const { scope, user } = useOutletContext();
  const revenues = useAccountabilityEntity({ user, scope, collectionKey: 'revenues', entity: 'prestacao_receita' });
  const expenses = useAccountabilityEntity({ user, scope, collectionKey: 'expenses', entity: 'prestacao_despesa' });

  const pending = [...revenues.records, ...expenses.records].filter((item) => item.status !== 'conciliada');

  return (
    <InsightPanel title="Conciliação" subtitle="Conferência entre lançamentos e posição bancária">
      <div className="campaign-list-block">
        {pending.length === 0 ? <div className="campaign-empty-state">Nenhuma transação pendente de conciliação.</div> : null}
        {pending.map((item) => (
          <article key={item.id} className="campaign-list-item">
            <div>
              <strong>{item.title}</strong>
              <p>{item.category || 'Sem categoria'} • {item.status || 'Sem status'}</p>
            </div>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => window.alert('Nesta primeira etapa, marque a conciliação editando o status do lançamento para “conciliada”.')}
            >
              Orientar conciliação
            </button>
          </article>
        ))}
      </div>
    </InsightPanel>
  );
}
