import React, { useState, useEffect } from 'react';
import { UserPlus, MoreVertical, X, Edit, Trash } from 'lucide-react';
import { ref, query, orderByChild, equalTo, onValue, push, set, update, remove } from 'firebase/database';
import { database } from '../../firebaseConfig';
import { useAuth } from '../../useAuth';

// URL da Cloud Function para envio de e-mail (substitua pela URL real se disponível)
const CLOUD_FUNCTION_URL = 'https://us-central1-oassessor-blu.cloudfunctions.net/sendInviteEmail'; 
const DELETE_USER_URL = 'https://us-central1-oassessor-blu.cloudfunctions.net/deleteUser';

export default function Team() {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [emailFallback, setEmailFallback] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    cargo: '',
    cpf: '',
    telefone: '',
    tipoUser: 'assessor'
  });

  useEffect(() => {
    if (!user) return;

    // Busca usuários onde adminId é igual ao ID do usuário logado
    const teamRef = ref(database, 'assessores');
    const q = query(teamRef, orderByChild('adminId'), equalTo(user.uid));

    const unsubscribe = onValue(q, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const teamList = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        setMembers(teamList);
      } else {
        setMembers([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleMaskChange = (e) => {
    const { name, value } = e.target;
    let val = value;

    if (name === 'cpf') {
      val = val.replace(/\D/g, '').slice(0, 11)
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2');
    } else if (name === 'telefone') {
      val = val.replace(/\D/g, '').slice(0, 11);
      val = val.replace(/^(\d{2})(\d)/g, '($1) $2');
      val = val.replace(/(\d)(\d{4})$/, '$1-$2');
    }
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const sendInviteEmail = async (name, emailAddress, link) => {
    try {
      // Tenta enviar via Cloud Function (simulado aqui, pois depende do backend configurado)
      // Se não houver URL configurada, forçamos o erro para cair no fallback
      if (CLOUD_FUNCTION_URL === 'https://us-central1-seu-projeto.cloudfunctions.net/sendInviteEmail') {
         throw new Error("Cloud Function URL não configurada.");
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
      
      // Fallback: Exibe modal para envio manual para evitar bloqueio do navegador
      const subject = "Convite para O Assessor";
      const inviteLink = `oassessor.vercel.app/cadastro?email=${encodeURIComponent(emailAddress)}`;
      const body = `Olá ${name},\n\nVocê foi convidado para fazer parte da equipe no aplicativo O Assessor.\n\nPara concluir seu cadastro, clique no link abaixo:\n\n${inviteLink}\n\nAtenciosamente,\nEquipe O Assessor`;
      const mailto = `mailto:${emailAddress}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      setEmailFallback(mailto);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.nome || !formData.email) {
      alert('Por favor, preencha os campos obrigatórios (Nome e E-mail).');
      return;
    }

    setSaving(true);

    try {
      if (isEditing && selectedMemberId) {
        // Atualizar membro existente
        await update(ref(database, `assessores/${selectedMemberId}`), formData);
        await update(ref(database, `users/${selectedMemberId}`), formData);
        alert('Membro atualizado com sucesso!');
      } else {
        // Criar novo membro
        const teamRef = ref(database, 'assessores');
        const newMemberRef = push(teamRef);
        const newId = newMemberRef.key;
        
        // Gera o link de convite
        const inviteLink = `https://oassessor.vercel.app/cadastro?email=${encodeURIComponent(formData.email)}`;

        const assessorData = {
          ...formData,
          adminId: user.uid,
          creatorId: user.uid,
          status: 'invited',
          createdAt: new Date().toISOString(),
          inviteLink: inviteLink
        };

        // 1. Salvar na coleção 'assessores'
        await set(newMemberRef, assessorData);

        // 2. Salvar na coleção 'users' (espelhando a lógica do App React Native)
        // Isso cria o registro do usuário antecipadamente
        const userRef = ref(database, `users/${newId}`);
        await set(userRef, assessorData);

        // 3. Enviar E-mail (Automático ou Fallback)
        await sendInviteEmail(formData.nome, formData.email, inviteLink);
      }

      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar dados.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, email) => {
    if (window.confirm('Tem certeza que deseja excluir este membro?')) {
      // 1. Tenta excluir do Authentication via Cloud Function (se tiver email)
      if (email) {
        try {
          const response = await fetch(DELETE_USER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          });

          if (!response.ok) {
            const errText = await response.text();
            console.warn(`Aviso: Falha ao excluir do Auth (${response.status}):`, errText);
          }
        } catch (authError) {
          console.warn("Erro ao chamar Cloud Function de exclusão (ignorando para remover do banco):", authError);
        }
      }

      try {
        // 2. Remove do Realtime Database
        await remove(ref(database, `assessores/${id}`));
        await remove(ref(database, `users/${id}`));
        setMenuOpen(null);
      } catch (error) {
        console.error("Erro ao excluir:", error);
        alert("Erro ao excluir membro.");
      }
    }
  };

  const handleEdit = (member) => {
    setFormData({
      nome: member.nome || '',
      email: member.email || '',
      cargo: member.cargo || '',
      cpf: member.cpf || '',
      telefone: member.telefone || '',
      tipoUser: member.tipoUser || 'assessor'
    });
    setSelectedMemberId(member.id);
    setIsEditing(true);
    setShowModal(true);
    setMenuOpen(null);
  };

  const handleNewMember = () => {
    resetForm();
    setIsEditing(false);
    setSelectedMemberId(null);
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({ nome: '', email: '', cargo: '', cpf: '', telefone: '', tipoUser: 'assessor' });
  };

  return (
    <div className="dashboard-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3>Minha Equipe</h3>
        <button className="btn-primary" onClick={handleNewMember} style={{ padding: '8px 16px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserPlus size={16} />
          Novo Membro
        </button>
      </div>
      
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #eee', textAlign: 'left', color: '#64748b' }}>
            <th style={{ padding: '12px' }}>Nome</th>
            <th style={{ padding: '12px' }}>Função</th>
            <th style={{ padding: '12px' }}>Status</th>
            <th style={{ padding: '12px' }}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {loading && <tr><td colSpan="4" style={{padding: '20px', textAlign: 'center'}}>Carregando equipe...</td></tr>}
          {!loading && members.length === 0 && (
             <tr><td colSpan="4" style={{padding: '20px', textAlign: 'center', color: '#64748b'}}>Nenhum membro encontrado.</td></tr>
          )}
          {members.map(member => (
            <tr key={member.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
              <td style={{ padding: '12px', fontWeight: '500' }}>{member.nome || member.email}</td>
              <td style={{ padding: '12px', color: '#64748b' }}>{member.cargo || 'Assessor'}</td>
              <td style={{ padding: '12px' }}>
                <span style={{ 
                  padding: '4px 10px', 
                  borderRadius: '12px', 
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  backgroundColor: member.status === 'invited' ? '#fef3c7' : '#dcfce7',
                  color: member.status === 'invited' ? '#d97706' : '#166534'
                }}>
                  {member.status === 'invited' ? 'Convidado' : 'Ativo'}
                </span>
              </td>
              <td style={{ padding: '12px', position: 'relative' }}>
                <button 
                  onClick={() => setMenuOpen(menuOpen === member.id ? null : member.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <MoreVertical size={16} color="#64748b" />
                </button>
                
                {menuOpen === member.id && (
                  <div style={{
                    position: 'absolute',
                    right: '0',
                    top: '40px',
                    backgroundColor: 'white',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    borderRadius: '8px',
                    zIndex: 10,
                    minWidth: '120px',
                    overflow: 'hidden',
                    border: '1px solid #f1f5f9'
                  }}>
                    <button 
                      onClick={() => handleEdit(member)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '10px 15px',
                        border: 'none',
                        background: 'white',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: '0.9rem',
                        color: '#475569',
                        borderBottom: '1px solid #f1f5f9'
                      }}
                    >
                      <Edit size={14} /> Editar
                    </button>
                    <button 
                      onClick={() => handleDelete(member.id, member.email)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '10px 15px',
                        border: 'none',
                        background: 'white',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: '0.9rem',
                        color: '#ef4444'
                      }}
                    >
                      <Trash size={14} /> Excluir
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal de Convite */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{
            backgroundColor: 'white', padding: '25px', borderRadius: '12px',
            width: '90%', maxWidth: '400px', position: 'relative'
          }}>
            <button 
              onClick={() => setShowModal(false)}
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <X size={20} color="#64748b" />
            </button>
            
            <h3 style={{ marginBottom: '20px' }}>{isEditing ? 'Editar Membro' : 'Novo Membro'}</h3>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div className="input-group">
                <label>Nome</label>
                <input type="text" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} className="custom-input" required placeholder="Nome do assessor" />
              </div>
              
              <div className="input-group">
                <label>E-mail</label>
                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="custom-input" required placeholder="email@exemplo.com" />
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
                <input type="text" value={formData.cargo} onChange={e => setFormData({...formData, cargo: e.target.value})} className="custom-input" placeholder="Ex: Assessor" />
              </div>

              <button type="submit" className="btn-primary" disabled={saving} style={{ marginTop: '10px', justifyContent: 'center' }}>
                {saving ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Enviar Convite')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Fallback de Email */}
      {emailFallback && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1100,
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{
            backgroundColor: 'white', padding: '25px', borderRadius: '12px',
            width: '90%', maxWidth: '400px', position: 'relative', textAlign: 'center'
          }}>
            <button 
              onClick={() => setEmailFallback(null)}
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <X size={20} color="#64748b" />
            </button>
            
            <h3 style={{ marginBottom: '15px', color: '#f59e0b' }}>Envio Manual Necessário</h3>
            <p style={{ marginBottom: '20px', color: '#64748b', fontSize: '0.9rem' }}>
              O envio automático falhou. Clique abaixo para abrir seu aplicativo de e-mail e enviar o convite.
            </p>
            
            <a 
              href={emailFallback}
              className="btn-primary"
              style={{ display: 'flex', justifyContent: 'center', textDecoration: 'none', alignItems: 'center' }}
              onClick={() => setEmailFallback(null)}
            >
              Abrir E-mail
            </a>
          </div>
        </div>
      )}
    </div>
  );
}