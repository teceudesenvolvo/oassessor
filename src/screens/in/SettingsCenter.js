import React, { useMemo, useState } from 'react';
import { Cog, Plus, Save, Settings2, Trash2 } from 'lucide-react';
import InsightPanel from '../../components/dashboard/InsightPanel';
import MetricCard from '../../components/dashboard/MetricCard';
import { useSettingsCenter } from '../../hooks/useSettingsCenter';

const CATALOG_SECTIONS = [
  { key: 'cargos', label: 'Cargos' },
  { key: 'bairros', label: 'Bairros' },
  { key: 'zonas', label: 'Zonas' },
  { key: 'equipes', label: 'Equipes' },
  { key: 'categorias', label: 'Categorias' }
];

const INITIAL_ITEM = { nome: '', descricao: '' };

export default function SettingsCenter() {
  const {
    loading,
    campaign,
    catalogs,
    permissionsMatrix,
    integrations,
    stats,
    setIntegrations,
    saveCampaign,
    saveCatalogItem,
    deleteCatalogItem,
    savePermissions,
    saveIntegrations
  } = useSettingsCenter();

  const [campaignForm, setCampaignForm] = useState(campaign);
  const [catalogForms, setCatalogForms] = useState(
    CATALOG_SECTIONS.reduce((acc, section) => {
      acc[section.key] = INITIAL_ITEM;
      return acc;
    }, {})
  );
  const [permissionsDraft, setPermissionsDraft] = useState(permissionsMatrix);

  React.useEffect(() => {
    setCampaignForm(campaign);
  }, [campaign]);

  React.useEffect(() => {
    setPermissionsDraft(permissionsMatrix);
  }, [permissionsMatrix]);

  const integrationsList = useMemo(
    () => [
      { key: 'emailInvites', label: 'Convites por e-mail' },
      { key: 'auditTrail', label: 'Trilha de auditoria' },
      { key: 'aiReady', label: 'Estrutura de IA pronta' },
      { key: 'storageMigration', label: 'Migração de mídias para Storage' },
      { key: 'firestoreMigration', label: 'Migração de dados para Firestore' }
    ],
    []
  );

  return (
    <div className="campaign-dashboard">
      <section className="campaign-filters-card">
        <div className="campaign-filters-header">
          <div>
            <p className="campaign-kicker">
              <Cog size={16} />
              Fase 19
            </p>
            <h3>Configurações</h3>
          </div>
        </div>
        <p style={{ margin: 0, color: '#64748b', lineHeight: 1.6 }}>
          Centralize campanha, cargos, bairros, zonas, equipes, categorias, permissões e integrações em um único lugar, mantendo compatibilidade com a base atual.
        </p>
      </section>

      <div className="campaign-metrics-grid">
        <MetricCard title="Itens cadastrados" value={stats.catalogs} helper="Catálogos operacionais" />
        <MetricCard title="Papéis" value={stats.roles} helper="Perfis com permissão configurável" tone="highlight" />
        <MetricCard title="Integrações ativas" value={stats.activeIntegrations} helper="Recursos habilitados" tone="success" />
      </div>

      <div className="campaign-main-grid settings-main-grid">
        <InsightPanel title="Campanha" subtitle="Dados-base da operação e da eleição">
          <div className="campaign-filters-grid">
            <label className="funnel-filter-field">
              <span>Nome da campanha</span>
              <input className="campaign-filter-select" value={campaignForm.nome || ''} onChange={(event) => setCampaignForm((prev) => ({ ...prev, nome: event.target.value }))} />
            </label>
            <label className="funnel-filter-field">
              <span>Cargo principal</span>
              <input className="campaign-filter-select" value={campaignForm.cargoPrincipal || ''} onChange={(event) => setCampaignForm((prev) => ({ ...prev, cargoPrincipal: event.target.value }))} />
            </label>
            <label className="funnel-filter-field">
              <span>Município</span>
              <input className="campaign-filter-select" value={campaignForm.municipio || ''} onChange={(event) => setCampaignForm((prev) => ({ ...prev, municipio: event.target.value }))} />
            </label>
            <label className="funnel-filter-field">
              <span>Estado</span>
              <input className="campaign-filter-select" value={campaignForm.estado || ''} onChange={(event) => setCampaignForm((prev) => ({ ...prev, estado: event.target.value.toUpperCase() }))} />
            </label>
            <label className="funnel-filter-field">
              <span>Data da eleição</span>
              <input className="campaign-filter-select" type="date" value={campaignForm.eleicaoEm || ''} onChange={(event) => setCampaignForm((prev) => ({ ...prev, eleicaoEm: event.target.value }))} />
            </label>
            <label className="funnel-filter-field">
              <span>Meta principal</span>
              <input className="campaign-filter-select" value={campaignForm.metaPrincipal || ''} onChange={(event) => setCampaignForm((prev) => ({ ...prev, metaPrincipal: event.target.value }))} />
            </label>
          </div>
          <div className="funnel-modal-actions">
            <span />
            <button className="btn-primary" onClick={() => saveCampaign(campaignForm)} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <Save size={16} />
              Salvar campanha
            </button>
          </div>
        </InsightPanel>

        <InsightPanel title="Integrações" subtitle="Recursos e readiness do ambiente" compact>
          <div className="settings-toggle-list">
            {integrationsList.map((item) => (
              <label key={item.key} className="settings-toggle-item">
                <div>
                  <strong>{item.label}</strong>
                  <p>{integrations[item.key] ? 'Ativo' : 'Inativo'}</p>
                </div>
                <input
                  type="checkbox"
                  checked={!!integrations[item.key]}
                  onChange={(event) => setIntegrations((prev) => ({ ...prev, [item.key]: event.target.checked }))}
                />
              </label>
            ))}
          </div>
          <div className="funnel-modal-actions">
            <span />
            <button className="btn-primary" onClick={() => saveIntegrations(integrations)}>Salvar integrações</button>
          </div>
        </InsightPanel>
      </div>

      <div className="campaign-secondary-grid settings-catalog-grid">
        {CATALOG_SECTIONS.map((section) => (
          <InsightPanel key={section.key} title={section.label} subtitle={`Cadastros rápidos de ${section.label.toLowerCase()}`} compact>
            <div className="settings-inline-form">
              <input
                className="campaign-filter-select"
                placeholder={`Novo ${section.label.slice(0, -1).toLowerCase()}`}
                value={catalogForms[section.key]?.nome || ''}
                onChange={(event) => setCatalogForms((prev) => ({
                  ...prev,
                  [section.key]: { ...prev[section.key], nome: event.target.value }
                }))}
              />
              <input
                className="campaign-filter-select"
                placeholder="Descrição"
                value={catalogForms[section.key]?.descricao || ''}
                onChange={(event) => setCatalogForms((prev) => ({
                  ...prev,
                  [section.key]: { ...prev[section.key], descricao: event.target.value }
                }))}
              />
              <button
                className="btn-secondary"
                onClick={() => {
                  saveCatalogItem(section.key, catalogForms[section.key]);
                  setCatalogForms((prev) => ({ ...prev, [section.key]: INITIAL_ITEM }));
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <Plus size={16} />
                Adicionar
              </button>
            </div>

            <div className="campaign-list-block">
              {loading && catalogs[section.key].length === 0 ? <div className="campaign-empty-state">Carregando...</div> : null}
              {!loading && catalogs[section.key].length === 0 ? <div className="campaign-empty-state">Nenhum item cadastrado.</div> : null}
              {catalogs[section.key].map((item) => (
                <article key={item.id} className="campaign-list-item">
                  <div>
                    <strong>{item.nome}</strong>
                    <p>{item.descricao || 'Sem descrição'}</p>
                  </div>
                  <button
                    type="button"
                    className="funnel-link-btn"
                    onClick={() => deleteCatalogItem(section.key, item.id, item.nome)}
                    style={{ color: '#dc2626' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </article>
              ))}
            </div>
          </InsightPanel>
        ))}
      </div>

      <div className="campaign-main-grid settings-main-grid">
        <InsightPanel title="Permissões" subtitle="Matriz operacional por papel">
          <div className="settings-permissions-grid">
            {permissionsDraft.map((role) => (
              <article key={role.id || role.role} className="users-card">
                <div className="users-card-head">
                  <div>
                    <strong>{role.label}</strong>
                    <p>{role.role}</p>
                  </div>
                  <Settings2 size={18} color="#2563eb" />
                </div>
                <div className="users-permissions-grid">
                  {['dashboard', 'voters', 'funnel', 'team', 'territory', 'communication', 'reports', 'settings'].map((permission) => (
                    <button
                      key={permission}
                      type="button"
                      className={`users-permission-chip ${role[permission] ? 'active' : ''}`}
                      onClick={() => setPermissionsDraft((prev) =>
                        prev.map((item) =>
                          (item.id || item.role) === (role.id || role.role)
                            ? { ...item, [permission]: !item[permission] }
                            : item
                        )
                      )}
                    >
                      {permission}
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>
          <div className="funnel-modal-actions">
            <span />
            <button className="btn-primary" onClick={() => savePermissions(permissionsDraft)}>Salvar permissões</button>
          </div>
        </InsightPanel>

        <InsightPanel title="Resumo" subtitle="Leitura rápida da central" compact>
          <div className="campaign-notes-list">
            <div className="campaign-note-item">
              <strong>Campanha</strong>
              <p>Configuração-base da operação, município, cargo e data da eleição.</p>
            </div>
            <div className="campaign-note-item">
              <strong>Catálogos</strong>
              <p>Listas administrativas para reaproveitar em filtros e formulários.</p>
            </div>
            <div className="campaign-note-item">
              <strong>Permissões e integrações</strong>
              <p>Governança centralizada sem mudar o padrão já implantado.</p>
            </div>
          </div>
        </InsightPanel>
      </div>
    </div>
  );
}
