import React, { useMemo, useState } from 'react';
import { HandHelping, Plus, Save, Trash2 } from 'lucide-react';
import { useAuth } from '../../useAuth';
import { useVolunteers } from '../../hooks/useVolunteers';
import InsightPanel from '../../components/dashboard/InsightPanel';
import MetricCard from '../../components/dashboard/MetricCard';

const AVAILABILITY_OPTIONS = ['Manhã', 'Tarde', 'Noite', 'Fim de semana', 'Durante a semana'];
const SKILL_SUGGESTIONS = ['Mobilização', 'Comunicação', 'Design', 'Logística', 'Recepção', 'Mídias sociais', 'Captação', 'Fiscalização'];

const INITIAL_FORM = {
  nome: '',
  telefone: '',
  regiao: '',
  disponibilidade: [],
  habilidades: [],
  assessorResponsavel: '',
  observacoes: '',
  tarefasIds: [],
  eventosIds: [],
  historico: []
};

export default function Volunteers() {
  const { user } = useAuth();
  const { loading, volunteers, tasks, events, assessors, stats, saveVolunteer, deleteVolunteer } = useVolunteers(user);
  const [showModal, setShowModal] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [newHistory, setNewHistory] = useState({ tipo: 'participação', descricao: '', data: new Date().toISOString().split('T')[0] });
  const [formData, setFormData] = useState(INITIAL_FORM);

  const resetForm = () => {
    setSelectedId(null);
    setNewHistory({ tipo: 'participação', descricao: '', data: new Date().toISOString().split('T')[0] });
    setFormData(INITIAL_FORM);
  };

  const openNew = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (volunteer) => {
    setSelectedId(volunteer.id);
    setFormData({
      nome: volunteer.nome || '',
      telefone: volunteer.telefone || '',
      regiao: volunteer.regiao || '',
      disponibilidade: volunteer.disponibilidade || [],
      habilidades: volunteer.habilidades || [],
      assessorResponsavel: volunteer.assessorResponsavel || '',
      observacoes: volunteer.observacoes || '',
      tarefasIds: volunteer.tarefasIds || [],
      eventosIds: volunteer.eventosIds || [],
      historico: volunteer.historico || []
    });
    setShowModal(true);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleArrayValue = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((item) => item !== value)
        : [...prev[field], value]
    }));
  };

  const addHistoryEntry = () => {
    if (!newHistory.descricao.trim()) return;
    setFormData((prev) => ({
      ...prev,
      historico: [
        ...prev.historico,
        {
          id: `tmp-${Date.now()}`,
          ...newHistory
        }
      ]
    }));
    setNewHistory({ tipo: 'participação', descricao: '', data: new Date().toISOString().split('T')[0] });
  };

  const removeHistoryEntry = (entryId) => {
    setFormData((prev) => ({
      ...prev,
      historico: prev.historico.filter((entry) => entry.id !== entryId)
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      await saveVolunteer(formData, selectedId);
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar voluntário:', error);
      alert('Não foi possível salvar o voluntário.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    if (!window.confirm('Tem certeza que deseja excluir este voluntário?')) return;
    try {
      await deleteVolunteer(selectedId);
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao excluir voluntário:', error);
      alert('Não foi possível excluir o voluntário.');
    }
  };

  const volunteerRows = useMemo(
    () =>
      volunteers.map((volunteer) => ({
        ...volunteer,
        tasksCount: volunteer.tarefasIds.length,
        eventsCount: volunteer.eventosIds.length
      })),
    [volunteers]
  );

  return (
    <div className="campaign-dashboard">
      <section className="campaign-filters-card">
        <div className="campaign-filters-header">
          <div>
            <p className="campaign-kicker">
              <HandHelping size={16} />
              Fase 5
            </p>
            <h3>Voluntários</h3>
          </div>
          <button className="btn-primary" onClick={openNew} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={16} />
            Novo voluntário
          </button>
        </div>
        <p style={{ margin: 0, color: '#64748b', lineHeight: 1.6 }}>
          Organize disponibilidade, habilidades, participação em eventos, tarefas e histórico de atuação de cada voluntário.
        </p>
      </section>

      <div className="campaign-metrics-grid">
        <MetricCard title="Voluntários" value={stats.total} helper="Base total cadastrada" tone="success" />
        <MetricCard title="Com eventos" value={stats.withEvents} helper="Já associados a eventos" />
        <MetricCard title="Com tarefas" value={stats.withTasks} helper="Já acionados em atividades" tone="highlight" />
        <MetricCard title="Habilidades mapeadas" value={stats.skills} helper="Capacidades únicas na rede" />
      </div>

      <div className="campaign-main-grid">
        <InsightPanel title="Base de voluntários" subtitle="Visão operacional da rede ativa">
          <div className="campaign-list-block">
            {loading ? (
              <div className="campaign-empty-state">Carregando voluntários...</div>
            ) : volunteerRows.length === 0 ? (
              <div className="campaign-empty-state">Nenhum voluntário cadastrado ainda.</div>
            ) : (
              volunteerRows.map((volunteer) => (
                <article key={volunteer.id} className="campaign-list-item">
                  <div>
                    <strong>{volunteer.nome}</strong>
                    <p>{volunteer.regiao} • {volunteer.habilidades.join(', ') || 'Sem habilidades mapeadas'}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span>{volunteer.tasksCount} tarefa(s)</span>
                    <span>{volunteer.eventsCount} evento(s)</span>
                    <button className="funnel-link-btn" onClick={() => openEdit(volunteer)}>Gerenciar</button>
                  </div>
                </article>
              ))
            )}
          </div>
        </InsightPanel>

        <InsightPanel title="Leitura da base" subtitle="Capacidade de mobilização atual" compact>
          <div className="campaign-notes-list">
            <div className="campaign-note-item">
              <strong>Eventos cadastrados</strong>
              <p>{events.length} evento(s) disponíveis para associação.</p>
            </div>
            <div className="campaign-note-item">
              <strong>Tarefas cadastradas</strong>
              <p>{tasks.length} tarefa(s) podem ser distribuídas aos voluntários.</p>
            </div>
            <div className="campaign-note-item">
              <strong>Assessores responsáveis</strong>
              <p>{assessors.length} assessor(es) podem coordenar voluntários.</p>
            </div>
          </div>
        </InsightPanel>
      </div>

      {showModal ? (
        <div className="funnel-modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="funnel-modal" onClick={(event) => event.stopPropagation()}>
            <div className="funnel-modal-header">
              <div>
                <h3>{selectedId ? 'Editar voluntário' : 'Novo voluntário'}</h3>
                <p>Cadastre disponibilidade, habilidades e histórico de participação.</p>
              </div>
              <button className="funnel-link-btn" onClick={() => setShowModal(false)}>Fechar</button>
            </div>

            <form className="funnel-modal-form" onSubmit={handleSave}>
              <div className="campaign-filters-grid">
                <label className="funnel-filter-field">
                  <span>Nome</span>
                  <input className="campaign-filter-select" name="nome" value={formData.nome} onChange={handleChange} required />
                </label>
                <label className="funnel-filter-field">
                  <span>Telefone</span>
                  <input className="campaign-filter-select" name="telefone" value={formData.telefone} onChange={handleChange} />
                </label>
                <label className="funnel-filter-field">
                  <span>Região</span>
                  <input className="campaign-filter-select" name="regiao" value={formData.regiao} onChange={handleChange} />
                </label>
                <label className="funnel-filter-field">
                  <span>Assessor responsável</span>
                  <select className="campaign-filter-select" name="assessorResponsavel" value={formData.assessorResponsavel} onChange={handleChange}>
                    <option value="">Selecione</option>
                    <option value="Administrador">Administrador</option>
                    {assessors.map((assessor) => (
                      <option key={assessor.id} value={assessor.nome}>{assessor.nome}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="leadership-voters-block">
                <div className="campaign-insight-header">
                  <div>
                    <h3>Disponibilidade</h3>
                    <p>Marque quando este voluntário costuma atuar.</p>
                  </div>
                </div>
                <div className="leadership-voters-grid">
                  {AVAILABILITY_OPTIONS.map((item) => (
                    <label key={item} className={`leadership-voter-option ${formData.disponibilidade.includes(item) ? 'selected' : ''}`}>
                      <input type="checkbox" checked={formData.disponibilidade.includes(item)} onChange={() => toggleArrayValue('disponibilidade', item)} />
                      <div>
                        <strong>{item}</strong>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="leadership-voters-block">
                <div className="campaign-insight-header">
                  <div>
                    <h3>Habilidades</h3>
                    <p>Escolha as frentes em que o voluntário pode ajudar.</p>
                  </div>
                </div>
                <div className="leadership-voters-grid">
                  {SKILL_SUGGESTIONS.map((item) => (
                    <label key={item} className={`leadership-voter-option ${formData.habilidades.includes(item) ? 'selected' : ''}`}>
                      <input type="checkbox" checked={formData.habilidades.includes(item)} onChange={() => toggleArrayValue('habilidades', item)} />
                      <div>
                        <strong>{item}</strong>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="campaign-main-grid">
                <div className="leadership-voters-block">
                  <div className="campaign-insight-header">
                    <div>
                      <h3>Tarefas</h3>
                      <p>Atividades já relacionadas ao voluntário.</p>
                    </div>
                  </div>
                  <div className="leadership-voters-grid">
                    {tasks.map((task) => (
                      <label key={task.id} className={`leadership-voter-option ${formData.tarefasIds.includes(task.id) ? 'selected' : ''}`}>
                        <input type="checkbox" checked={formData.tarefasIds.includes(task.id)} onChange={() => toggleArrayValue('tarefasIds', task.id)} />
                        <div>
                          <strong>{task.titulo}</strong>
                          <p>{task.tipo || 'general'}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="leadership-voters-block">
                  <div className="campaign-insight-header">
                    <div>
                      <h3>Eventos</h3>
                      <p>Eventos em que já participa ou deve participar.</p>
                    </div>
                  </div>
                  <div className="leadership-voters-grid">
                    {events.map((eventItem) => (
                      <label key={eventItem.id} className={`leadership-voter-option ${formData.eventosIds.includes(eventItem.id) ? 'selected' : ''}`}>
                        <input type="checkbox" checked={formData.eventosIds.includes(eventItem.id)} onChange={() => toggleArrayValue('eventosIds', eventItem.id)} />
                        <div>
                          <strong>{eventItem.titulo}</strong>
                          <p>{eventItem.data || 'Sem data'}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <label className="funnel-filter-field">
                <span>Observações</span>
                <textarea className="funnel-notes-area" name="observacoes" value={formData.observacoes} onChange={handleChange} />
              </label>

              <div className="leadership-voters-block">
                <div className="campaign-insight-header">
                  <div>
                    <h3>Histórico</h3>
                    <p>Registre participações, treinamentos e marcos do voluntário.</p>
                  </div>
                </div>

                <div className="campaign-filters-grid">
                  <label className="funnel-filter-field">
                    <span>Tipo</span>
                    <input className="campaign-filter-select" value={newHistory.tipo} onChange={(event) => setNewHistory((prev) => ({ ...prev, tipo: event.target.value }))} />
                  </label>
                  <label className="funnel-filter-field">
                    <span>Data</span>
                    <input type="date" className="campaign-filter-select" value={newHistory.data} onChange={(event) => setNewHistory((prev) => ({ ...prev, data: event.target.value }))} />
                  </label>
                  <label className="funnel-filter-field" style={{ gridColumn: '1 / -1' }}>
                    <span>Descrição</span>
                    <textarea className="funnel-notes-area" value={newHistory.descricao} onChange={(event) => setNewHistory((prev) => ({ ...prev, descricao: event.target.value }))} />
                  </label>
                </div>

                <button type="button" className="btn-secondary" onClick={addHistoryEntry} style={{ alignSelf: 'flex-start' }}>
                  <Plus size={16} />
                  Adicionar ao histórico
                </button>

                <div className="campaign-list-block" style={{ marginTop: '12px' }}>
                  {formData.historico.length === 0 ? (
                    <div className="campaign-empty-state">Nenhum histórico registrado.</div>
                  ) : (
                    formData.historico.map((entry) => (
                      <article key={entry.id} className="campaign-list-item">
                        <div>
                          <strong>{entry.tipo}</strong>
                          <p>{entry.descricao}</p>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <span>{entry.data}</span>
                          <button type="button" className="funnel-link-btn" onClick={() => removeHistoryEntry(entry.id)}>Remover</button>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>

              <div className="funnel-modal-actions">
                {selectedId ? (
                  <button type="button" className="btn-secondary btn-excluir" onClick={handleDelete}>
                    <Trash2 size={16} />
                    Excluir
                  </button>
                ) : <span />}
                <button type="submit" className="btn-primary" disabled={saving}>
                  <Save size={16} />
                  {saving ? 'Salvando...' : 'Salvar voluntário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
