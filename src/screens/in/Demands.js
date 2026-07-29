import React, { useMemo, useState } from 'react';
import { CalendarClock, ClipboardList, MessageSquareText, Plus, Save, ShieldAlert, Trash2 } from 'lucide-react';
import InsightPanel from '../../components/dashboard/InsightPanel';
import MetricCard from '../../components/dashboard/MetricCard';
import { DEMAND_STATUSES, useDemands } from '../../hooks/useDemands';
import { useAuth } from '../../useAuth';

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Média' },
  { value: 'high', label: 'Alta' }
];

const CATEGORY_OPTIONS = ['Saúde', 'Infraestrutura', 'Iluminação', 'Assistência', 'Educação', 'Jurídico', 'Comunidade'];

const INITIAL_FORM = {
  protocol: '',
  title: '',
  description: '',
  category: '',
  priority: 'medium',
  status: 'received',
  voterId: '',
  assessorId: '',
  visitId: '',
  response: '',
  dueDate: '',
  timeline: [],
  timelineNote: ''
};

const formatDateTime = (value) => {
  if (!value) return 'Sem data';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sem data';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const priorityTone = (priority) => {
  if (priority === 'high') return 'danger';
  if (priority === 'medium') return 'warning';
  return 'default';
};

export default function Demands() {
  const { user } = useAuth();
  const { loading, demands, voters, assessors, visits, stats, saveDemand, deleteDemand } = useDemands(user);
  const [selectedId, setSelectedId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    assessorId: 'all'
  });
  const [formData, setFormData] = useState({
    ...INITIAL_FORM,
    protocol: `DEM-${Date.now().toString().slice(-6)}`
  });

  const filteredDemands = useMemo(
    () =>
      demands.filter((demand) => {
        if (filters.status !== 'all' && demand.status !== filters.status) return false;
        if (filters.priority !== 'all' && demand.priority !== filters.priority) return false;
        if (filters.assessorId !== 'all' && demand.assessorId !== filters.assessorId) return false;
        return true;
      }),
    [demands, filters]
  );

  const resetForm = () => {
    setSelectedId(null);
    setFormData({
      ...INITIAL_FORM,
      protocol: `DEM-${Date.now().toString().slice(-6)}`
    });
  };

  const openNew = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (demand) => {
    setSelectedId(demand.id);
    setFormData({
      protocol: demand.protocol || '',
      title: demand.title || '',
      description: demand.description || '',
      category: demand.category || '',
      priority: demand.priority || 'medium',
      status: demand.status || 'received',
      voterId: demand.voterId || '',
      assessorId: demand.assessorId || '',
      visitId: demand.visitId || '',
      response: demand.response || '',
      dueDate: demand.dueDate ? demand.dueDate.slice(0, 16) : '',
      timeline: demand.timeline || [],
      timelineNote: ''
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
      await saveDemand(formData, selectedId);
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar demanda:', error);
      alert('Não foi possível salvar a demanda.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    if (!window.confirm('Tem certeza que deseja excluir esta demanda?')) return;
    try {
      await deleteDemand(selectedId);
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao excluir demanda:', error);
      alert('Não foi possível excluir a demanda.');
    }
  };

  return (
    <div className="campaign-dashboard">
      <section className="campaign-filters-card">
        <div className="campaign-filters-header">
          <div>
            <p className="campaign-kicker">
              <ClipboardList size={16} />
              Fase 9
            </p>
            <h3>Demandas</h3>
          </div>
          <button className="btn-primary" onClick={openNew} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={16} />
            Nova demanda
          </button>
        </div>

        <div className="campaign-filters-grid">
          <label className="funnel-filter-field">
            <span>Status</span>
            <select className="campaign-filter-select" value={filters.status} onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}>
              <option value="all">Todos</option>
              {DEMAND_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </label>

          <label className="funnel-filter-field">
            <span>Prioridade</span>
            <select className="campaign-filter-select" value={filters.priority} onChange={(event) => setFilters((prev) => ({ ...prev, priority: event.target.value }))}>
              <option value="all">Todas</option>
              {PRIORITY_OPTIONS.map((priority) => (
                <option key={priority.value} value={priority.value}>{priority.label}</option>
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
        </div>
      </section>

      <div className="campaign-metrics-grid">
        <MetricCard title="Demandas totais" value={stats.total} helper="Protocolos cadastrados" />
        <MetricCard title="Hoje" value={stats.today} helper="Abertas hoje" tone="highlight" />
        <MetricCard title="Críticas" value={stats.critical} helper="Prioridade alta" tone="danger" />
        <MetricCard title="Aguardando" value={stats.waiting} helper="Dependem de retorno externo" />
        <MetricCard title="Concluídas" value={stats.completed} helper="Finalizadas no fluxo" tone="success" />
        <MetricCard title="Taxa de conclusão" value={`${stats.completionRate.toFixed(1)}%`} helper="Fechamento da carteira" tone="success" />
      </div>

      <div className="campaign-main-grid demands-main-grid">
        <InsightPanel title="Protocolos" subtitle="Visão mobile-first para acompanhar cada demanda">
          <div className="demands-card-list">
            {loading ? <div className="campaign-empty-state">Carregando demandas...</div> : null}
            {!loading && filteredDemands.length === 0 ? <div className="campaign-empty-state">Nenhuma demanda encontrada com os filtros atuais.</div> : null}

            {filteredDemands.map((demand) => {
              const currentStatus = DEMAND_STATUSES.find((item) => item.value === demand.status);

              return (
                <article key={demand.id} className="demand-mobile-card">
                  <div className="demand-mobile-header">
                    <div>
                      <strong>{demand.title}</strong>
                      <p>{demand.protocol} • {demand.bairro}</p>
                    </div>
                    <div className="demand-badge-stack">
                      <span className={`demand-badge tone-${priorityTone(demand.priority)}`}>{PRIORITY_OPTIONS.find((item) => item.value === demand.priority)?.label || 'Média'}</span>
                      <span className="demand-badge">{currentStatus?.label || 'Recebida'}</span>
                    </div>
                  </div>

                  <div className="demand-mobile-meta">
                    <span><MessageSquareText size={14} /> {demand.category || 'Sem categoria'}</span>
                    <span><ShieldAlert size={14} /> {demand.assessorResponsavel || 'Sem responsável'}</span>
                    <span><CalendarClock size={14} /> {demand.dueDate ? formatDateTime(demand.dueDate) : 'Sem prazo'}</span>
                  </div>

                  {demand.description ? <p className="demand-mobile-notes">{demand.description}</p> : null}

                  {demand.response ? (
                    <div className="demand-response-box">
                      <strong>Resposta</strong>
                      <p>{demand.response}</p>
                    </div>
                  ) : null}

                  <div className="demand-mobile-actions">
                    <button type="button" className="funnel-link-btn" onClick={() => openEdit(demand)}>
                      Detalhes
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </InsightPanel>

        <InsightPanel title="Timeline operacional" subtitle="Últimas atualizações de protocolo" compact>
          <div className="demand-timeline-list">
            {filteredDemands.slice(0, 5).flatMap((demand) =>
              (demand.timeline || []).slice(-3).map((entry) => (
                <div key={`${demand.id}-${entry.id}`} className="demand-timeline-item">
                  <div className="demand-timeline-dot" />
                  <div>
                    <strong>{entry.title}</strong>
                    <p>{demand.protocol} • {entry.description || 'Sem observação complementar'}</p>
                    <small>{entry.actorName || 'Sistema'} • {formatDateTime(entry.createdAt)}</small>
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
                <h3>{selectedId ? 'Editar demanda' : 'Nova demanda'}</h3>
                <p>Protocolo, responsável, vínculo com visita/eleitor e timeline de acompanhamento.</p>
              </div>
              <button type="button" className="funnel-link-btn" onClick={() => setShowModal(false)}>
                Fechar
              </button>
            </div>

            <form className="funnel-modal-form" onSubmit={handleSave}>
              <div className="campaign-filters-grid">
                <label className="funnel-filter-field">
                  <span>Protocolo</span>
                  <input className="campaign-filter-select" name="protocol" value={formData.protocol} onChange={handleChange} required />
                </label>

                <label className="funnel-filter-field">
                  <span>Título</span>
                  <input className="campaign-filter-select" name="title" value={formData.title} onChange={handleChange} required />
                </label>

                <label className="funnel-filter-field">
                  <span>Categoria</span>
                  <input className="campaign-filter-select" name="category" list="demand-categories" value={formData.category} onChange={handleChange} />
                  <datalist id="demand-categories">
                    {CATEGORY_OPTIONS.map((category) => <option key={category} value={category} />)}
                  </datalist>
                </label>

                <label className="funnel-filter-field">
                  <span>Prioridade</span>
                  <select className="campaign-filter-select" name="priority" value={formData.priority} onChange={handleChange}>
                    {PRIORITY_OPTIONS.map((priority) => (
                      <option key={priority.value} value={priority.value}>{priority.label}</option>
                    ))}
                  </select>
                </label>

                <label className="funnel-filter-field">
                  <span>Status</span>
                  <select className="campaign-filter-select" name="status" value={formData.status} onChange={handleChange}>
                    {DEMAND_STATUSES.map((status) => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </label>

                <label className="funnel-filter-field">
                  <span>Prazo</span>
                  <input className="campaign-filter-select" type="datetime-local" name="dueDate" value={formData.dueDate} onChange={handleChange} />
                </label>

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
                  <span>Responsável</span>
                  <select className="campaign-filter-select" name="assessorId" value={formData.assessorId} onChange={handleChange}>
                    <option value="">Selecionar responsável</option>
                    {assessors.map((assessor) => (
                      <option key={assessor.id} value={assessor.id}>{assessor.nome}</option>
                    ))}
                  </select>
                </label>

                <label className="funnel-filter-field">
                  <span>Visita vinculada</span>
                  <select className="campaign-filter-select" name="visitId" value={formData.visitId} onChange={handleChange}>
                    <option value="">Selecionar visita</option>
                    {visits.map((visit) => (
                      <option key={visit.id} value={visit.id}>{visit.titulo}</option>
                    ))}
                  </select>
                </label>

                <label className="funnel-filter-field" style={{ gridColumn: '1 / -1' }}>
                  <span>Descrição</span>
                  <textarea className="campaign-filter-select" name="description" value={formData.description} onChange={handleChange} rows="4" />
                </label>

                <label className="funnel-filter-field" style={{ gridColumn: '1 / -1' }}>
                  <span>Resposta</span>
                  <textarea className="campaign-filter-select" name="response" value={formData.response} onChange={handleChange} rows="3" />
                </label>

                <label className="funnel-filter-field" style={{ gridColumn: '1 / -1' }}>
                  <span>Observação da timeline</span>
                  <textarea className="campaign-filter-select" name="timelineNote" value={formData.timelineNote} onChange={handleChange} rows="2" placeholder="Use este campo quando mudar o status para registrar o contexto." />
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
                  {saving ? 'Salvando...' : 'Salvar demanda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
