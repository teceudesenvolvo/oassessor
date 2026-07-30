import React from 'react';
import { useOutletContext } from 'react-router-dom';
import InsightPanel from '../../../components/dashboard/InsightPanel';

export default function PendingIssuesTab() {
  const { summary } = useOutletContext();
  const { metrics, attention } = summary;

  const issues = [
    { title: 'Documentos faltantes', value: metrics.missingDocs, detail: 'Lançamentos sem anexo mínimo.' },
    { title: 'Receitas sem comprovação', value: attention.revenuesWithoutProof, detail: 'Receitas aguardando comprovação.' },
    { title: 'Despesas sem documento', value: attention.expensesWithoutDocument, detail: 'Saídas sem evidência documental.' },
    { title: 'Divergências de saldo', value: attention.balanceDivergences, detail: 'Contas com saldo incompatível.' },
    { title: 'Pendências de revisão', value: attention.pendingReviews, detail: 'Itens aguardando conferência humana.' }
  ];

  return (
    <InsightPanel title="Pendências" subtitle="Fila operacional para revisão e correção">
      <div className="campaign-alert-list accountability-pending-list">
        {issues.map((issue) => (
          <div key={issue.title} className="campaign-alert-item">
            <div>
              <strong>{issue.title}</strong>
              <p>{issue.value} ocorrência(s). {issue.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </InsightPanel>
  );
}
