import React, { useState, useEffect } from 'react';
import { User, Camera } from 'lucide-react';
import { ref, get, update, query, orderByChild, equalTo } from '../../services/firestoreDatabase';
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
        let userData = {};
        
        if (snapshot.exists()) {
          userData = snapshot.val();
          type = userData.tipoUser;
        }

        // Se não achou dados completos em 'users' (ex: nome vazio), tenta buscar em 'assessores' para complementar
        if (!userData.nome && !userData.name) {
            const assessoresRef = ref(database, 'users');
            const q = query(assessoresRef, orderByChild('userId'), equalTo(user.uid));
            const snapshotAssessor = await get(q);

            if (snapshotAssessor.exists()) {
                const assessorDataFull = snapshotAssessor.val();
                const firstKey = Object.keys(assessorDataFull)[0];
                const assessorData = assessorDataFull[firstKey];
                
                // Mescla os dados encontrados em assessores com o que já temos
                userData = { ...assessorData, ...userData };
                if (!type) type = assessorData.tipoUser || 'assessor';
            }
        }

        if (userData && Object.keys(userData).length > 0) {
          setUserType(type);
          
          let billing = {};
          if (userData.dadosCobranca && userData.dadosCobranca.length > 0) {
            billing = userData.dadosCobranca[0];
          }

          // Mapeia campos para garantir compatibilidade (name/nome, phone/telefone)
          setProfileData({ 
            ...userData, 
            name: userData.name || userData.nome || '',
            email: user.email,
            phone: userData.phone || userData.telefone || '',
            cargo: userData.cargo || '',
            cpf: userData.cpf || '',
            photoBase64: userData.photoBase64 || '',
            cep: billing.cep || userData.cep || '',
            endereco: billing.endereco || userData.endereco || '',
            numero: billing.numero || userData.numero || '',
            bairro: billing.bairro || userData.bairro || '',
            cidade: billing.cidade || userData.cidade || '',
            estado: billing.estado || userData.estado || '',
            cards: userData.cards || []
          }); 
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
        return <ProfileSubscription profileData={profileData} user={user} />;
      case 'password':
        return <ProfilePassword />;
      case 'help':
        return <ProfileHelp />;
      default:
        return null;
    }
  };

  return (
    <div className="profile-shell">
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      <div className="profile-header-card">
        <div className="profile-avatar-wrap">
          {profileData.photoBase64 ? (
            <img src={profileData.photoBase64} alt="Perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <User size={50} color="#94a3b8" />
          )}
          <label htmlFor="photo-upload" className="profile-avatar-action">
            <Camera size={16} />
          </label>
          <input id="photo-upload" type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
        </div>
        <div className="profile-header-copy">
          <span className="profile-badge">Meu perfil</span>
          <h3>{profileData.name || 'Usuário'}</h3>
          <p>{profileData.cargo || 'Perfil de Acesso'}</p>
        </div>
      </div>

      <div className="hide-scrollbar profile-tabs-row">
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
                className={`profile-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            >
                {tab.label}
            </button>
        ))}
      </div>

      <div className="profile-content-card">
        {renderContent()}
      </div>
    </div>
  );
}
