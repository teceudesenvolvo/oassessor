import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Save, UserCog } from 'lucide-react';
import InsightPanel from '../../../components/dashboard/InsightPanel';
import { listScopedCollection, upsertScopedRecord } from '../../../services/accountabilityService';
import { logAuditEvent } from '../../../services/auditService';
import { get, ref } from '../../../services/firestoreDatabase';
import { database } from '../../../firebaseConfig';

export default function ConfigurationTab() {
  const { scope, user, reload } = useOutletContext();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [recordId, setRecordId] = useState(null);
  const [ownerProfile, setOwnerProfile] = useState(null);
  const [form, setForm] = useState({
    selectedPeriod: 'Ciclo completo',
    accountabilityStatus: 'em configuração'
  });

  useEffect(() => {
    const load = async () => {
      const [list, ownerSnapshot] = await Promise.all([
        listScopedCollection('config', scope),
        get(ref(database, `users/${scope.adminId}`))
      ]);
      if (list[0]) {
        setRecordId(list[0].id);
        setForm((prev) => ({ ...prev, ...list[0] }));
      }
      if (ownerSnapshot.exists()) {
        setOwnerProfile(ownerSnapshot.val().accountabilityProfile || {});
      }
    };
    if (scope?.adminId) load();
  }, [scope]);

  return (
    <div className="campaign-main-grid accountability-main-grid">
    <InsightPanel title="Dados-base do administrador" subtitle="Essas informações agora são preenchidas no perfil do dono da conta e reaproveitadas pela central">
      <div className="campaign-notes-list">
        <div className="campaign-note-item">
          <strong>Campanha e candidato</strong>
          <p>{ownerProfile?.campaignName || 'Não informado'} • {ownerProfile?.candidateName || 'Não informado'}</p>
        </div>
        <div className="campaign-note-item">
          <strong>Cargo, partido e eleição</strong>
          <p>{ownerProfile?.office || 'Não informado'} • {ownerProfile?.party || 'Não informado'} • {ownerProfile?.electionLabel || 'Não informado'}</p>
        </div>
        <div className="campaign-note-item">
          <strong>Financeiro e contador</strong>
          <p>{ownerProfile?.financialManager || 'Não informado'} • {ownerProfile?.accountantName || 'Não informado'}</p>
        </div>
      </div>
      <div className="funnel-modal-actions">
        <span />
        <button type="button" className="btn-secondary" onClick={() => navigate('/dashboard/profile?tab=accountability')}>
          <UserCog size={16} />
          Preencher no perfil
        </button>
      </div>
    </InsightPanel>

    <InsightPanel title="Configuração operacional da prestação" subtitle="Parâmetros internos, status e período de trabalho">
      <div className="campaign-filters-grid">
        {[
          ['selectedPeriod', 'Período selecionado'],
          ['accountabilityStatus', 'Situação da prestação']
        ].map(([key, label]) => (
          <label key={key} className="funnel-filter-field">
            <span>{label}</span>
            <input className="campaign-filter-select" value={form[key] || ''} onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))} />
          </label>
        ))}
      </div>

      <div className="funnel-modal-actions">
        <span />
        <button
          type="button"
          className="btn-primary"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            try {
              const id = await upsertScopedRecord('config', form, scope, user, recordId);
              setRecordId(id);
              await logAuditEvent({
                user,
                adminId: scope.adminId,
                action: 'update',
                entity: 'prestacao_configuracao',
                entityId: id,
                entityLabel: form.campaignName || 'Configuração da prestação',
                details: { targetName: form.campaignName || 'Configuração da prestação', changes: ['configuração geral'] }
              });
              await reload();
            } finally {
              setSaving(false);
            }
          }}
        >
          <Save size={16} />
          {saving ? 'Salvando...' : 'Salvar configuração'}
        </button>
      </div>
    </InsightPanel>
    </div>
  );
}
