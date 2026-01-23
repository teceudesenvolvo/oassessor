import React, { useState, useEffect } from 'react';
import { User, Camera } from 'lucide-react';
import { ref, get, update } from 'firebase/database';
import { database } from '../../firebaseConfig';
import { useAuth } from '../../useAuth';

import ProfilePersonal from '../../components/Profile/ProfilePersonal';
import ProfilePayment from '../../components/Profile/ProfilePayment';
import ProfileSubscription from '../../components/Profile/ProfileSubscription';
import ProfilePassword from '../../components/Profile/ProfilePassword';
import ProfileHelp from '../../components/Profile/ProfileHelp';

export default function Profile() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    cargo: '',
    cpf: '',
    cep: '',
    endereco: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: '',
    cards: []
  });

  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        const userRef = ref(database, `users/${user.uid}`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          
          let billing = {};
          if (data.dadosCobranca && data.dadosCobranca.length > 0) {
            billing = data.dadosCobranca[0];
          }

          // Mapeia campos para garantir compatibilidade (name/nome, phone/telefone)
          setProfileData({ 
            ...data, 
            name: data.name || data.nome || '',
            email: user.email,
            phone: data.phone || data.telefone || '',
            cargo: data.cargo || '',
            cpf: data.cpf || '',
            cep: billing.cep || data.cep || '',
            endereco: billing.endereco || data.endereco || '',
            numero: billing.numero || data.numero || '',
            bairro: billing.bairro || data.bairro || '',
            cidade: billing.cidade || data.cidade || '',
            estado: billing.estado || data.estado || '',
            cards: data.cards || []
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
      
      const billingInfo = {
        cep: profileData.cep,
        endereco: profileData.endereco,
        numero: profileData.numero,
        bairro: profileData.bairro,
        cidade: profileData.cidade,
        estado: profileData.estado
      };

      await update(userRef, {
        name: profileData.name,
        nome: profileData.name, // Mantém compatibilidade com diferentes partes do sistema
        phone: profileData.phone,
        telefone: profileData.phone, // Mantém compatibilidade
        cpf: profileData.cpf,
        dadosCobranca: [billingInfo]
      });
      alert('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error("Erro ao atualizar:", error);
      alert('Erro ao atualizar perfil.');
    } finally {
      setLoading(false);
    }
  };

  const handleMaskedInput = (e) => {
    const { name, value } = e.target;
    let val = value;

    if (name === 'cpf') {
      val = val.replace(/\D/g, '').slice(0, 11)
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2');
    } else if (name === 'phone') {
      val = val.replace(/\D/g, '').slice(0, 11);
      val = val.replace(/^(\d{2})(\d)/g, '($1) $2');
      val = val.replace(/(\d)(\d{4})$/, '$1-$2');
    } else if (name === 'cep') {
      val = val.replace(/\D/g, '').slice(0, 8);
      val = val.replace(/^(\d{5})(\d)/, '$1-$2');
    }

    setProfileData(prev => ({ ...prev, [name]: val }));
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'personal':
        return (
          <ProfilePersonal 
            profileData={profileData} 
            setProfileData={setProfileData} 
            handleSave={handleSave} 
            loading={loading} 
            handleMaskedInput={handleMaskedInput} 
          />
        );
      case 'payment':
        return (
          <ProfilePayment 
            user={user} 
            profileData={profileData} 
            setProfileData={setProfileData} 
            handleSave={handleSave} 
            loading={loading} 
            handleMaskedInput={handleMaskedInput} 
          />
        );
      case 'subscription':
        return <ProfileSubscription />;
      case 'password':
        return <ProfilePassword />;
      case 'help':
        return <ProfileHelp />;
      default:
        return null;
    }
  };

  return (
    <div className="dashboard-card" style={{ maxWidth: '800px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
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

      <div className="hide-scrollbar" style={{ 
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