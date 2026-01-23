import React from 'react';
import { Key } from 'lucide-react';

export default function ProfilePassword() {
  return (
    <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
        <Key size={48} style={{ marginBottom: '15px', opacity: 0.5 }} />
        <h3>Alterar Senha</h3>
        <p>Atualize sua senha de acesso.</p>
        <p style={{ fontSize: '0.9rem', marginTop: '10px', fontStyle: 'italic' }}>Em breve.</p>
    </div>
  );
}