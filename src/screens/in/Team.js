import React, { useEffect, useMemo, useState } from 'react';
import { UserPlus, MoreVertical, X, Edit, Trash, Share2, Shield, Mail, Phone, BadgeCheck } from 'lucide-react';
import { ref, query, orderByChild, equalTo, onValue, push, set, update, remove } from '../../services/firestoreDatabase';
import { database } from '../../firebaseConfig';
import { useAuth } from '../../useAuth';
import { useTeamPerformance } from '../../hooks/useTeamPerformance';
import { USER_ROLE_DEFAULTS, USER_ROLE_OPTIONS } from '../../hooks/useUsersManagement';
import MetricCard from '../../components/dashboard/MetricCard';

const CLOUD_FUNCTION_URL = 'https://us-central1-oassessor-blu.cloudfunctions.net/sendInviteEmail';
const DELETE_USER_URL = 'https://us-central1-oassessor-blu.cloudfunctions.net/deleteUser';

const EMPTY_FORM = {
  nome: '',
  email: '',
  cargo: '',
  cpf: '',
  telefone: '',
  tipoUser: 'assessor',
  permissions: USER_ROLE_DEFAULTS.assessor
};

export default function Team() {
  const { user } = useAuth();
  const { loading: performanceLoading, memberStats, summary, metaPrincipal } = useTeamPerformance(user);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [emailFallback, setEmailFallback] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => {
    if (!user) return;

    const teamRef = ref(database, 'assessores');
    const q = query(teamRef, orderByChild('adminId'), equalTo(user.uid));

    const unsubscribe = onValue(q, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const teamList = Object.keys(data).map((key) => ({ id: key, ...data[key] }));
        setMembers(teamList);
      } else {
        setMembers([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const statsByMember = useMemo(
    () => memberStats.reduce((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {}),
    [memberStats]
  );

  const handleMaskChange = (event) => {
    const { name, value } = event.target;
    let maskedValue = value;

    if (name === 'cpf') {
      maskedValue = maskedValue.replace(/\D/g, '').slice(0, 11)
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2');
    } else if (name === 'telefone') {
      maskedValue = maskedValue.replace(/\D/g, '').slice(0, 11);
      maskedValue = maskedValue.replace(/^(\d{2})(\d)/g, '($1) $2');
      maskedValue = maskedValue.replace(/(\d)(\d{4})$/, '$1-$2');
    }

    setFormData((prev) => ({ ...prev, [name]: maskedValue }));
  };

  const resetForm = () => {
    setFormData(EMPTY_FORM);
  };

  const handleShareInvite = (link) => {
    if (link) {
      navigator.clipboard.writeText(link);
      alert('Link de convite copiado para a área de transferência!');
    } else {
      alert('Link de convite não disponível para este membro.');
    }
    setMenuOpen(null);
  };

  const sendInviteEmail = async (name, emailAddress, link) => {
    try {
      if (CLOUD_FUNCTION_URL === 'https://us-central1-seu-projeto.cloudfunctions.net/sendInviteEmail') {
        throw new Error('Cloud Function URL não configurada.');
      }

      const response = await fetch(CLOUD_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailAddress,
          nome: name,
          inviteLink: link
        })
      });

      if (!response.ok) {
        throw new Error(`Falha no envio (${response.status})`);
      }

      alert('O convite foi enviado por email com sucesso.');
    } catch (error) {
      console.warn('Falha no envio automático, usando fallback:', error);

      const subject = 'Convite para O Assessor';
      const inviteLink = `oassessor.vercel.app/cadastro?email=${encodeURIComponent(emailAddress)}`;
      const body = `Olá ${name},\n\nVocê foi convidado para fazer parte da equipe no aplicativo O Assessor.\n\nPara concluir seu cadastro, clique no link abaixo:\n\n${inviteLink}\n\nAtenciosamente,\nEquipe O Assessor`;
      const mailto = `mailto:${emailAddress}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      setEmailFallback(mailto);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user) return;

    if (!formData.nome || !formData.email) {
      alert('Por favor, preencha os campos obrigatórios (Nome e E-mail).');
      return;
    }

    setSaving(true);

    try {
      if (isEditing && selectedMemberId) {
        await update(ref(database, `assessores/${selectedMemberId}`), formData);
        await update(ref(database, `users/${selectedMemberId}`), formData);
        alert('Membro atualizado com sucesso!');
      } else {
        const teamRef = ref(database, 'assessores');
        const newMemberRef = push(teamRef);
        const newId = newMemberRef.key;
        const inviteLink = `https://oassessor.vercel.app/cadastro?email=${encodeURIComponent(formData.email)}`;

        const assessorData = {
          ...formData,
          adminId: user.uid,
          creatorId: user.uid,
          status: 'invited',
          createdAt: new Date().toISOString(),
          inviteLink
        };

        await set(newMemberRef, assessorData);
        await set(ref(database, `users/${newId}`), assessorData);
        await sendInviteEmail(formData.nome, formData.email, inviteLink);
      }

      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar dados.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, email) => {
    if (!window.confirm('Tem certeza que deseja excluir este membro?')) return;

    if (email) {
      try {
        const response = await fetch(DELETE_USER_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.warn(`Aviso: Falha ao excluir do Auth (${response.status}):`, errorText);
        }
      } catch (authError) {
        console.warn('Erro ao chamar Cloud Function de exclusão (ignorando para remover do banco):', authError);
      }
    }

    try {
      await remove(ref(database, `assessores/${id}`));
      await remove(ref(database, `users/${id}`));
      setMenuOpen(null);
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('Erro ao excluir membro.');
    }
  };

  const openMemberModal = (member = null) => {
    if (member) {
      setFormData({
        nome: member.nome || '',
        email: member.email || '',
        cargo: member.cargo || '',
        cpf: member.cpf || '',
        telefone: member.telefone || '',
        tipoUser: member.tipoUser || 'assessor',
        permissions: member.permissions || USER_ROLE_DEFAULTS[member.tipoUser || 'assessor'] || USER_ROLE_DEFAULTS.assessor
      });
      setSelectedMemberId(member.id);
      setIsEditing(true);
    } else {
      resetForm();
      setSelectedMemberId(null);
      setIsEditing(false);
    }

    setShowModal(true);
    setMenuOpen(null);
  };

  const handleManageAccess = (member) => {
    setFormData({
      nome: member.nome || '',
      email: member.email || '',
      cargo: member.cargo || '',
      cpf: member.cpf || '',
      telefone: member.telefone || '',
      tipoUser: member.tipoUser || 'assessor',
      permissions: member.permissions || USER_ROLE_DEFAULTS[member.tipoUser || 'assessor'] || USER_ROLE_DEFAULTS.assessor
    });
    setSelectedMemberId(member.id);
    setShowAccessModal(true);
    setMenuOpen(null);
  };

  const handleSaveAccess = async () => {
    if (!selectedMemberId) return;

    setSaving(true);
    try {
      await update(ref(database, `assessores/${selectedMemberId}`), {
        tipoUser: formData.tipoUser,
        permissions: formData.permissions,
        updatedAt: new Date().toISOString()
      });
      await update(ref(database, `users/${selectedMemberId}`), {
        tipoUser: formData.tipoUser,
        permissions: formData.permissions,
        updatedAt: new Date().toISOString()
      });
      setShowAccessModal(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-card team-screen">
      <div className="campaign-metrics-grid team-metrics-grid">
        <MetricCard title="Produtividade média" value={`${summary.avgConversion.toFixed(1)}%`} helper="Conversão média da equipe" tone="success" />
        <MetricCard title="Tarefas pendentes" value={summary.totalPendingTasks} helper="Pendências somadas da equipe" />
        <MetricCard title="Visitas" value={summary.totalVisits} helper="Tarefas do tipo visita" tone="highlight" />
        <MetricCard title="Apoios" value={summary.totalSupport} helper="Base em estágio de apoio ou melhor" />
        <MetricCard title="Votos confirmados" value={summary.totalConfirmed} helper="Confirmações somadas da equipe" tone="success" />
        <MetricCard title="Meta da equipe" value={metaPrincipal || 0} helper="Meta principal atual da campanha" />
      </div>

      <section className="team-panel">
        <div className="team-panel-header">
          <div>
            <span className="team-panel-kicker">Operação</span>
            <h3>Minha Equipe</h3>
            <p>Gerencie convites, papéis, produtividade e acessos sem poluir a leitura da tela.</p>
          </div>

          <button className="btn-primary team-add-button" onClick={() => openMemberModal()}>
            <UserPlus size={16} />
            Novo membro
          </button>
        </div>

        <div className="team-members-grid">
          {(loading || performanceLoading) && (
            <div className="team-empty-state">Carregando equipe...</div>
          )}

          {!loading && !performanceLoading && members.length === 0 && (
            <div className="team-empty-state">Nenhum membro encontrado.</div>
          )}

          {!loading && members.map((member) => {
            const stats = statsByMember[member.id] || {};
            const isInvited = member.status === 'invited';

            return (
              <article key={member.id} className="team-member-card">
                <div className="team-member-card-top">
                  <div className="team-member-identity">
                    <div className="team-member-avatar">
                      {(member.nome || member.email || 'A').slice(0, 1).toUpperCase()}
                    </div>
                    <div className="team-member-copy">
                      <strong>{member.nome || member.email}</strong>
                      <span>{member.cargo || 'Assessor'}</span>
                    </div>
                  </div>

                  <div className="team-member-top-actions">
                    <span className={`team-status-chip ${isInvited ? 'warning' : 'success'}`}>
                      {isInvited ? 'Convidado' : 'Ativo'}
                    </span>

                    <div className="team-action-menu">
                      <button
                        type="button"
                        className="team-menu-trigger"
                        onClick={() => setMenuOpen(menuOpen === member.id ? null : member.id)}
                        aria-label="Abrir ações do membro"
                      >
                        <MoreVertical size={18} />
                      </button>

                      {menuOpen === member.id && (
                        <div className="team-menu-dropdown">
                          <button type="button" onClick={() => handleShareInvite(member.inviteLink)}>
                            <Share2 size={15} />
                            Copiar convite
                          </button>
                          <button type="button" onClick={() => handleManageAccess(member)}>
                            <Shield size={15} />
                            Gerenciar acessos
                          </button>
                          <button type="button" onClick={() => openMemberModal(member)}>
                            <Edit size={15} />
                            Editar
                          </button>
                          <button type="button" className="danger" onClick={() => handleDelete(member.id, member.email)}>
                            <Trash size={15} />
                            Excluir
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="team-member-meta">
                  <span><Mail size={14} /> {member.email || 'E-mail não informado'}</span>
                  <span><Phone size={14} /> {member.telefone || 'Telefone não informado'}</span>
                  <span><BadgeCheck size={14} /> {USER_ROLE_OPTIONS.find((role) => role.value === member.tipoUser)?.label || 'Assessor'}</span>
                </div>

                <div className="team-member-stats">
                  <div>
                    <strong>{stats.confirmedVotes || 0}</strong>
                    <span>Votos</span>
                  </div>
                  <div>
                    <strong>{stats.pendingTasks || 0}</strong>
                    <span>Tarefas</span>
                  </div>
                  <div>
                    <strong>{stats.visits || 0}</strong>
                    <span>Visitas</span>
                  </div>
                  <div>
                    <strong>{stats.supportCount || 0}</strong>
                    <span>Apoios</span>
                  </div>
                  <div>
                    <strong>{(stats.conversion || 0).toFixed(1)}%</strong>
                    <span>Conversão</span>
                  </div>
                  <div>
                    <strong>{Math.round(stats.progressToGoal || 0)}%</strong>
                    <span>Meta</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {showModal && (
        <div className="funnel-modal-backdrop dashboard-modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="funnel-modal team-modal" onClick={(event) => event.stopPropagation()}>
            <div className="funnel-modal-header">
              <div>
                <h3>{isEditing ? 'Editar membro da equipe' : 'Novo membro da equipe'}</h3>
                <p>Convide, atualize dados cadastrais e mantenha a operação organizada.</p>
              </div>
              <button type="button" className="accountability-modal-close" onClick={() => setShowModal(false)} aria-label="Fechar modal">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="team-modal-form">
              <div className="team-modal-grid">
                <div className="input-group">
                  <label>Nome</label>
                  <input type="text" value={formData.nome} onChange={(event) => setFormData({ ...formData, nome: event.target.value })} className="custom-input" required placeholder="Nome do assessor" />
                </div>

                <div className="input-group">
                  <label>E-mail</label>
                  <input type="email" value={formData.email} onChange={(event) => setFormData({ ...formData, email: event.target.value })} className="custom-input" required placeholder="email@exemplo.com" />
                </div>

                <div className="input-group">
                  <label>CPF</label>
                  <input type="text" name="cpf" value={formData.cpf} onChange={handleMaskChange} className="custom-input" placeholder="000.000.000-00" />
                </div>

                <div className="input-group">
                  <label>Telefone</label>
                  <input type="text" name="telefone" value={formData.telefone} onChange={handleMaskChange} className="custom-input" placeholder="(00) 00000-0000" />
                </div>

                <div className="input-group">
                  <label>Cargo</label>
                  <input type="text" value={formData.cargo} onChange={(event) => setFormData({ ...formData, cargo: event.target.value })} className="custom-input" placeholder="Ex: Assessor" />
                </div>

                <div className="input-group">
                  <label>Tipo de usuário</label>
                  <select
                    value={formData.tipoUser}
                    onChange={(event) => setFormData((prev) => ({
                      ...prev,
                      tipoUser: event.target.value,
                      permissions: USER_ROLE_DEFAULTS[event.target.value] || prev.permissions
                    }))}
                    className="custom-input"
                  >
                    {USER_ROLE_OPTIONS.map((role) => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="funnel-modal-actions">
                <button type="button" className="btn-secondary team-modal-secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Salvando...' : (isEditing ? 'Salvar alterações' : 'Enviar convite')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAccessModal && (
        <div className="funnel-modal-backdrop dashboard-modal-backdrop" onClick={() => setShowAccessModal(false)}>
          <div className="funnel-modal team-modal team-access-modal" onClick={(event) => event.stopPropagation()}>
            <div className="funnel-modal-header">
              <div>
                <h3>Níveis de acesso</h3>
                <p>Defina o papel e os acessos principais deste membro da equipe.</p>
              </div>
              <button type="button" className="accountability-modal-close" onClick={() => setShowAccessModal(false)} aria-label="Fechar modal">
                <X size={18} />
              </button>
            </div>

            <div className="input-group team-modal-field">
              <label>Tipo de usuário</label>
              <select
                value={formData.tipoUser}
                onChange={(event) => setFormData((prev) => ({
                  ...prev,
                  tipoUser: event.target.value,
                  permissions: USER_ROLE_DEFAULTS[event.target.value] || prev.permissions
                }))}
                className="custom-input"
              >
                {USER_ROLE_OPTIONS.map((role) => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </div>

            <div className="users-permissions-grid team-permissions-grid">
              {Object.keys(formData.permissions || {}).map((permissionKey) => (
                <button
                  key={permissionKey}
                  type="button"
                  className={`users-permission-chip ${formData.permissions?.[permissionKey] ? 'active' : ''}`}
                  onClick={() => setFormData((prev) => ({
                    ...prev,
                    permissions: {
                      ...prev.permissions,
                      [permissionKey]: !prev.permissions?.[permissionKey]
                    }
                  }))}
                >
                  {permissionKey}
                </button>
              ))}
            </div>

            <div className="funnel-modal-actions">
              <button type="button" className="btn-secondary team-modal-secondary" onClick={() => setShowAccessModal(false)}>
                Cancelar
              </button>
              <button type="button" className="btn-primary" onClick={handleSaveAccess} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar acessos'}
              </button>
            </div>
          </div>
        </div>
      )}

      {emailFallback && (
        <div className="funnel-modal-backdrop dashboard-modal-backdrop" onClick={() => setEmailFallback(null)}>
          <div className="funnel-modal team-modal team-fallback-modal" onClick={(event) => event.stopPropagation()}>
            <div className="funnel-modal-header">
              <div>
                <h3>Envio manual necessário</h3>
                <p>O envio automático falhou. Abra seu aplicativo de e-mail para concluir o convite.</p>
              </div>
              <button type="button" className="accountability-modal-close" onClick={() => setEmailFallback(null)} aria-label="Fechar modal">
                <X size={18} />
              </button>
            </div>

            <div className="team-fallback-box">
              <p>Se preferir, você também pode copiar o e-mail e enviar o convite manualmente.</p>
              <a
                href={emailFallback}
                className="btn-primary team-fallback-link"
                onClick={() => setEmailFallback(null)}
              >
                Abrir e-mail
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
