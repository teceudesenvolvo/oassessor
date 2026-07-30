import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Lock, RotateCcw } from 'lucide-react';
import InsightPanel from '../../../components/dashboard/InsightPanel';
import { listScopedCollection, upsertScopedRecord } from '../../../services/accountabilityService';

export default function ClosingTab() {
  const { scope, user, reload } = useOutletContext();
  const [recordId, setRecordId] = useState(null);
  const [closingStatus, setClosingStatus] = useState('pronta para fechamento');
  const [justification, setJustification] = useState('');

  useEffect(() => {
    const load = async () => {
      const list = await listScopedCollection('closing', scope);
      if (list[0]) {
        setRecordId(list[0].id);
        setClosingStatus(list[0].status || 'pronta para fechamento');
        setJustification(list[0].justification || '');
      }
    };
    if (scope?.adminId) load();
  }, [scope]);

  const persist = async (status) => {
    const id = await upsertScopedRecord('closing', {
      status,
      justification,
      closedAt: status === 'fechada' ? new Date().toISOString() : '',
      reopenedAt: status === 'reaberta' ? new Date().toISOString() : ''
    }, scope, user, recordId);
    setRecordId(id);
    setClosingStatus(status);
    await reload();
  };

  return (
    <div className="campaign-main-grid accountability-main-grid">
      <InsightPanel title="Fechamento" subtitle="Controle seguro do encerramento e reabertura">
        <div className="campaign-notes-list">
          <div className="campaign-note-item">
            <strong>Status atual</strong>
            <p>{closingStatus}</p>
          </div>
          <div className="campaign-note-item">
            <strong>Observação operacional</strong>
            <p>Esta central apoia a organização e conferência, sem substituir contador, jurídico ou sistema oficial.</p>
          </div>
        </div>
      </InsightPanel>

      <InsightPanel title="Justificativa e ação" subtitle="Fechamento e reabertura sempre auditáveis" compact>
        <textarea className="campaign-filter-select" value={justification} onChange={(event) => setJustification(event.target.value)} placeholder="Descreva a justificativa para fechar ou reabrir a prestação." />
        <div className="funnel-modal-actions">
          <button type="button" className="btn-secondary" onClick={() => persist('reaberta')} disabled={!justification.trim()}>
            <RotateCcw size={16} />
            Reabrir
          </button>
          <button type="button" className="btn-primary" onClick={() => persist('fechada')} disabled={!justification.trim()}>
            <Lock size={16} />
            Fechar prestação
          </button>
        </div>
      </InsightPanel>
    </div>
  );
}
