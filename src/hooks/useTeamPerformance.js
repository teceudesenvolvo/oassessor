import { useEffect, useMemo, useState } from 'react';
import { equalTo, get, onValue, orderByChild, query, ref } from '../services/firestoreDatabase';
import { database } from '../firebaseConfig';

const CONFIRMED_STAGES = ['voto confirmado', 'confirmado'];
const SUPPORT_STAGES = ['simpatizante', 'apoiador', 'voluntario', 'voluntário', 'multiplicador', 'lideranca', 'liderança', 'voto confirmado'];

const normalizeText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const matchesStage = (voter, stages) => {
  const values = [
    voter.funnelStage,
    voter.etapa,
    voter.statusEleitoral,
    voter.classificacao,
    voter.tipoApoio
  ].map(normalizeText);

  return values.some((value) => stages.includes(value));
};

export function useTeamPerformance(user) {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [voters, setVoters] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [metaPrincipal, setMetaPrincipal] = useState(0);

  useEffect(() => {
    if (!user) return;

    let active = true;
    const unsubscribes = [];

    const load = async () => {
      try {
        setLoading(true);

        const teamRef = ref(database, 'assessores');
        const teamQuery = query(teamRef, orderByChild('adminId'), equalTo(user.uid));
        const unsubscribeTeam = onValue(teamQuery, (snapshot) => {
          if (!active) return;
          const data = snapshot.val() || {};
          const teamList = Object.entries(data).map(([id, value]) => ({
            id,
            ...value,
            nome: value.nome || value.name || value.email || 'Assessor',
            ownerKeys: [value.userId, value.email, id].filter(Boolean)
          }));
          setMembers(teamList);
        });
        unsubscribes.push(unsubscribeTeam);

        const metaSnapshot = await get(query(ref(database, 'metasEleitorais'), orderByChild('adminId'), equalTo(user.uid)));
        if (metaSnapshot.exists()) {
          const firstMeta = Object.values(metaSnapshot.val())[0];
          if (active) setMetaPrincipal(Number(firstMeta.metaPrincipal || 0));
        }

        const tasksQuery = query(ref(database, 'tarefas'), orderByChild('adminId'), equalTo(user.uid));
        const unsubscribeTasks = onValue(tasksQuery, (snapshot) => {
          if (!active) return;
          const data = snapshot.val() || {};
          const list = Object.entries(data).map(([id, value]) => ({
            id,
            ...value,
            tipo: value.tipo || 'general'
          }));
          setTasks(list);
        });
        unsubscribes.push(unsubscribeTasks);

        const votersRef = ref(database, 'eleitores');
        const votersMap = new Map();

        const syncVoters = () => {
          if (!active) return;
          setVoters([...votersMap.values()]);
          setLoading(false);
        };

        const ownerIds = new Set([user.uid]);
        const ownerEmails = new Set([user.email].filter(Boolean));

        const teamSnapshot = await get(teamQuery);
        if (teamSnapshot.exists()) {
          Object.values(teamSnapshot.val()).forEach((member) => {
            if (member.userId) ownerIds.add(member.userId);
            if (member.email) ownerEmails.add(member.email);
          });
        }

        ownerIds.forEach((ownerId) => {
          const voterQuery = query(votersRef, orderByChild('creatorId'), equalTo(ownerId));
          const unsubscribe = onValue(voterQuery, (snapshot) => {
            [...votersMap.keys()].forEach((key) => {
              if (votersMap.get(key)?.creatorId === ownerId) votersMap.delete(key);
            });
            if (snapshot.exists()) {
              Object.entries(snapshot.val()).forEach(([id, value]) => votersMap.set(id, { id, ...value }));
            }
            syncVoters();
          });
          unsubscribes.push(unsubscribe);
        });

        ownerEmails.forEach((email) => {
          const voterQuery = query(votersRef, orderByChild('creatorEmail'), equalTo(email));
          const unsubscribe = onValue(voterQuery, (snapshot) => {
            [...votersMap.keys()].forEach((key) => {
              if (votersMap.get(key)?.creatorEmail === email) votersMap.delete(key);
            });
            if (snapshot.exists()) {
              Object.entries(snapshot.val()).forEach(([id, value]) => votersMap.set(id, { id, ...value }));
            }
            syncVoters();
          });
          unsubscribes.push(unsubscribe);
        });
      } catch (error) {
        console.error('Erro ao carregar performance da equipe:', error);
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [user]);

  const memberStats = useMemo(() => {
    const rows = members.map((member) => {
      const keys = new Set([member.userId, member.email, member.id].filter(Boolean));
      const memberVoters = voters.filter((voter) => keys.has(voter.creatorId) || keys.has(voter.creatorEmail));
      const memberTasks = tasks.filter((task) => keys.has(task.creatorId) || keys.has(task.creatorEmail));
      const visits = memberTasks.filter((task) => task.tipo === 'visit').length;
      const pendingTasks = memberTasks.filter((task) => (task.status || 'pending') === 'pending').length;
      const supportCount = memberVoters.filter((voter) => matchesStage(voter, SUPPORT_STAGES)).length;
      const confirmedVotes = memberVoters.filter((voter) => matchesStage(voter, CONFIRMED_STAGES)).length;
      const conversion = memberVoters.length ? (confirmedVotes / memberVoters.length) * 100 : 0;
      const targetShare = members.length ? metaPrincipal / Math.max(1, members.length) : 0;
      const progressToGoal = targetShare ? (confirmedVotes / targetShare) * 100 : 0;

      return {
        ...member,
        totalVoters: memberVoters.length,
        pendingTasks,
        visits,
        supportCount,
        confirmedVotes,
        conversion,
        targetShare,
        progressToGoal
      };
    });

    return rows.sort((a, b) => b.confirmedVotes - a.confirmedVotes || b.supportCount - a.supportCount);
  }, [members, voters, tasks, metaPrincipal]);

  const summary = useMemo(() => {
    const totalPendingTasks = memberStats.reduce((sum, item) => sum + item.pendingTasks, 0);
    const totalVisits = memberStats.reduce((sum, item) => sum + item.visits, 0);
    const totalSupport = memberStats.reduce((sum, item) => sum + item.supportCount, 0);
    const totalConfirmed = memberStats.reduce((sum, item) => sum + item.confirmedVotes, 0);
    const avgConversion = memberStats.length
      ? memberStats.reduce((sum, item) => sum + item.conversion, 0) / memberStats.length
      : 0;

    return {
      totalPendingTasks,
      totalVisits,
      totalSupport,
      totalConfirmed,
      avgConversion
    };
  }, [memberStats]);

  return {
    loading,
    memberStats,
    summary,
    metaPrincipal
  };
}
