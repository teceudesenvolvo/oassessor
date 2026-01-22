import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      try {
        // 1. Contar Eleitores (Realtime DB)
        const votersRef = ref(database, 'eleitores');
        const qVoters = rQuery(votersRef, orderByChild('creatorId'), equalTo(user.uid));
        const snapshotVoters = await get(qVoters);
        const votersCount = snapshotVoters.exists() ? Object.keys(snapshotVoters.val()).length : 0;
        
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
      } catch (error) {
        console.error("Erro ao carregar estatísticas:", error);
      }
    };

    fetchStats();
  }, [user]);

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
    </>
  );
}