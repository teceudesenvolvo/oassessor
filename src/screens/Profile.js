import React from 'react';
import { User, Mail, Phone, Camera } from 'lucide-react';

export default function Profile() {
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
        <h3>Candidato Modelo</h3>
        <p style={{ color: '#64748b' }}>Partido Exemplo - 99</p>
      </div>

      <form style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' }}>Nome Completo</label>
          <div className="input-container">
            <User size={18} className="field-icon-left" />
            <input type="text" defaultValue="Candidato Modelo" className="custom-input" />
          </div>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' }}>E-mail</label>
          <div className="input-container">
            <Mail size={18} className="field-icon-left" />
            <input type="email" defaultValue="candidato@exemplo.com" className="custom-input" />
          </div>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' }}>Telefone</label>
          <div className="input-container">
            <Phone size={18} className="field-icon-left" />
            <input type="tel" defaultValue="(11) 99999-9999" className="custom-input" />
          </div>
        </div>
        <button type="button" className="btn-primary" style={{ marginTop: '10px', width: '100%', justifyContent: 'center' }}>Salvar Alterações</button>
      </form>
    </div>
  );
}