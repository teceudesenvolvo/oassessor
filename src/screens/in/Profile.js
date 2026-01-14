import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Camera } from 'lucide-react';
import { ref, get } from 'firebase/database';
import { database } from '../../firebaseConfig';
import { useAuth } from '../../useAuth';

export default function Profile() {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        const userRef = ref(database, `users/${user.uid}`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
          setProfileData({ ...snapshot.val(), email: user.email }); // Garante email do Auth
        }
      };
      fetchProfile();
    }
  }, [user]);

  return (
    <div className="dashboard-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
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
        <p style={{ color: '#64748b' }}>Perfil de Acesso</p>
      </div>

      <form style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' }}>Nome Completo</label>
          <div className="input-container">
            <User size={18} className="field-icon-left" />
            <input type="text" value={profileData.name} readOnly className="custom-input" />
          </div>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' }}>E-mail</label>
          <div className="input-container">
            <Mail size={18} className="field-icon-left" />
            <input type="email" value={profileData.email} readOnly className="custom-input" />
          </div>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' }}>Telefone</label>
          <div className="input-container">
            <Phone size={18} className="field-icon-left" />
            <input type="tel" value={profileData.phone || ''} readOnly className="custom-input" />
          </div>
        </div>
        <button type="button" className="btn-primary" style={{ marginTop: '10px', width: '100%', justifyContent: 'center' }}>Salvar Alterações</button>
      </form>
    </div>
  );
}