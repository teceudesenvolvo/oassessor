import React from 'react';
import { Shield } from 'lucide-react';

export default function ProfileSubscription() {
  return (
    <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
        <Shield size={48} style={{ marginBottom: '15px', opacity: 0.5 }} />
        <h3>Minha Assinatura</h3>
        <p>Visualize detalhes do seu plano e faturas.</p>
        <p style={{ fontSize: '0.9rem', marginTop: '10px', fontStyle: 'italic' }}>Em breve.</p>
    </div>
  );
}