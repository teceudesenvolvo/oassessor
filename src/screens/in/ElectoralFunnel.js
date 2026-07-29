import React, { useMemo, useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Filter, GripVertical, List, MessageSquareText, PanelLeftDashed, PhoneCall, Save, Search } from 'lucide-react';
import { FUNNEL_STAGES, useElectoralFunnel } from '../../hooks/useElectoralFunnel';
import { useAuth } from '../../useAuth';

function FunnelFilterSelect({ label, value, onChange, options }) {
  return (
    <label className="funnel-filter-field">
      <span>{label}</span>
      <select value={value} onChange={onChange} className="campaign-filter-select">
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function StageBadge({ stage }) {
  return <span className="funnel-stage-badge">{stage}</span>;
}

export default function ElectoralFunnel() {
  const { user } = useAuth();
  const { loading, filteredVoters, groupedByStage, filters, setFilters, options, assessors, updateVoterStage } = useElectoralFunnel(user);
  const [viewMode, setViewMode] = useState('kanban');
  const [draggedVoterId, setDraggedVoterId] = useState(null);
  const [selectedVoter, setSelectedVoter] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editor, setEditor] = useState({
    stage: 'Não contatado',
    notes: '',
    nextContact: '',
    responsible: ''
  });

  const stageOptions = useMemo(
    () => [
      { value: 'all', label: 'Todas as etapas' },
      ...FUNNEL_STAGES.map((stage) => ({ value: stage, label: stage }))
    ],
    []
  );

  const assessorOptions = useMemo(
    () => [{ value: 'all', label: 'Toda a equipe' }, ...options.assessors],
    [options.assessors]
  );

  const nextContactOptions = [
    { value: 'all', label: 'Todos os contatos' },
    { value: 'today', label: 'Contato hoje' },
    { value: 'scheduled', label: 'Com próximo contato' },
    { value: 'overdue', label: 'Atrasados' }
  ];

  const openEditor = (voter) => {
    setSelectedVoter(voter);
    setEditor({
      stage: voter.funnelStage || 'Não contatado',
      notes: voter.funnelNotes || '',
      nextContact: voter.funnelNextContact || '',
      responsible: voter.funnelOwner || voter.ownerLabel || ''
    });
  };

  const closeEditor = () => {
    setSelectedVoter(null);
    setSaving(false);
  };

  const saveEditor = async (event) => {
    event.preventDefault();
    if (!selectedVoter) return;

    try {
      setSaving(true);
      await updateVoterStage({
        voterId: selectedVoter.id,
        toStage: editor.stage,
        notes: editor.notes,
        nextContact: editor.nextContact,
        responsible: editor.responsible
      });
      closeEditor();
    } catch (error) {
      console.error('Erro ao salvar atualização do funil:', error);
      alert('Não foi possível salvar a atualização do funil.');
      setSaving(false);
    }
  };

  const moveStage = async (voter, direction) => {
    const currentIndex = FUNNEL_STAGES.indexOf(voter.funnelStage);
    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= FUNNEL_STAGES.length) return;

    try {
      await updateVoterStage({
        voterId: voter.id,
        toStage: FUNNEL_STAGES[nextIndex],
        notes: voter.funnelNotes || '',
        nextContact: voter.funnelNextContact || '',
        responsible: voter.funnelOwner || voter.ownerLabel || ''
      });
    } catch (error) {
      console.error('Erro ao mover etapa do funil:', error);
      alert('Não foi possível mover o eleitor para a próxima etapa.');
    }
  };

  const handleDrop = async (stage) => {
    if (!draggedVoterId) return;
    const voter = filteredVoters.find((item) => item.id === draggedVoterId);
    setDraggedVoterId(null);
    if (!voter || voter.funnelStage === stage) return;

    try {
      await updateVoterStage({
        voterId: voter.id,
        toStage: stage,
        notes: voter.funnelNotes || '',
        nextContact: voter.funnelNextContact || '',
        responsible: voter.funnelOwner || voter.ownerLabel || ''
      });
    } catch (error) {
      console.error('Erro ao arrastar no funil:', error);
      alert('Não foi possível atualizar a etapa pelo quadro.');
    }
  };

  return (
    <div className="campaign-dashboard">
      <section className="campaign-filters-card">
        <div className="campaign-filters-header">
          <div>
            <p className="campaign-kicker">
              <Filter size={16} />
              Fase 2
            </p>
            <h3>Funil Eleitoral</h3>
          </div>
          <div className="funnel-view-switch">
            <button
              className={viewMode === 'kanban' ? 'active' : ''}
              onClick={() => setViewMode('kanban')}
            >
              <PanelLeftDashed size={16} />
              Kanban
            </button>
            <button
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => setViewMode('list')}
            >
              <List size={16} />
              Lista
            </button>
          </div>
        </div>

        <div className="funnel-toolbar">
          <label className="funnel-search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="Buscar por nome, telefone ou email"
              value={filters.search}
              onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
            />
          </label>

          <div className="campaign-filters-grid">
            <FunnelFilterSelect
              label="Etapa"
              value={filters.stage}
              onChange={(event) => setFilters((prev) => ({ ...prev, stage: event.target.value }))}
              options={stageOptions}
            />
            <FunnelFilterSelect
              label="Bairro"
              value={filters.neighborhood}
              onChange={(event) => setFilters((prev) => ({ ...prev, neighborhood: event.target.value }))}
              options={[{ value: 'all', label: 'Todos os bairros' }, ...options.neighborhoods.map((item) => ({ value: item, label: item }))]}
            />
            <FunnelFilterSelect
              label="Cidade"
              value={filters.city}
              onChange={(event) => setFilters((prev) => ({ ...prev, city: event.target.value }))}
              options={[{ value: 'all', label: 'Todas as cidades' }, ...options.cities.map((item) => ({ value: item, label: item }))]}
            />
            <FunnelFilterSelect
              label="Responsável"
              value={filters.assessor}
              onChange={(event) => setFilters((prev) => ({ ...prev, assessor: event.target.value }))}
              options={assessorOptions}
            />
            <FunnelFilterSelect
              label="Próximo contato"
              value={filters.nextContact}
              onChange={(event) => setFilters((prev) => ({ ...prev, nextContact: event.target.value }))}
              options={nextContactOptions}
            />
          </div>
        </div>
      </section>

      <section className="funnel-summary-grid">
        {FUNNEL_STAGES.map((stage) => (
          <article key={stage} className="campaign-metric-card">
            <p>{stage}</p>
            <strong>{groupedByStage[stage]?.length || 0}</strong>
            <span>Eleitores neste ponto do relacionamento</span>
          </article>
        ))}
      </section>

      {loading ? (
        <div className="dashboard-card">Carregando funil eleitoral...</div>
      ) : viewMode === 'kanban' ? (
        <section className="funnel-kanban">
          {FUNNEL_STAGES.map((stage) => (
            <div
              key={stage}
              className="funnel-column"
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleDrop(stage)}
            >
              <div className="funnel-column-header">
                <div>
                  <h4>{stage}</h4>
                  <span>{groupedByStage[stage]?.length || 0} eleitor(es)</span>
                </div>
              </div>

              <div className="funnel-column-body">
                {(groupedByStage[stage] || []).map((voter) => (
                  <article
                    key={voter.id}
                    className="funnel-card"
                    draggable
                    onDragStart={() => setDraggedVoterId(voter.id)}
                    onDragEnd={() => setDraggedVoterId(null)}
                  >
                    <div className="funnel-card-header">
                      <div className="funnel-card-title">
                        <GripVertical size={16} />
                        <strong>{voter.nome}</strong>
                      </div>
                      <button className="funnel-link-btn" onClick={() => openEditor(voter)}>
                        Detalhar
                      </button>
                    </div>

                    <div className="funnel-card-meta">
                      <span>{voter.ownerLabel}</span>
                      <span>{voter.bairroLabel}</span>
                    </div>

                    {voter.funnelNextContact ? (
                      <div className="funnel-next-contact">
                        <PhoneCall size={14} />
                        Próximo contato: {voter.funnelNextContact}
                      </div>
                    ) : null}

                    {voter.funnelNotes ? <p className="funnel-card-note">{voter.funnelNotes}</p> : null}

                    <div className="funnel-card-actions">
                      <button onClick={() => moveStage(voter, -1)} disabled={FUNNEL_STAGES.indexOf(voter.funnelStage) === 0}>
                        <ChevronLeft size={16} />
                      </button>
                      <button onClick={() => moveStage(voter, 1)} disabled={FUNNEL_STAGES.indexOf(voter.funnelStage) === FUNNEL_STAGES.length - 1}>
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </section>
      ) : (
        <section className="campaign-insight-panel">
          <div className="campaign-insight-header">
            <div>
              <h3>Lista estratégica</h3>
              <p>{filteredVoters.length} eleitor(es) após aplicação dos filtros</p>
            </div>
          </div>

          <div className="funnel-list">
            {filteredVoters.map((voter) => (
              <article key={voter.id} className="funnel-list-row">
                <div className="funnel-list-primary">
                  <strong>{voter.nome}</strong>
                  <span>{voter.telefone || voter.email || 'Sem contato principal'}</span>
                </div>
                <StageBadge stage={voter.funnelStage} />
                <div className="funnel-list-meta">
                  <span>{voter.ownerLabel}</span>
                  <span>{voter.bairroLabel}</span>
                  <span>{voter.funnelNextContact || 'Sem próximo contato'}</span>
                </div>
                <button className="funnel-link-btn" onClick={() => openEditor(voter)}>
                  Abrir
                </button>
              </article>
            ))}

            {filteredVoters.length === 0 ? (
              <div className="campaign-empty-state">
                <CheckCircle2 size={18} />
                Nenhum eleitor encontrado com os filtros atuais.
              </div>
            ) : null}
          </div>
        </section>
      )}

      {selectedVoter ? (
        <div className="funnel-modal-backdrop" onClick={closeEditor}>
          <div className="funnel-modal" onClick={(event) => event.stopPropagation()}>
            <div className="funnel-modal-header">
              <div>
                <h3>{selectedVoter.nome}</h3>
                <p>{selectedVoter.ownerLabel} • {selectedVoter.telefone || selectedVoter.email || 'Sem contato principal'}</p>
              </div>
              <button className="funnel-link-btn" onClick={closeEditor}>Fechar</button>
            </div>

            <form className="funnel-modal-form" onSubmit={saveEditor}>
              <div className="campaign-filters-grid">
                <FunnelFilterSelect
                  label="Etapa"
                  value={editor.stage}
                  onChange={(event) => setEditor((prev) => ({ ...prev, stage: event.target.value }))}
                  options={FUNNEL_STAGES.map((stage) => ({ value: stage, label: stage }))}
                />
                <FunnelFilterSelect
                  label="Responsável"
                  value={editor.responsible}
                  onChange={(event) => setEditor((prev) => ({ ...prev, responsible: event.target.value }))}
                  options={[
                    { value: '', label: 'Selecione' },
                    ...new Map(
                      assessors.map((assessor) => [
                        assessor.nome || assessor.email || assessor.id,
                        { value: assessor.nome || assessor.email || assessor.id, label: assessor.nome || assessor.email || assessor.id }
                      ])
                    ).values(),
                    { value: 'Administrador', label: 'Administrador' }
                  ]}
                />
                <label className="funnel-filter-field">
                  <span>Próximo contato</span>
                  <input
                    type="date"
                    className="campaign-filter-select"
                    value={editor.nextContact}
                    onChange={(event) => setEditor((prev) => ({ ...prev, nextContact: event.target.value }))}
                  />
                </label>
              </div>

              <label className="funnel-filter-field">
                <span>Observações</span>
                <textarea
                  className="funnel-notes-area"
                  value={editor.notes}
                  onChange={(event) => setEditor((prev) => ({ ...prev, notes: event.target.value }))}
                  placeholder="Registre contexto, objeções, compromisso assumido e próximo passo."
                />
              </label>

              <div className="funnel-history-block">
                <div className="campaign-insight-header">
                  <div>
                    <h3>Histórico</h3>
                    <p>Últimas movimentações do eleitor no funil</p>
                  </div>
                </div>

                <div className="funnel-history-list">
                  {selectedVoter.history.length === 0 ? (
                    <div className="campaign-empty-state">
                      <MessageSquareText size={18} />
                      Ainda não há histórico registrado para este eleitor.
                    </div>
                  ) : (
                    selectedVoter.history.slice(0, 8).map((entry) => (
                      <article key={entry.id} className="funnel-history-item">
                        <div>
                          <strong>{entry.fromStage} → {entry.toStage}</strong>
                          <p>{entry.notes || 'Sem observações registradas.'}</p>
                        </div>
                        <span>{entry.changedAt ? new Date(entry.changedAt).toLocaleString('pt-BR') : 'Agora'}</span>
                      </article>
                    ))
                  )}
                </div>
              </div>

              <div className="funnel-modal-actions">
                <button type="button" className="btn-secondary" onClick={closeEditor}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  <Save size={16} />
                  {saving ? 'Salvando...' : 'Salvar atualização'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
