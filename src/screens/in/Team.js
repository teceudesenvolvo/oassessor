import React, { useState, useEffect } from 'react';
import { UserPlus, MoreVertical } from 'lucide-react';
import { ref, query, orderByChild, equalTo, onValue } from 'firebase/database';
import { database } from '../../firebaseConfig';
import { useAuth } from '../../useAuth';

export default function Team() {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Busca usuários onde ownerId é igual ao ID do usuário logado
    const teamRef = ref(database, 'assessores');
    const q = query(teamRef, orderByChild('ownerId'), equalTo(user.uid));

    const unsubscribe = onValue(q, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const teamList = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        setMembers(teamList);
      } else {
        setMembers([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

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
          {loading && <tr><td colSpan="4" style={{padding: '20px', textAlign: 'center'}}>Carregando equipe...</td></tr>}
          {!loading && members.length === 0 && (
             <tr><td colSpan="4" style={{padding: '20px', textAlign: 'center', color: '#64748b'}}>Nenhum membro encontrado.</td></tr>
          )}
          {members.map(member => (
            <tr key={member.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
              <td style={{ padding: '12px', fontWeight: '500' }}>{member.name || member.email}</td>
              <td style={{ padding: '12px', color: '#64748b' }}>{member.role || 'Assessor'}</td>
              <td style={{ padding: '12px' }}>
                <span style={{ 
                  padding: '4px 10px', 
                  borderRadius: '12px', 
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  backgroundColor: '#dcfce7',
                  color: '#166534'
                }}>
                  Ativo
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