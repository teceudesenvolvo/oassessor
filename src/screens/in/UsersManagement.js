import React, { useState } from 'react';
import { LockKeyhole, Plus, Save, Shield, Trash2, UsersRound } from 'lucide-react';
import InsightPanel from '../../components/dashboard/InsightPanel';
import MetricCard from '../../components/dashboard/MetricCard';
import { useUsersManagement, USER_ROLE_OPTIONS } from '../../hooks/useUsersManagement';
import { useAuth } from '../../useAuth';

const INITIAL_FORM = {
  nome: '',
  email: '',
  cargo: '',
  cpf: '',
  telefone: '',
  tipoUser: 'assessor',
  status: 'Ativo',
  permissions: {}
};

const PERMISSION_FIELDS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'voters', label: 'Eleitores' },
  { key: 'funnel', label: 'Funil' },
  { key: 'team', label: 'Equipe' },
  { key: 'territory', label: 'Território' },
  { key: 'communication', label: 'Comunicação' },
  { key: 'reports', label: 'Relatórios' },
  { key: 'settings', label: 'Configurações' }
];

export default function UsersManagement() {
  const { user } = useAuth();
  const { loading, users, stats, roleDefaults, saveUser, deleteUser } = useUsersManagement(user);
  const [showModal, setShowModal] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);

  const openNew = () => {
    setSelectedId(null);
    setFormData({ ...INITIAL_FORM, permissions: roleDefaults.assessor });
    setShowModal(true);
  };

  const openEdit = (entry) => {
    setSelectedId(entry.id);
    setFormData({
      nome: entry.nome || '',
      email: entry.email || '',
      cargo: entry.cargo || '',
      cpf: entry.cpf || '',
      telefone: entry.telefone || '',
      tipoUser: entry.tipoUser || 'assessor',
      status: entry.status || 'Ativo',
      permissions: entry.permissions || roleDefaults[entry.tipoUser] || roleDefaults.assessor
    });
    setShowModal(true);
  };

  const handleRoleChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      tipoUser: value,
      permissions: roleDefaults[value] || prev.permissions
    }));
  };

  const togglePermission = (key) => {
    setFormData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key]
      }
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      await saveUser(formData, selectedId);
      setShowModal(false);
      setSelectedId(null);
      setFormData(INITIAL_FORM);
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      alert(error.message || 'Não foi possível salvar o usuário.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    if (!window.confirm('Tem certeza que deseja excluir este usuário?')) return;
    try {
      await deleteUser(selectedId);
      setShowModal(false);
      setSelectedId(null);
      setFormData(INITIAL_FORM);
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      alert(error.message || 'Não foi possível excluir o usuário.');
    }
  };

  return (
    <div className="campaign-dashboard">
      <section className="campaign-filters-card">
        <div className="campaign-filters-header">
          <div>
            <p className="campaign-kicker">
              <UsersRound size={16} />
              Fase 16
            </p>
            <h3>Usuários</h3>
          </div>
          <button className="btn-primary" onClick={openNew} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={16} />
            Novo usuário
          </button>
        </div>
        <p style={{ margin: 0, color: '#64748b', lineHeight: 1.6 }}>
          Gerencie papéis e permissões do portal mantendo compatibilidade com os usuários e assessores já existentes no projeto.
        </p>
      </section>

      <div className="campaign-metrics-grid">
        <MetricCard title="Usuários" value={stats.total} helper="Base total gerenciada" />
        <MetricCard title="Ativos" value={stats.active} helper="Perfis habilitados" tone="success" />
        <MetricCard title="Convites pendentes" value={stats.pending} helper="Usuários ainda não ativados" tone="highlight" />
        <MetricCard title="Administradores" value={stats.byRole.admin} helper="Controle da campanha" />
        <MetricCard title="Assessores" value={stats.byRole.assessor} helper="Operação em campo" />
        <MetricCard title="Leitura" value={stats.byRole.reader} helper="Perfis somente consulta" />
      </div>

      <div className="campaign-main-grid users-main-grid">
        <InsightPanel title="Usuários cadastrados" subtitle="Papéis e status de acesso">
          <div className="users-card-list">
            {loading ? <div className="campaign-empty-state">Carregando usuários...</div> : null}
            {!loading && users.length === 0 ? <div className="campaign-empty-state">Nenhum usuário encontrado.</div> : null}

            {users.map((entry) => (
              <article key={entry.id} className="users-card">
                <div className="users-card-head">
                  <div>
                    <strong>{entry.nome}</strong>
                    <p>{entry.email || 'Sem e-mail'} • {USER_ROLE_OPTIONS.find((role) => role.value === entry.tipoUser)?.label || entry.tipoUser}</p>
                  </div>
                  <button type="button" className="funnel-link-btn" onClick={() => openEdit(entry)}>
                    Gerenciar
                  </button>
                </div>
                <div className="users-card-tags">
                  <span className="users-role-pill">{entry.status || 'Ativo'}</span>
                  <span className="users-role-pill">{entry.cargo || 'Sem cargo'}</span>
                </div>
              </article>
            ))}
          </div>
        </InsightPanel>

        <InsightPanel title="Papéis disponíveis" subtitle="Estrutura de acesso prevista pelo portal" compact>
          <div className="campaign-list-block">
            {USER_ROLE_OPTIONS.map((role) => (
              <article key={role.value} className="campaign-list-item">
                <div>
                  <strong>{role.label}</strong>
                  <p>{Object.entries(roleDefaults[role.value] || {}).filter(([, allowed]) => allowed).length} permissão(ões) padrão</p>
                </div>
                <Shield size={18} color="#2563eb" />
              </article>
            ))}
          </div>
        </InsightPanel>
      </div>

      {showModal ? (
        <div className="funnel-modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="funnel-modal" onClick={(event) => event.stopPropagation()}>
            <div className="funnel-modal-header">
              <div>
                <h3>{selectedId ? 'Editar usuário' : 'Novo usuário'}</h3>
                <p>Papéis e permissões centralizados sem alterar o fluxo atual de convites e cadastro.</p>
              </div>
              <button type="button" className="funnel-link-btn" onClick={() => setShowModal(false)}>
                Fechar
              </button>
            </div>

            <form className="funnel-modal-form" onSubmit={handleSave}>
              <div className="campaign-filters-grid">
                <label className="funnel-filter-field">
                  <span>Nome</span>
                  <input className="campaign-filter-select" value={formData.nome} onChange={(event) => setFormData((prev) => ({ ...prev, nome: event.target.value }))} required />
                </label>
                <label className="funnel-filter-field">
                  <span>E-mail</span>
                  <input className="campaign-filter-select" type="email" value={formData.email} onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))} required />
                </label>
                <label className="funnel-filter-field">
                  <span>Cargo</span>
                  <input className="campaign-filter-select" value={formData.cargo} onChange={(event) => setFormData((prev) => ({ ...prev, cargo: event.target.value }))} />
                </label>
                <label className="funnel-filter-field">
                  <span>Status</span>
                  <select className="campaign-filter-select" value={formData.status} onChange={(event) => setFormData((prev) => ({ ...prev, status: event.target.value }))}>
                    <option value="Ativo">Ativo</option>
                    <option value="Invited">Convite enviado</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </label>
                <label className="funnel-filter-field">
                  <span>CPF</span>
                  <input className="campaign-filter-select" value={formData.cpf} onChange={(event) => setFormData((prev) => ({ ...prev, cpf: event.target.value }))} />
                </label>
                <label className="funnel-filter-field">
                  <span>Telefone</span>
                  <input className="campaign-filter-select" value={formData.telefone} onChange={(event) => setFormData((prev) => ({ ...prev, telefone: event.target.value }))} />
                </label>
                <label className="funnel-filter-field">
                  <span>Papel</span>
                  <select className="campaign-filter-select" value={formData.tipoUser} onChange={(event) => handleRoleChange(event.target.value)}>
                    {USER_ROLE_OPTIONS.map((role) => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="users-permissions-box">
                <div className="users-permissions-head">
                  <LockKeyhole size={18} />
                  <strong>Permissões</strong>
                </div>
                <div className="users-permissions-grid">
                  {PERMISSION_FIELDS.map((permission) => (
                    <button
                      key={permission.key}
                      type="button"
                      className={`users-permission-chip ${formData.permissions[permission.key] ? 'active' : ''}`}
                      onClick={() => togglePermission(permission.key)}
                    >
                      {permission.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="funnel-modal-actions">
                {selectedId && selectedId !== user.uid ? (
                  <button type="button" className="btn-secondary" onClick={handleDelete} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#dc2626', borderColor: '#fecaca' }}>
                    <Trash2 size={16} />
                    Excluir
                  </button>
                ) : <span />}

                <button type="submit" className="btn-primary" disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <Save size={16} />
                  {saving ? 'Salvando...' : 'Salvar usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
