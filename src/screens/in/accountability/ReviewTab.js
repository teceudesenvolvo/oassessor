import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { CheckCircle2, Save } from 'lucide-react';
import InsightPanel from '../../../components/dashboard/InsightPanel';
import { listScopedCollection, upsertScopedRecord } from '../../../services/accountabilityService';

const REVIEW_ITEMS = [
  'Receitas revisadas',
  'Despesas revisadas',
  'Documentos mínimos conferidos',
  'Conciliação validada',
  'Pendências críticas tratadas'
];

const defaultChecks = REVIEW_ITEMS.reduce((acc, item) => ({ ...acc, [item]: false }), {});

export default function ReviewTab() {
  const { scope, user, reload } = useOutletContext();
  const [recordId, setRecordId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [checks, setChecks] = useState(defaultChecks);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const load = async () => {
      const list = await listScopedCollection('reviews', scope);
      if (list[0]) {
        setRecordId(list[0].id);
        setChecks(list[0].checks || defaultChecks);
        setNotes(list[0].notes || '');
      }
    };
    if (scope?.adminId) load();
  }, [scope]);

  const completed = Object.values(checks).filter(Boolean).length;

  return (
    <div className="campaign-main-grid accountability-main-grid">
      <InsightPanel title="Revisão" subtitle="Checklist configurável para conferência humana antes do fechamento">
        <div className="campaign-notes-list">
          {REVIEW_ITEMS.map((item) => (
            <label key={item} className="settings-toggle-item">
              <div>
                <strong>{item}</strong>
                <p>{checks[item] ? 'Conferido' : 'Pendente'}</p>
              </div>
              <input type="checkbox" checked={checks[item]} onChange={() => setChecks((prev) => ({ ...prev, [item]: !prev[item] }))} />
            </label>
          ))}
        </div>
      </InsightPanel>

      <InsightPanel title="Parecer de revisão" subtitle={`${completed}/${REVIEW_ITEMS.length} itens concluídos`} compact>
        <textarea className="campaign-filter-select" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Descreva inconsistências, ressalvas e recomendações para fechamento." />
        <div className="funnel-modal-actions">
          <span className="users-role-pill"><CheckCircle2 size={14} /> {completed} concluído(s)</span>
          <button
            type="button"
            className="btn-primary"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                const status = completed === REVIEW_ITEMS.length ? 'concluida' : 'em andamento';
                const id = await upsertScopedRecord('reviews', { checks, notes, status }, scope, user, recordId);
                setRecordId(id);
                await reload();
              } finally {
                setSaving(false);
              }
            }}
          >
            <Save size={16} />
            Salvar revisão
          </button>
        </div>
      </InsightPanel>
    </div>
  );
}
