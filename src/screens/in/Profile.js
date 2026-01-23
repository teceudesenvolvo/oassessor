import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Camera, Briefcase, FileText, CreditCard, Shield, HelpCircle, Key } from 'lucide-react';
import { ref, get, update } from 'firebase/database';
import { database } from '../../firebaseConfig';
import { useAuth } from '../../useAuth';

export default function Profile() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    cargo: '',
    cpf: ''
  });

  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        const userRef = ref(database, `users/${user.uid}`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          // Mapeia campos para garantir compatibilidade (name/nome, phone/telefone)
          setProfileData({ 
            ...data, 
            name: data.name || data.nome || '',
            email: user.email,
            phone: data.phone || data.telefone || '',
            cargo: data.cargo || '',
            cpf: data.cpf || ''
          }); 
        }
      };
      fetchProfile();
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const userRef = ref(database, `users/${user.uid}`);
      await update(userRef, {
        name: profileData.name,
        nome: profileData.name, // Mantém compatibilidade com diferentes partes do sistema
        phone: profileData.phone,
        telefone: profileData.phone, // Mantém compatibilidade
        cpf: profileData.cpf
      });
      alert('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error("Erro ao atualizar:", error);
      alert('Erro ao atualizar perfil.');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'personal':
        return (
          <form style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' }}>Nome Completo</label>
              <div className="input-container">
                <User size={18} className="field-icon-left" />
                <input 
                  type="text" 
                  value={profileData.name} 
                  onChange={(e) => setProfileData({...profileData, name: e.target.value})} 
                  className="custom-input" 
                  placeholder="Seu nome"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' }}>Cargo</label>
                <div className="input-container">
                  <Briefcase size={18} className="field-icon-left" />
                  <input type="text" value={profileData.cargo} readOnly className="custom-input" style={{ backgroundColor: '#f1f5f9', color: '#64748b' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' }}>CPF</label>
                <div className="input-container">
                  <FileText size={18} className="field-icon-left" />
                  <input 
                    type="text" 
                    value={profileData.cpf} 
                    onChange={(e) => setProfileData({...profileData, cpf: e.target.value})} 
                    className="custom-input" 
                    placeholder="000.000.000-00"
                  />
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' }}>E-mail</label>
              <div className="input-container">
                <Mail size={18} className="field-icon-left" />
                <input type="email" value={profileData.email} readOnly className="custom-input" style={{ backgroundColor: '#f1f5f9', color: '#64748b' }} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' }}>Telefone</label>
              <div className="input-container">
                <Phone size={18} className="field-icon-left" />
                <input 
                  type="tel" 
                  value={profileData.phone} 
                  onChange={(e) => setProfileData({...profileData, phone: e.target.value})} 
                  className="custom-input" 
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
            <button type="button" onClick={handleSave} disabled={loading} className="btn-primary" style={{ marginTop: '10px', width: '100%', justifyContent: 'center' }}>
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </form>
        );
      case 'payment':
        return (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                <CreditCard size={48} style={{ marginBottom: '15px', opacity: 0.5 }} />
                <h3>Dados de Pagamento</h3>
                <p>Gerencie seus cartões e métodos de pagamento aqui.</p>
                <p style={{ fontSize: '0.9rem', marginTop: '10px', fontStyle: 'italic' }}>Em breve.</p>
            </div>
        );
      case 'subscription':
        return (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                <Shield size={48} style={{ marginBottom: '15px', opacity: 0.5 }} />
                <h3>Minha Assinatura</h3>
                <p>Visualize detalhes do seu plano e faturas.</p>
                <p style={{ fontSize: '0.9rem', marginTop: '10px', fontStyle: 'italic' }}>Em breve.</p>
            </div>
        );
      case 'password':
        return (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                <Key size={48} style={{ marginBottom: '15px', opacity: 0.5 }} />
                <h3>Alterar Senha</h3>
                <p>Atualize sua senha de acesso.</p>
                <p style={{ fontSize: '0.9rem', marginTop: '10px', fontStyle: 'italic' }}>Em breve.</p>
            </div>
        );
      case 'help':
        return (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                <HelpCircle size={48} style={{ marginBottom: '15px', opacity: 0.5 }} />
                <h3>Ajuda</h3>
                <p>Precisa de suporte? Entre em contato conosco.</p>
                <button className="btn-primary" style={{ marginTop: '20px', margin: '20px auto 0' }}>Falar com Suporte</button>
            </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="dashboard-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <div style={{ 
          width: '100px', 
          height: '100px', 
          backgroundColor: '#e2e8f0', 
          borderRadius: '50%', 
          margin: '0 auto 15px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}>
          <User size={50} color="#94a3b8" />
          <button style={{ 
            position: 'absolute', 
            bottom: '0', 
            right: '0', 
            backgroundColor: '#2563eb', 
            border: 'none', 
            borderRadius: '50%', 
            padding: '8px',
            cursor: 'pointer',
            color: 'white',
            display: 'flex'
          }}>
            <Camera size={16} />
          </button>
        </div>
        <h3>{profileData.name || 'Usuário'}</h3>
        <p style={{ color: '#64748b' }}>{profileData.cargo || 'Perfil de Acesso'}</p>
      </div>

      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '30px', 
        overflowX: 'auto', 
        paddingBottom: '5px',
        borderBottom: '1px solid #e2e8f0'
      }}>
        {[
            { id: 'personal', label: 'Dados Pessoais' },
            { id: 'payment', label: 'Dados de Pagamento' },
            { id: 'subscription', label: 'Minha Assinatura' },
            { id: 'password', label: 'Alterar Senha' },
            { id: 'help', label: 'Ajuda' }
        ].map(tab => (
            <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                    padding: '10px 15px',
                    borderRadius: '8px 8px 0 0',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: activeTab === tab.id ? '#2563eb' : '#64748b',
                    fontWeight: activeTab === tab.id ? '600' : '400',
                    borderBottom: activeTab === tab.id ? '2px solid #2563eb' : '2px solid transparent',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s'
                }}
            >
                {tab.label}
            </button>
        ))}
      </div>

      {renderContent()}
    </div>
  );
}