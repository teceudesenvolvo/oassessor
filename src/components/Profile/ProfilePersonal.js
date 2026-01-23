import React from 'react';
import { User, Mail, Phone, Briefcase, FileText } from 'lucide-react';

export default function ProfilePersonal({ profileData, setProfileData, handleSave, loading, handleMaskedInput }) {
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

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
        <div style={{ flex: '1 1 250px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' }}>Cargo</label>
          <div className="input-container">
            <Briefcase size={18} className="field-icon-left" />
            <input type="text" value={profileData.cargo} readOnly className="custom-input" style={{ backgroundColor: '#f1f5f9', color: '#64748b' }} />
          </div>
        </div>
        <div style={{ flex: '1 1 250px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' }}>CPF</label>
          <div className="input-container">
            <FileText size={18} className="field-icon-left" />
            <input 
              type="text" 
              name="cpf"
              value={profileData.cpf} 
              onChange={handleMaskedInput} 
              className="custom-input" 
              placeholder="000.000.000-00"
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
        <div style={{ flex: '1 1 250px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' }}>E-mail</label>
          <div className="input-container">
            <Mail size={18} className="field-icon-left" />
            <input type="email" value={profileData.email} readOnly className="custom-input" style={{ backgroundColor: '#f1f5f9', color: '#64748b' }} />
          </div>
        </div>
        <div style={{ flex: '1 1 250px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' }}>Telefone</label>
          <div className="input-container">
            <Phone size={18} className="field-icon-left" />
            <input 
              type="tel" 
              name="phone"
              value={profileData.phone} 
              onChange={handleMaskedInput} 
              className="custom-input" 
              placeholder="(00) 00000-0000"
            />
          </div>
        </div>
      </div>
      <button type="button" onClick={handleSave} disabled={loading} className="btn-primary" style={{ marginTop: '10px', width: '100%', justifyContent: 'center' }}>
        {loading ? 'Salvando...' : 'Salvar Alterações'}
      </button>
    </form>
  );
}