import React, { useMemo, useState } from 'react';
import { ClipboardList, Plus, Save, Trash2 } from 'lucide-react';
import InsightPanel from '../../components/dashboard/InsightPanel';
import MetricCard from '../../components/dashboard/MetricCard';
import { RESEARCH_TYPES, useResearchCenter } from '../../hooks/useResearchCenter';
import { useAuth } from '../../useAuth';

const INITIAL_FORM = {
  title: '',
  type: 'intention',
  bairro: '',
  assessorId: '',
  description: '',
  answers: []
};

const OPTIONS_BY_TYPE = {
  intention: ['Vota', 'Pode votar', 'Não vota', 'Indefinido'],
  satisfaction: ['Muito satisfeito', 'Satisfeito', 'Neutro', 'Insatisfeito'],
  priorities: ['Saúde', 'Emprego', 'Segurança', 'Infraestrutura', 'Educação'],
  evaluation: ['Ótima', 'Boa', 'Regular', 'Ruim', 'Péssima']
};

export default function ResearchCenter() {
  const { user } = useAuth();
  const { loading, researches, voters, assessors, stats, aggregatedOptions, saveResearch, deleteResearch } = useResearchCenter(user);
  const [selectedId, setSelectedId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [answerDraft, setAnswerDraft] = useState({ voterId: '', option: '', note: '' });
  const [filters, setFilters] = useState({ type: 'all', bairro: '' });
  const [formData, setFormData] = useState(INITIAL_FORM);

  const neighborhoods = useMemo(
    () => [...new Set(researches.map((item) => item.bairro).filter(Boolean))].sort(),
    [researches]
  );

  const filteredResearches = useMemo(
    () =>
      researches.filter((research) => {
        if (filters.type !== 'all' && research.type !== filters.type) return false;
        if (filters.bairro && research.bairro !== filters.bairro) return false;
        return true;
      }),
    [filters, researches]
  );

  const resetForm = () => {
    setSelectedId(null);
    setAnswerDraft({ voterId: '', option: '', note: '' });
    setFormData(INITIAL_FORM);
  };

  const openNew = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (research) => {
    setSelectedId(research.id);
    setAnswerDraft({ voterId: '', option: '', note: '' });
    setFormData({
      title: research.title || '',
      type: research.type || 'intention',
      bairro: research.bairro || '',
      assessorId: research.assessorId || '',
      description: research.description || '',
      answers: research.answers || []
    });
    setShowModal(true);
  };

  const addAnswer = () => {
    if (!answerDraft.voterId || !answerDraft.option) return;
    const voter = voters.find((item) => item.id === answerDraft.voterId);
    if (!voter) return;

    setFormData((prev) => ({
      ...prev,
      bairro: prev.bairro || voter.bairro || '',
      answers: [
        ...prev.answers,
        {
          id: `answer-${Date.now()}`,
          voterId: voter.id,
          voterName: voter.nome,
          bairro: voter.bairro || '',
          option: answerDraft.option,
          note: answerDraft.note || ''
        }
      ]
    }));
    setAnswerDraft({ voterId: '', option: '', note: '' });
  };

  const removeAnswer = (answerId) => {
    setFormData((prev) => ({
      ...prev,
      answers: prev.answers.filter((answer) => answer.id !== answerId)
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      await saveResearch(formData, selectedId);
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar pesquisa:', error);
      alert('Não foi possível salvar a pesquisa.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    if (!window.confirm('Tem certeza que deseja excluir esta pesquisa?')) return;
    try {
      await deleteResearch(selectedId);
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao excluir pesquisa:', error);
      alert('Não foi possível excluir a pesquisa.');
    }
  };

  return (
    <div className="campaign-dashboard">
      <section className="campaign-filters-card">
        <div className="campaign-filters-header">
          <div>
            <p className="campaign-kicker">
              <ClipboardList size={16} />
              Fase 13
            </p>
            <h3>Pesquisas</h3>
          </div>
          <button className="btn-primary" onClick={openNew} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={16} />
            Nova pesquisa
          </button>
        </div>

        <div className="campaign-filters-grid">
          <label className="funnel-filter-field">
            <span>Tipo</span>
            <select className="campaign-filter-select" value={filters.type} onChange={(event) => setFilters((prev) => ({ ...prev, type: event.target.value }))}>
              <option value="all">Todos</option>
              {RESEARCH_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </label>

          <label className="funnel-filter-field">
            <span>Bairro</span>
            <select className="campaign-filter-select" value={filters.bairro} onChange={(event) => setFilters((prev) => ({ ...prev, bairro: event.target.value }))}>
              <option value="">Todos</option>
              {neighborhoods.map((bairro) => (
                <option key={bairro} value={bairro}>{bairro}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <div className="campaign-metrics-grid">
        <MetricCard title="Pesquisas" value={stats.total} helper="Instrumentos cadastrados" />
        <MetricCard title="Respostas" value={stats.totalAnswers} helper="Base consolidada" tone="success" />
        <MetricCard title="Intenção" value={stats.intention} helper="Leituras de voto" />
        <MetricCard title="Satisfação" value={stats.satisfaction} helper="Humor do eleitorado" tone="highlight" />
        <MetricCard title="Prioridades" value={stats.priorities} helper="Temas mais sensíveis" />
        <MetricCard title="Avaliação" value={stats.evaluation} helper="Percepção geral" />
      </div>

      <div className="campaign-main-grid research-main-grid">
        <InsightPanel title="Pesquisas em campo" subtitle="Base por tipo, bairro e respostas coletadas">
          <div className="research-card-list">
            {loading ? <div className="campaign-empty-state">Carregando pesquisas...</div> : null}
            {!loading && filteredResearches.length === 0 ? <div className="campaign-empty-state">Nenhuma pesquisa encontrada com os filtros atuais.</div> : null}

            {filteredResearches.map((research) => (
              <article key={research.id} className="research-card">
                <div className="research-card-head">
                  <div>
                    <strong>{research.title}</strong>
                    <p>{RESEARCH_TYPES.find((item) => item.value === research.type)?.label || 'Pesquisa'} • {research.bairro || 'SEM BAIRRO'}</p>
                  </div>
                  <button type="button" className="funnel-link-btn" onClick={() => openEdit(research)}>
                    Detalhes
                  </button>
                </div>

                <div className="research-card-stats">
                  <span>{research.answers.length} resposta(s)</span>
                  <span>{research.assessorResponsavel || 'Sem responsável'}</span>
                </div>

                {research.description ? <p className="research-card-copy">{research.description}</p> : null}
              </article>
            ))}
          </div>
        </InsightPanel>

        <InsightPanel title="Consolidação por resposta" subtitle="Leitura rápida das opções mais marcadas" compact>
          <div className="research-aggregate-list">
            {aggregatedOptions.slice(0, 12).map((item) => (
              <div key={`${item.type}-${item.option}`} className="research-aggregate-card">
                <div className="research-aggregate-head">
                  <strong>{item.option}</strong>
                  <span>{item.total}</span>
                </div>
                <p>{RESEARCH_TYPES.find((type) => type.value === item.type)?.label || 'Pesquisa'}</p>
                <div className="research-aggregate-bar">
                  <div className="research-aggregate-fill" style={{ width: `${Math.min(100, item.total * 12)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </InsightPanel>
      </div>

      {showModal ? (
        <div className="funnel-modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="funnel-modal" onClick={(event) => event.stopPropagation()}>
            <div className="funnel-modal-header">
              <div>
                <h3>{selectedId ? 'Editar pesquisa' : 'Nova pesquisa'}</h3>
                <p>Tipos de pesquisa, respostas por eleitor e consolidação temática.</p>
              </div>
              <button type="button" className="funnel-link-btn" onClick={() => setShowModal(false)}>
                Fechar
              </button>
            </div>

            <form className="funnel-modal-form" onSubmit={handleSave}>
              <div className="campaign-filters-grid">
                <label className="funnel-filter-field">
                  <span>Título</span>
                  <input className="campaign-filter-select" value={formData.title} onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))} required />
                </label>

                <label className="funnel-filter-field">
                  <span>Tipo</span>
                  <select className="campaign-filter-select" value={formData.type} onChange={(event) => setFormData((prev) => ({ ...prev, type: event.target.value }))}>
                    {RESEARCH_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </label>

                <label className="funnel-filter-field">
                  <span>Bairro</span>
                  <input className="campaign-filter-select" value={formData.bairro} onChange={(event) => setFormData((prev) => ({ ...prev, bairro: event.target.value.toUpperCase() }))} />
                </label>

                <label className="funnel-filter-field">
                  <span>Responsável</span>
                  <select className="campaign-filter-select" value={formData.assessorId} onChange={(event) => setFormData((prev) => ({ ...prev, assessorId: event.target.value }))}>
                    <option value="">Selecionar responsável</option>
                    {assessors.map((assessor) => (
                      <option key={assessor.id} value={assessor.id}>{assessor.nome}</option>
                    ))}
                  </select>
                </label>

                <label className="funnel-filter-field" style={{ gridColumn: '1 / -1' }}>
                  <span>Descrição</span>
                  <textarea className="campaign-filter-select" rows="3" value={formData.description} onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))} />
                </label>
              </div>

              <div className="research-answer-section">
                <div className="research-answer-head">
                  <strong>Respostas</strong>
                  <span>{formData.answers.length} registrada(s)</span>
                </div>

                <div className="research-answer-draft">
                  <select className="campaign-filter-select" value={answerDraft.voterId} onChange={(event) => setAnswerDraft((prev) => ({ ...prev, voterId: event.target.value }))}>
                    <option value="">Selecionar eleitor</option>
                    {voters.map((voter) => (
                      <option key={voter.id} value={voter.id}>{voter.nome} • {voter.bairro}</option>
                    ))}
                  </select>

                  <select className="campaign-filter-select" value={answerDraft.option} onChange={(event) => setAnswerDraft((prev) => ({ ...prev, option: event.target.value }))}>
                    <option value="">Selecionar resposta</option>
                    {OPTIONS_BY_TYPE[formData.type].map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>

                  <input className="campaign-filter-select" placeholder="Observação" value={answerDraft.note} onChange={(event) => setAnswerDraft((prev) => ({ ...prev, note: event.target.value }))} />
                  <button type="button" className="btn-secondary" onClick={addAnswer}>Adicionar</button>
                </div>

                <div className="research-answer-list">
                  {formData.answers.map((answer) => (
                    <div key={answer.id} className="research-answer-item">
                      <div>
                        <strong>{answer.voterName}</strong>
                        <p>{answer.option} • {answer.bairro || 'SEM BAIRRO'}</p>
                        {answer.note ? <small>{answer.note}</small> : null}
                      </div>
                      <button type="button" className="icon-btn" onClick={() => removeAnswer(answer.id)}>
                        <Trash2 size={16} color="#dc2626" />
                      </button>
                    </div>
                  ))}
                </div>
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
                  {saving ? 'Salvando...' : 'Salvar pesquisa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
