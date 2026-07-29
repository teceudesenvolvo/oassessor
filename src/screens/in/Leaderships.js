import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, GitBranch, Plus, Save, Trash2, Users } from 'lucide-react';
import { useAuth } from '../../useAuth';
import { LEADERSHIP_ROLES, useLeaderships } from '../../hooks/useLeaderships';
import InsightPanel from '../../components/dashboard/InsightPanel';
import MetricCard from '../../components/dashboard/MetricCard';

const INITIAL_FORM = {
  nome: '',
  telefone: '',
  endereco: '',
  bairro: '',
  areaInfluencia: '',
  quantidadePrometida: '',
  quantidadeConfirmada: '',
  observacoes: '',
  assessorResponsavel: '',
  role: 'leadership',
  parentId: '',
  voterIds: []
};

function TreeNode({ node, level = 0, onEdit }) {
  const [collapsed, setCollapsed] = useState(false);
  const hasChildren = node.children.length > 0;

  return (
    <div className="leadership-tree-node" style={{ marginLeft: level * 18 }}>
      <div className="leadership-tree-card">
        <button
          type="button"
          className="leadership-tree-toggle"
          onClick={() => hasChildren && setCollapsed((prev) => !prev)}
        >
          {hasChildren ? (collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />) : <GitBranch size={16} />}
        </button>

        <div className="leadership-tree-copy">
          <strong>{node.nome}</strong>
          <p>{node.roleLabel} • {node.bairro} • {node.assignedVotersCount} eleitor(es)</p>
        </div>

        <button type="button" className="funnel-link-btn" onClick={() => onEdit(node)}>
          Gerenciar
        </button>
      </div>

      {!collapsed && hasChildren ? (
        <div className="leadership-tree-children">
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} level={level + 1} onEdit={onEdit} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function Leaderships() {
  const { user } = useAuth();
  const { loading, tree, leaderships, assessors, voters, availableVoters, saveLeadership, deleteLeadership } = useLeaderships(user);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);

  const roleOptions = LEADERSHIP_ROLES;

  const parentOptions = useMemo(
    () =>
      leaderships
        .filter((item) => item.id !== selectedId)
        .map((item) => ({
          value: item.id,
          label: `${item.nome} • ${item.roleLabel}`
        })),
    [leaderships, selectedId]
  );

  const voterPool = useMemo(() => {
    if (!selectedId) return availableVoters;
    const current = leaderships.find((item) => item.id === selectedId);
    if (!current) return availableVoters;
    const currentVoters = voters.filter((voter) => current.voterIds.includes(voter.id));
    return [...currentVoters, ...availableVoters].sort((a, b) => a.nome.localeCompare(b.nome));
  }, [availableVoters, leaderships, selectedId, voters]);

  const stats = useMemo(() => {
    const totalPrometido = leaderships.reduce((sum, item) => sum + Number(item.quantidadePrometida || 0), 0);
    const totalConfirmado = leaderships.reduce((sum, item) => sum + Number(item.quantidadeConfirmada || 0), 0);
    const mobilizadores = leaderships.filter((item) => item.role === 'mobilizer').length;
    const liderancasAtivas = leaderships.filter((item) => item.role === 'leadership').length;

    return {
      total: leaderships.length,
      totalPrometido,
      totalConfirmado,
      mobilizadores,
      liderancasAtivas
    };
  }, [leaderships]);

  const resetForm = () => {
    setSelectedId(null);
    setFormData(INITIAL_FORM);
  };

  const openNew = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (leadership) => {
    setSelectedId(leadership.id);
    setFormData({
      nome: leadership.nome || '',
      telefone: leadership.telefone || '',
      endereco: leadership.endereco || '',
      bairro: leadership.bairro || '',
      areaInfluencia: leadership.areaInfluencia || '',
      quantidadePrometida: String(leadership.quantidadePrometida || ''),
      quantidadeConfirmada: String(leadership.quantidadeConfirmada || ''),
      observacoes: leadership.observacoes || '',
      assessorResponsavel: leadership.assessorResponsavel || '',
      role: leadership.role || 'leadership',
      parentId: leadership.parentId || '',
      voterIds: leadership.voterIds || []
    });
    setShowModal(true);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleVoterSelection = (voterId) => {
    setFormData((prev) => ({
      ...prev,
      voterIds: prev.voterIds.includes(voterId)
        ? prev.voterIds.filter((id) => id !== voterId)
        : [...prev.voterIds, voterId]
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      await saveLeadership(formData, selectedId);
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar liderança:', error);
      alert(error.message || 'Não foi possível salvar a liderança.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    if (!window.confirm('Tem certeza que deseja excluir esta liderança?')) return;

    try {
      await deleteLeadership(selectedId);
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao excluir liderança:', error);
      alert('Não foi possível excluir a liderança.');
    }
  };

  return (
    <div className="campaign-dashboard">
      <section className="campaign-filters-card">
        <div className="campaign-filters-header">
          <div>
            <p className="campaign-kicker">
              <Users size={16} />
              Fase 4
            </p>
            <h3>Lideranças</h3>
          </div>
          <button className="btn-primary" onClick={openNew} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={16} />
            Nova liderança
          </button>
        </div>
        <p style={{ margin: 0, color: '#64748b', lineHeight: 1.6 }}>
          Estruture candidato, coordenação, lideranças e mobilizadores em uma árvore única, vinculando eleitores sem duplicidade dentro da rede.
        </p>
      </section>

      <div className="campaign-metrics-grid">
        <MetricCard title="Nós na árvore" value={stats.total} helper="Candidato, coordenação, lideranças e mobilizadores" />
        <MetricCard title="Lideranças ativas" value={stats.liderancasAtivas} helper="Nós com papel de liderança" tone="success" />
        <MetricCard title="Mobilizadores" value={stats.mobilizadores} helper="Base operacional em campo" />
        <MetricCard title="Quantidade prometida" value={stats.totalPrometido} helper="Soma declarada pela rede" tone="highlight" />
        <MetricCard title="Quantidade confirmada" value={stats.totalConfirmado} helper="Confirmações consolidadas na estrutura" tone="success" />
      </div>

      <div className="campaign-main-grid">
        <InsightPanel title="Árvore hierárquica" subtitle="Candidato → Coordenador → Liderança → Mobilizador → Eleitores">
          <div className="leadership-tree">
            {loading ? (
              <div className="campaign-empty-state">Carregando estrutura...</div>
            ) : tree.length === 0 ? (
              <div className="campaign-empty-state">Nenhuma liderança cadastrada ainda.</div>
            ) : (
              tree.map((node) => <TreeNode key={node.id} node={node} onEdit={openEdit} />)
            )}
          </div>
        </InsightPanel>

        <InsightPanel title="Leitura da rede" subtitle="Indicadores rápidos da estrutura" compact>
          <div className="campaign-notes-list leadership-side-scroll">
            <div className="campaign-note-item">
              <strong>Eleitores disponíveis</strong>
              <p>{availableVoters.length} ainda não estão vinculados a uma liderança.</p>
            </div>
            <div className="campaign-note-item">
              <strong>Assessores responsáveis</strong>
              <p>{assessors.length} assessor(es) podem assumir lideranças.</p>
            </div>
            <div className="campaign-note-item">
              <strong>Base monitorada</strong>
              <p>{voters.length} eleitor(es) estão elegíveis para associação na árvore.</p>
            </div>
          </div>
        </InsightPanel>
      </div>

      {showModal ? (
        <div className="funnel-modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="funnel-modal" onClick={(event) => event.stopPropagation()}>
            <div className="funnel-modal-header">
              <div>
                <h3>{selectedId ? 'Editar liderança' : 'Nova liderança'}</h3>
                <p>Cadastre a estrutura e associe eleitores sem repetir vínculos.</p>
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
                  <span>Endereço</span>
                  <input className="campaign-filter-select" name="endereco" value={formData.endereco} onChange={handleChange} />
                </label>
                <label className="funnel-filter-field">
                  <span>Bairro</span>
                  <input className="campaign-filter-select" name="bairro" value={formData.bairro} onChange={handleChange} />
                </label>
                <label className="funnel-filter-field">
                  <span>Área de influência</span>
                  <input className="campaign-filter-select" name="areaInfluencia" value={formData.areaInfluencia} onChange={handleChange} />
                </label>
                <label className="funnel-filter-field">
                  <span>Papel na árvore</span>
                  <select className="campaign-filter-select" name="role" value={formData.role} onChange={handleChange}>
                    {roleOptions.map((role) => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </label>
                <label className="funnel-filter-field">
                  <span>Nó acima</span>
                  <select className="campaign-filter-select" name="parentId" value={formData.parentId} onChange={handleChange}>
                    <option value="">Sem vínculo acima</option>
                    {parentOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
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
                <label className="funnel-filter-field">
                  <span>Quantidade prometida</span>
                  <input className="campaign-filter-select" type="number" min="0" name="quantidadePrometida" value={formData.quantidadePrometida} onChange={handleChange} />
                </label>
                <label className="funnel-filter-field">
                  <span>Quantidade confirmada</span>
                  <input className="campaign-filter-select" type="number" min="0" name="quantidadeConfirmada" value={formData.quantidadeConfirmada} onChange={handleChange} />
                </label>
              </div>

              <label className="funnel-filter-field">
                <span>Observações</span>
                <textarea className="funnel-notes-area" name="observacoes" value={formData.observacoes} onChange={handleChange} />
              </label>

              <div className="leadership-voters-block">
                <div className="campaign-insight-header">
                  <div>
                    <h3>Eleitores vinculados</h3>
                    <p>Selecione os eleitores que passam a compor esta liderança.</p>
                  </div>
                </div>

                <div className="leadership-voters-grid">
                  {voterPool.length === 0 ? (
                    <div className="campaign-empty-state">Não há eleitores livres para vincular neste momento.</div>
                  ) : (
                    voterPool.map((voter) => (
                      <label key={voter.id} className={`leadership-voter-option ${formData.voterIds.includes(voter.id) ? 'selected' : ''}`}>
                        <input
                          type="checkbox"
                          checked={formData.voterIds.includes(voter.id)}
                          onChange={() => handleVoterSelection(voter.id)}
                        />
                        <div>
                          <strong>{voter.nome}</strong>
                          <p>{voter.bairro} • {voter.cidade}</p>
                        </div>
                      </label>
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
                  {saving ? 'Salvando...' : 'Salvar liderança'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
