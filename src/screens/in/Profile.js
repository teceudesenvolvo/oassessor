import React, { useState, useEffect } from 'react';
import { User, Camera } from 'lucide-react';
import { ref, get, update, query, orderByChild, equalTo } from 'firebase/database';
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
  const [userType, setUserType] = useState(null);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    cargo: '',
    cpf: '',
    photoBase64: '',
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
        let type = null;
        
        // Tenta buscar direto pelo UID em 'users'
        const userRef = ref(database, `users/${user.uid}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
          const data = snapshot.val();
          type = data.tipoUser;
          setUserType(type);
          
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
            photoBase64: data.photoBase64 || '',
            cep: billing.cep || data.cep || '',
            endereco: billing.endereco || data.endereco || '',
            numero: billing.numero || data.numero || '',
            bairro: billing.bairro || data.bairro || '',
            cidade: billing.cidade || data.cidade || '',
            estado: billing.estado || data.estado || '',
            cards: data.cards || []
          }); 
        } else {
            // Fallback: Se não achar em 'users' pelo UID direto, tenta buscar em 'assessores'
            // Isso é útil se o assessor não tiver sido copiado corretamente para 'users'
            const assessoresRef = ref(database, 'users');
            const q = query(assessoresRef, orderByChild('userId'), equalTo(user.uid));
            const snapshotAssessor = await get(q);

            if (snapshotAssessor.exists()) {
                const data = snapshotAssessor.val();
                const firstKey = Object.keys(data)[0];
                const assessorData = data[firstKey] || {};
                setUserType(assessorData.tipoUser || 'assessor');
                setProfileData({
                  ...assessorData,
                  name: assessorData.name || assessorData.nome || '',
                  email: user.email,
                  phone: assessorData.phone || assessorData.telefone || '',
                  cargo: assessorData.cargo || '',
                  cpf: assessorData.cpf || '',
                  photoBase64: assessorData.photoBase64 || '',
                  // Assessores não tem dados de cobrança, então inicializa vazio
                  cep: '',
                  endereco: '',
                  numero: '',
                  bairro: '',
                  cidade: '',
                  estado: '',
                  cards: []
                });
            }
        }
      };
      fetchProfile();
    }
  }, [user]);

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result;
        setProfileData(prev => ({ ...prev, photoBase64: base64 }));
        
        if (user) {
            try {
                const userRef = ref(database, `users/${user.uid}`);
                await update(userRef, { photoBase64: base64 });
            } catch (error) {
                console.error("Erro ao salvar imagem:", error);
                alert("Erro ao salvar imagem.");
            }
        }
      };
      reader.readAsDataURL(file);
    }
  };

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
        photoBase64: profileData.photoBase64,
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
        return <ProfileSubscription profileData={profileData} />;
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
          position: 'relative',
          overflow: 'hidden',
          border: '2px solid #fff',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          {profileData.photoBase64 ? (
            <img src={profileData.photoBase64} alt="Perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <User size={50} color="#94a3b8" />
          )}
          <label htmlFor="photo-upload" style={{ 
            position: 'absolute', 
            bottom: '0', 
            right: '0', 
            backgroundColor: '#2563eb', 
            border: 'none', 
            borderRadius: '50%', 
            padding: '8px',
            cursor: 'pointer',
            color: 'white',
            display: 'flex',
            zIndex: 10
          }}>
            <Camera size={16} />
          </label>
          <input id="photo-upload" type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
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
        {([
            { id: 'personal', label: 'Dados Pessoais' },
            { id: 'payment', label: 'Dados de Pagamento' },
            { id: 'subscription', label: 'Minha Assinatura' },
            { id: 'password', label: 'Alterar Senha' },
            { id: 'help', label: 'Ajuda' }
        ].filter(tab => {
            if (userType === 'assessor' && (tab.id === 'payment' || tab.id === 'subscription')) return false;
            return true;
        }))
        .map(tab => (
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