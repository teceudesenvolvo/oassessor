import React from 'react';
import { UserPlus, MoreVertical } from 'lucide-react';

export default function Team() {
  const members = [
    { id: 1, name: 'Ana Silva', role: 'Coordenadora', status: 'Ativo' },
    { id: 2, name: 'Carlos Souza', role: 'Assessor de Campo', status: 'Em Campo' },
    { id: 3, name: 'Mariana Lima', role: 'Marketing', status: 'Ativo' },
  ];

  return (
    <div className="dashboard-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3>Minha Equipe</h3>
        <button className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserPlus size={16} />
          Novo Membro
        </button>
      </div>
      
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #eee', textAlign: 'left', color: '#64748b' }}>
            <th style={{ padding: '12px' }}>Nome</th>
            <th style={{ padding: '12px' }}>Função</th>
            <th style={{ padding: '12px' }}>Status</th>
            <th style={{ padding: '12px' }}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {members.map(member => (
            <tr key={member.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
              <td style={{ padding: '12px', fontWeight: '500' }}>{member.name}</td>
              <td style={{ padding: '12px', color: '#64748b' }}>{member.role}</td>
              <td style={{ padding: '12px' }}>
                <span style={{ 
                  padding: '4px 10px', 
                  borderRadius: '12px', 
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  backgroundColor: member.status === 'Ativo' ? '#dcfce7' : '#e0f2fe',
                  color: member.status === 'Ativo' ? '#166534' : '#075985'
                }}>
                  {member.status}
                </span>
              </td>
              <td style={{ padding: '12px' }}>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <MoreVertical size={16} color="#64748b" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}