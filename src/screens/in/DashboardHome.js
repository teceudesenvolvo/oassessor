import React, { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { ref, query as rQuery, orderByChild, equalTo, get } from 'firebase/database';
import { database } from '../../firebaseConfig';
import { useAuth } from '../../useAuth';

export default function DashboardHome() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    voters: 0,
    team: 0,
    goals: 85 // Meta estática por enquanto
  });
  const [birthdays, setBirthdays] = useState([]);

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      try {
        // 1. Contar Eleitores (Realtime DB)
        const votersRef = ref(database, 'eleitores');
        const qVoters = rQuery(votersRef, orderByChild('creatorId'), equalTo(user.uid));
        const snapshotVoters = await get(qVoters);
        
        let votersCount = 0;
        let todaysBirthdays = [];

        if (snapshotVoters.exists()) {
          const data = snapshotVoters.val();
          votersCount = Object.keys(data).length;

          const today = new Date();
          const currentMonth = today.getMonth() + 1;
          const currentDay = today.getDate();

          Object.keys(data).forEach(key => {
            const voter = { id: key, ...data[key] };
            if (voter.nascimento) {
              const parts = voter.nascimento.split('-'); // Esperado YYYY-MM-DD
              if (parts.length === 3) {
                const month = parseInt(parts[1], 10);
                const day = parseInt(parts[2], 10);
                if (month === currentMonth && day === currentDay) {
                  todaysBirthdays.push(voter);
                }
              }
            }
          });
        }
        
        // 2. Contar Equipe (Realtime DB)
        // Assumindo que os membros da equipe têm um campo 'ownerId' apontando para o admin
        const teamRef = ref(database, 'assessores');
        const qTeam = rQuery(teamRef, orderByChild('adminId'), equalTo(user.uid));
        const snapshotTeam = await get(qTeam);
        const teamCount = snapshotTeam.exists() ? Object.keys(snapshotTeam.val()).length : 0;

        setStats(prev => ({
          ...prev,
          voters: votersCount,
          team: teamCount
        }));
        setBirthdays(todaysBirthdays);
      } catch (error) {
        console.error("Erro ao carregar estatísticas:", error);
      }
    };

    fetchStats();
  }, [user]);

  const handleWhatsApp = (phone, name) => {
    if (!phone) return alert("Telefone não cadastrado.");
    let cleanPhone = phone.replace(/\D/g, '');
    // Adiciona DDI 55 se não tiver (assumindo números BR)
    if (cleanPhone.length <= 11) {
      cleanPhone = '55' + cleanPhone;
    }
    const message = `Parabéns ${name}! Feliz aniversário! 🎉`;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <>
      <div className="dashboard-card welcome-card">
        <h3>Bem-vindo ao Painel!</h3>
        <p>Aqui está o resumo da sua campanha hoje.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h4>Total de Eleitores</h4>
          <div className="stat-value">{stats.voters}</div>
          <span className="stat-trend positive">Cadastrados</span>
        </div>
        <div className="stat-card">
          <h4>Equipe Ativa</h4>
          <div className="stat-value">{stats.team}</div>
          <span className="stat-trend">Assessores em campo</span>
        </div>
        <div className="stat-card">
          <h4>Metas da Campanha</h4>
          <div className="stat-value">{stats.goals}%</div>
          <span className="stat-trend positive">Concluídas</span>
        </div>
      </div>

      <div className="dashboard-card" style={{ marginTop: '20px' }}>
        <h3>🎉 Aniversariantes do Dia</h3>
        {birthdays.length === 0 ? (
          <p style={{ color: '#64748b', marginTop: '10px' }}>Nenhum aniversariante hoje.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
            {birthdays.map(voter => (
              <div key={voter.id} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '10px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}>
                <div>
                  <strong style={{ display: 'block', color: '#0f172a' }}>{voter.nome}</strong>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{voter.telefone || 'Sem telefone'}</span>
                </div>
                <button 
                  onClick={() => handleWhatsApp(voter.telefone, voter.nome)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    backgroundColor: '#25D366',
                    color: 'white',
                    border: 'none',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '0.9rem'
                  }}
                >
                  <MessageCircle size={18} />
                  Parabéns
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}