import React from 'react';
import { HelpCircle } from 'lucide-react';

export default function ProfileHelp() {
  return (
    <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
        <HelpCircle size={48} style={{ marginBottom: '15px', opacity: 0.5 }} />
        <h3>Ajuda</h3>
        <p>Precisa de suporte? Entre em contato conosco.</p>
        <button className="btn-primary" style={{ marginTop: '20px', margin: '20px auto 0' }}>Falar com Suporte</button>
    </div>
  );
}
