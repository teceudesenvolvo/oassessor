import React, { useMemo, useState } from 'react';
import { CalendarDays, MapPinned, Navigation, Phone, Plus, Route, Save, Trash2, UserRound } from 'lucide-react';
import { useAuth } from '../../useAuth';
import { useVisits } from '../../hooks/useVisits';
import InsightPanel from '../../components/dashboard/InsightPanel';
import MetricCard from '../../components/dashboard/MetricCard';

const INITIAL_FORM = {
  titulo: '',
  voterId: '',
  address: '',
  plannedAt: '',
  status: 'planned',
  assessorId: '',
  routeLabel: '',
  mapReference: '',
  notes: '',
  result: '',
  nextContact: ''
};

const formatDateTime = (value) => {
  if (!value) return 'Sem agendamento';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sem agendamento';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const resultTone = (result) => {
  if (result === 'support_confirmed') return 'success';
  if (result === 'undecided' || result === 'reschedule') return 'warning';
  return 'default';
};

export default function Visits() {
  const { user } = useAuth();
  const {
    loading,
    visits,
    voters,
    assessors,
    stats,
    groupedRoutes,
    saveVisit,
    deleteVisit,
    updateVisitStatus,
    visitStatuses,
    visitResults
  } = useVisits(user);

  const [selectedId, setSelectedId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    assessorId: 'all',
    routeLabel: 'all'
  });
  const [formData, setFormData] = useState({
    ...INITIAL_FORM,
    plannedAt: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16)
  });

  const routeOptions = useMemo(
    () => [...new Set(visits.map((visit) => visit.routeLabel).filter(Boolean))].sort(),
    [visits]
  );

  const filteredVisits = useMemo(
    () =>
      visits.filter((visit) => {
        if (filters.status !== 'all' && visit.status !== filters.status) return false;
        if (filters.assessorId !== 'all' && visit.assessorId !== filters.assessorId) return false;
        if (filters.routeLabel !== 'all' && visit.routeLabel !== filters.routeLabel) return false;
        return true;
      }),
    [filters, visits]
  );

  const resetForm = () => {
    setSelectedId(null);
    setFormData({
      ...INITIAL_FORM,
      plannedAt: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16)
    });
  };

  const openNew = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (visit) => {
    setSelectedId(visit.id);
    setFormData({
      titulo: visit.titulo || '',
      voterId: visit.voterId || '',
      address: visit.address || '',
      plannedAt: visit.plannedAt ? visit.plannedAt.slice(0, 16) : '',
      status: visit.status || 'planned',
      assessorId: visit.assessorId || '',
      routeLabel: visit.routeLabel || '',
      mapReference: visit.mapReference || '',
      notes: visit.notes || '',
      result: visit.result || '',
      nextContact: visit.nextContact ? visit.nextContact.slice(0, 16) : ''
    });
    setShowModal(true);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      await saveVisit(formData, selectedId);
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar visita:', error);
      alert('Não foi possível salvar a visita.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    if (!window.confirm('Tem certeza que deseja excluir esta visita?')) return;
    try {
      await deleteVisit(selectedId);
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao excluir visita:', error);
      alert('Não foi possível excluir a visita.');
    }
  };

  return (
    <div className="campaign-dashboard">
      <section className="campaign-filters-card">
        <div className="campaign-filters-header">
          <div>
            <p className="campaign-kicker">
              <MapPinned size={16} />
              Fase 8
            </p>
            <h3>Visitas</h3>
          </div>
          <button className="btn-primary" onClick={openNew} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={16} />
            Nova visita
          </button>
        </div>

        <div className="campaign-filters-grid">
          <label className="funnel-filter-field">
            <span>Status</span>
            <select className="campaign-filter-select" value={filters.status} onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}>
              <option value="all">Todos</option>
              {visitStatuses.map((status) => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </label>

          <label className="funnel-filter-field">
            <span>Responsável</span>
            <select className="campaign-filter-select" value={filters.assessorId} onChange={(event) => setFilters((prev) => ({ ...prev, assessorId: event.target.value }))}>
              <option value="all">Toda a equipe</option>
              {assessors.map((assessor) => (
                <option key={assessor.id} value={assessor.id}>{assessor.nome}</option>
              ))}
            </select>
          </label>

          <label className="funnel-filter-field">
            <span>Rota</span>
            <select className="campaign-filter-select" value={filters.routeLabel} onChange={(event) => setFilters((prev) => ({ ...prev, routeLabel: event.target.value }))}>
              <option value="all">Todas</option>
              {routeOptions.map((routeLabel) => (
                <option key={routeLabel} value={routeLabel}>{routeLabel}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <div className="campaign-metrics-grid">
        <MetricCard title="Visitas totais" value={stats.total} helper="Base operacional cadastrada" />
        <MetricCard title="Hoje" value={stats.today} helper="Agendadas para hoje" tone="highlight" />
        <MetricCard title="Em rota" value={stats.inProgress} helper="Execução em campo" />
        <MetricCard title="Concluídas" value={stats.completed} helper="Visitas finalizadas" tone="success" />
        <MetricCard title="Com rota" value={stats.withRoute} helper="Planejamento territorial preenchido" />
        <MetricCard title="Taxa de conclusão" value={`${stats.completionRate.toFixed(1)}%`} helper="Conclusão sobre a base total" tone="success" />
      </div>

      <div className="campaign-main-grid visits-main-grid">
        <InsightPanel title="Fila de visitas" subtitle="Pensada para uso rápido no celular em campo">
          <div className="visits-card-list">
            {loading ? <div className="campaign-empty-state">Carregando visitas...</div> : null}
            {!loading && filteredVisits.length === 0 ? <div className="campaign-empty-state">Nenhuma visita encontrada com os filtros atuais.</div> : null}

            {filteredVisits.map((visit) => {
              const statusMeta = visitStatuses.find((item) => item.value === visit.status);
              const resultMeta = visitResults.find((item) => item.value === visit.result);

              return (
                <article key={visit.id} className="visit-mobile-card">
                  <div className="visit-mobile-header">
                    <div>
                      <strong>{visit.titulo || visit.nomeEleitor}</strong>
                      <p>{visit.nomeEleitor || 'Eleitor não vinculado'} • {visit.bairro}</p>
                    </div>
                    <span className={`visit-status-badge tone-${resultTone(visit.result)}`}>
                      {statusMeta?.label || 'Planejada'}
                    </span>
                  </div>

                  <div className="visit-mobile-meta">
                    <span><CalendarDays size={14} /> {formatDateTime(visit.plannedAt)}</span>
                    <span><UserRound size={14} /> {visit.assessorResponsavel || 'Sem responsável'}</span>
                    <span><Route size={14} /> {visit.routeLabel || 'Sem rota'}</span>
                    <span><Navigation size={14} /> {visit.mapReference || 'Sem referência de mapa'}</span>
                    {visit.telefoneEleitor ? <span><Phone size={14} /> {visit.telefoneEleitor}</span> : null}
                  </div>

                  {visit.notes ? <p className="visit-mobile-notes">{visit.notes}</p> : null}

                  <div className="visit-mobile-footer">
                    <div className="visit-mobile-tags">
                      {resultMeta ? <span className={`visit-result-pill tone-${resultTone(visit.result)}`}>{resultMeta.label}</span> : null}
                      {visit.nextContact ? <span className="visit-result-pill">Próximo contato: {formatDateTime(visit.nextContact)}</span> : null}
                    </div>

                    <div className="visit-mobile-actions">
                      {visit.status !== 'in_progress' ? (
                        <button type="button" className="funnel-link-btn" onClick={() => updateVisitStatus(visit, 'in_progress')}>
                          Em rota
                        </button>
                      ) : null}
                      {visit.status !== 'completed' ? (
                        <button type="button" className="funnel-link-btn" onClick={() => updateVisitStatus(visit, 'completed')}>
                          Concluir
                        </button>
                      ) : null}
                      <button type="button" className="funnel-link-btn" onClick={() => openEdit(visit)}>
                        Detalhes
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </InsightPanel>

        <InsightPanel title="Rotas e planejamento" subtitle="Resumo territorial e execução por rota" compact>
          <div className="visits-route-list">
            {groupedRoutes.length === 0 ? (
              <div className="campaign-empty-state">Cadastre visitas para organizar a malha territorial.</div>
            ) : (
              groupedRoutes.map((group) => (
                <div key={group.route} className="visits-route-card">
                  <div className="visits-route-header">
                    <strong>{group.route}</strong>
                    <span>{group.items.length} parada(s)</span>
                  </div>
                  <div className="visits-route-items">
                    {group.items.slice(0, 4).map((visit) => (
                      <div key={visit.id} className="visits-route-item">
                        <span>{visit.nomeEleitor || visit.titulo}</span>
                        <small>{formatDateTime(visit.plannedAt)}</small>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </InsightPanel>
      </div>

      {showModal ? (
        <div className="funnel-modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="funnel-modal" onClick={(event) => event.stopPropagation()}>
            <div className="funnel-modal-header">
              <div>
                <h3>{selectedId ? 'Editar visita' : 'Nova visita'}</h3>
                <p>Planejamento, responsável, rota, mapa, conclusão e próximo contato.</p>
              </div>
              <button type="button" className="funnel-link-btn" onClick={() => setShowModal(false)}>
                Fechar
              </button>
            </div>

            <form className="funnel-modal-form" onSubmit={handleSave}>
              <div className="campaign-filters-grid">
                <label className="funnel-filter-field">
                  <span>Eleitor</span>
                  <select className="campaign-filter-select" name="voterId" value={formData.voterId} onChange={handleChange}>
                    <option value="">Selecionar eleitor</option>
                    {voters.map((voter) => (
                      <option key={voter.id} value={voter.id}>{voter.nome} • {voter.bairro}</option>
                    ))}
                  </select>
                </label>

                <label className="funnel-filter-field">
                  <span>Título</span>
                  <input className="campaign-filter-select" name="titulo" value={formData.titulo} onChange={handleChange} placeholder="Ex.: Visita de conversão" />
                </label>

                <label className="funnel-filter-field">
                  <span>Responsável</span>
                  <select className="campaign-filter-select" name="assessorId" value={formData.assessorId} onChange={handleChange}>
                    <option value="">Selecionar responsável</option>
                    {assessors.map((assessor) => (
                      <option key={assessor.id} value={assessor.id}>{assessor.nome}</option>
                    ))}
                  </select>
                </label>

                <label className="funnel-filter-field">
                  <span>Status</span>
                  <select className="campaign-filter-select" name="status" value={formData.status} onChange={handleChange}>
                    {visitStatuses.map((status) => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </label>

                <label className="funnel-filter-field">
                  <span>Agendamento</span>
                  <input className="campaign-filter-select" type="datetime-local" name="plannedAt" value={formData.plannedAt} onChange={handleChange} required />
                </label>

                <label className="funnel-filter-field">
                  <span>Próximo contato</span>
                  <input className="campaign-filter-select" type="datetime-local" name="nextContact" value={formData.nextContact} onChange={handleChange} />
                </label>

                <label className="funnel-filter-field">
                  <span>Rota</span>
                  <input className="campaign-filter-select" name="routeLabel" value={formData.routeLabel} onChange={handleChange} placeholder="Ex.: Rota Norte 01" />
                </label>

                <label className="funnel-filter-field">
                  <span>Mapa / referência</span>
                  <input className="campaign-filter-select" name="mapReference" value={formData.mapReference} onChange={handleChange} placeholder="Ex.: Praça central, rua lateral" />
                </label>

                <label className="funnel-filter-field" style={{ gridColumn: '1 / -1' }}>
                  <span>Endereço</span>
                  <input className="campaign-filter-select" name="address" value={formData.address} onChange={handleChange} placeholder="Rua, número, complemento" />
                </label>

                <label className="funnel-filter-field">
                  <span>Resultado</span>
                  <select className="campaign-filter-select" name="result" value={formData.result} onChange={handleChange}>
                    <option value="">Selecionar</option>
                    {visitResults.map((result) => (
                      <option key={result.value} value={result.value}>{result.label}</option>
                    ))}
                  </select>
                </label>

                <label className="funnel-filter-field" style={{ gridColumn: '1 / -1' }}>
                  <span>Observações</span>
                  <textarea className="campaign-filter-select" name="notes" value={formData.notes} onChange={handleChange} rows="4" placeholder="Contexto da visita, pendências e leitura de campo" />
                </label>
              </div>

              <div className="funnel-modal-actions">
                {selectedId ? (
                  <button type="button" className="btn-secondary" onClick={handleDelete} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#dc2626', borderColor: '#fecaca' }}>
                    <Trash2 size={16} />
                    Excluir
                  </button>
                ) : <span />}

                <button type="submit" className="btn-primary" disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <Save size={16} />
                  {saving ? 'Salvando...' : 'Salvar visita'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
