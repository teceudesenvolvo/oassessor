import React, { useState, useEffect } from 'react';
import { UserPlus, MoreVertical, X } from 'lucide-react';
import { ref, query, orderByChild, equalTo, onValue, push, set } from 'firebase/database';
import { database } from '../../firebaseConfig';
import { useAuth } from '../../useAuth';

// URL da Cloud Function para envio de e-mail (substitua pela URL real se disponível)
const CLOUD_FUNCTION_URL = 'https://us-central1-oassessor-blu.cloudfunctions.net/sendInviteEmail'; 

export default function Team() {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [emailFallback, setEmailFallback] = useState(null);
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

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.nome || !formData.email) {
      alert('Por favor, preencha os campos obrigatórios (Nome e E-mail).');
      return;
    }

    setSaving(true);

    try {
      const teamRef = ref(database, 'assessores');
      const newMemberRef = push(teamRef);
      const newId = newMemberRef.key;
      
      // Gera o link de convite
      const inviteLink = `${window.location.origin}/team-register?email=${encodeURIComponent(formData.email)}`;

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

      setShowModal(false);
      setFormData({ nome: '', email: '', cargo: '', cpf: '', telefone: '', tipoUser: 'assessor' });
    } catch (error) {
      console.error("Erro ao cadastrar:", error);
      alert("Erro ao cadastrar assessor.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3>Minha Equipe</h3>
        <button className="btn-primary" onClick={() => setShowModal(true)} style={{ padding: '8px 16px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              <td style={{ padding: '12px' }}>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <MoreVertical size={16} color="#64748b" />
                </button>
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
            
            <h3 style={{ marginBottom: '20px' }}>Novo Membro</h3>
            
            <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
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
                {saving ? 'Enviando...' : 'Enviar Convite'}
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