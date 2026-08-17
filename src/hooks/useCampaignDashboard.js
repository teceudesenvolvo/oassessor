import { useEffect, useState } from 'react';
import {
  getAssessorsByAdminHybrid,
  getTasksByAdminHybrid,
  getUserProfileHybrid,
  getVotersByOwnersHybrid
} from '../services/campaignDataService';
import { inferUserRole } from '../utils/userRoles';

const DEFAULT_FILTERS = {
  campaign: 'all',
  neighborhood: 'all',
  region: 'all',
  team: 'all',
  assessor: 'all',
  period: '30d'
};

const STAGE_GROUPS = {
  confirmed: ['voto confirmado', 'confirmado'],
  probable: ['simpatizante', 'apoiador', 'voluntario', 'voluntário', 'multiplicador', 'lideranca', 'liderança'],
  supporters: ['apoiador', 'simpatizante', 'multiplicador', 'voto confirmado'],
  undecided: ['indeciso'],
  volunteers: ['voluntario', 'voluntário'],
  leaders: ['lideranca', 'liderança', 'coordenador', 'mobilizador']
};

const normalizeText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const normalizeUpper = (value) => String(value || '').trim().toUpperCase();

const startOfDay = (date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const parseDate = (value) => {
  if (!value) return null;
  if (typeof value !== 'string') return null;

  const isoDate = new Date(value);
  if (!Number.isNaN(isoDate.getTime())) return isoDate;

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [day, month, year] = value.split('/');
    const brDate = new Date(`${year}-${month}-${day}T00:00:00`);
    if (!Number.isNaN(brDate.getTime())) return brDate;
  }

  return null;
};

const formatDateKey = (date) => date.toISOString().split('T')[0];

const getPeriodStart = (period) => {
  if (period === 'all') return null;
  const today = startOfDay(new Date());
  const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
  const start = new Date(today);
  start.setDate(start.getDate() - (days - 1));
  return start;
};

const matchesStage = (voter, acceptedStages) => {
  const valuesToInspect = [
    voter.etapa,
    voter.statusEleitoral,
    voter.classificacao,
    voter.tipoApoio,
    voter.situacaoContato,
    voter.temperatura
  ].map(normalizeText);

  return valuesToInspect.some((value) => acceptedStages.includes(value));
};

const dedupeById = (items) => {
  const map = new Map();
  items.forEach((item) => {
    if (item?.id) map.set(item.id, item);
  });
  return [...map.values()];
};

const formatCompactDate = (date) =>
  date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

export function useCampaignDashboard(user) {
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [userType, setUserType] = useState(null);
  const [data, setData] = useState({
    voters: [],
    tasks: [],
    assessors: [],
    alerts: [],
    birthdays: []
  });

  useEffect(() => {
    if (!user) return;

    let active = true;

    const loadDashboard = async () => {
      try {
        setLoading(true);

        const profile = await getUserProfileHybrid(user.uid, user.email);
        const currentUserType = inferUserRole(profile, user.email ? 'assessor' : null);
        const adminId = profile?.adminId || user.uid;

        const effectiveAdminId = currentUserType === 'admin' ? user.uid : adminId;
        const assessorsRaw = await getAssessorsByAdminHybrid(effectiveAdminId);
        const assessors = assessorsRaw.map((value) => ({
          ...value,
          nome: value.nome || value.name || value.email || 'Assessor',
          equipeNome: normalizeUpper(value.equipe || value.cargo || 'Equipe principal'),
          ownerKey: value.userId || value.email || value.id
        }));

        const ownerIds = new Set([effectiveAdminId]);
        const ownerEmails = new Set([user.email].filter(Boolean));
        assessors.forEach((assessor) => {
          if (assessor.userId) ownerIds.add(assessor.userId);
          if (assessor.email) ownerEmails.add(assessor.email);
        });

        const rawVoters = await getVotersByOwnersHybrid([...ownerIds], [...ownerEmails]);
        const rawTasks = await getTasksByAdminHybrid(effectiveAdminId);
        const votersMap = new Map();

        rawVoters.forEach((value) => {
          const creatorKey = value.creatorId || value.creatorEmail || effectiveAdminId;
          const matchedAssessor = assessors.find((assessor) =>
            assessor.userId === value.creatorId || assessor.email === value.creatorEmail
          );

          votersMap.set(value.id, {
            id: value.id,
            ...value,
            campaign: normalizeUpper(value.campanha || value.campaign || 'Campanha principal'),
            neighborhood: normalizeUpper(value.bairro || 'Sem bairro'),
            region: normalizeUpper(value.regiao || value.cidade || value.zona || 'Sem região'),
            assessorKey: creatorKey,
            assessorName:
              creatorKey === effectiveAdminId
                ? 'Administrador'
                : matchedAssessor?.nome || value.creatorEmail || 'Assessor',
            teamName:
              matchedAssessor?.equipeNome ||
              normalizeUpper(value.equipe || matchedAssessor?.cargo || 'Equipe principal'),
            createdAtDate: parseDate(value.createdAt),
            updatedAtDate: parseDate(value.updatedAt),
            nextContactDate: parseDate(value.proximoContato || value.nextContactAt),
            stageLabel:
              value.etapa ||
              value.statusEleitoral ||
              value.classificacao ||
              value.tipoApoio ||
              'Sem classificação'
          });
        });

        const voters = [...votersMap.values()];
        const tasks = rawTasks.map((value) => ({
          id: value.id,
          ...value,
          taskDate: parseDate(value.fullDate || value.data),
          teamName: normalizeUpper(value.equipe || 'Equipe principal'),
          assessorKey: value.creatorId || effectiveAdminId,
          assessorName: value.creatorName || value.creatorEmail || 'Equipe',
          campaign: normalizeUpper(value.campanha || 'Campanha principal'),
          region: normalizeUpper(value.regiao || 'Sem região')
        }));

        const birthdays = voters
          .filter((voter) => {
            const birthDate = parseDate(voter.nascimento);
            if (!birthDate) return false;
            const today = new Date();
            return birthDate.getDate() === today.getDate() && birthDate.getMonth() === today.getMonth();
          })
          .slice(0, 5);

        const alerts = [];
        const overdueTasks = tasks.filter((task) => {
          const status = normalizeText(task.status || 'pending');
          return status === 'pending' && task.taskDate && task.taskDate < startOfDay(new Date());
        });
        const unclassifiedVoters = voters.filter((voter) => normalizeText(voter.stageLabel) === 'sem classificacao');
        const votersWithoutZone = voters.filter((voter) => !String(voter.zona || '').trim());

        if (overdueTasks.length) {
          alerts.push({
            type: 'critical',
            title: 'Tarefas atrasadas',
            description: `${overdueTasks.length} tarefa(s) passaram da data prevista e exigem ação imediata.`
          });
        }
        if (unclassifiedVoters.length) {
          alerts.push({
            type: 'attention',
            title: 'Base sem classificação eleitoral',
            description: `${unclassifiedVoters.length} eleitor(es) ainda não possuem etapa para o funil futuro.`
          });
        }
        if (votersWithoutZone.length) {
          alerts.push({
            type: 'info',
            title: 'Cadastro incompleto',
            description: `${votersWithoutZone.length} eleitor(es) estão sem zona eleitoral preenchida.`
          });
        }

        if (!active) return;

        setUserType(currentUserType || 'assessor');
        setData({ voters, tasks, assessors, alerts, birthdays });
      } catch (error) {
        console.error('Erro ao carregar Central da Campanha:', error);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadDashboard();

    return () => {
      active = false;
    };
  }, [user]);

  const filterOptions = {
    campaigns: [...new Set(data.voters.map((item) => item.campaign).concat(data.tasks.map((item) => item.campaign)).filter(Boolean))].sort(),
    neighborhoods: [...new Set(data.voters.map((item) => item.neighborhood).filter(Boolean))].sort(),
    regions: [...new Set(data.voters.map((item) => item.region).concat(data.tasks.map((item) => item.region)).filter(Boolean))].sort(),
    teams: [...new Set(data.assessors.map((item) => item.equipeNome).concat(data.voters.map((item) => item.teamName)).filter(Boolean))].sort(),
    assessors: dedupeById(data.assessors).map((assessor) => ({
      value: assessor.ownerKey,
      label: assessor.nome
    }))
  };

  const periodStart = getPeriodStart(filters.period);

  const filteredVoters = data.voters.filter((voter) => {
    if (filters.campaign !== 'all' && voter.campaign !== filters.campaign) return false;
    if (filters.neighborhood !== 'all' && voter.neighborhood !== filters.neighborhood) return false;
    if (filters.region !== 'all' && voter.region !== filters.region) return false;
    if (filters.team !== 'all' && voter.teamName !== filters.team) return false;
    if (filters.assessor !== 'all' && voter.assessorKey !== filters.assessor) return false;
    if (periodStart && voter.createdAtDate && voter.createdAtDate < periodStart) return false;
    return true;
  });

  const filteredTasks = data.tasks.filter((task) => {
    if (filters.campaign !== 'all' && task.campaign !== filters.campaign) return false;
    if (filters.region !== 'all' && task.region !== filters.region) return false;
    if (filters.team !== 'all' && task.teamName !== filters.team) return false;
    if (filters.assessor !== 'all' && task.assessorKey !== filters.assessor) return false;
    if (periodStart && task.taskDate && task.taskDate < periodStart) return false;
    return true;
  });

  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const chartSource = filteredVoters.reduce((acc, voter) => {
    if (!voter.createdAtDate) return acc;
    const key = formatDateKey(voter.createdAtDate);
    if (!acc[key]) acc[key] = { label: formatCompactDate(voter.createdAtDate), total: 0, support: 0 };
    acc[key].total += 1;
    if (matchesStage(voter, STAGE_GROUPS.supporters)) acc[key].support += 1;
    return acc;
  }, {});

  const chartData = Object.entries(chartSource)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([, value]) => value);

  const todayTasks = filteredTasks.filter((task) => task.taskDate && task.taskDate >= todayStart && task.taskDate < tomorrowStart);
  const pendingTasks = filteredTasks.filter((task) => normalizeText(task.status || 'pending') === 'pending');
  const upcomingEvents = filteredTasks
    .filter((task) => normalizeText(task.tipo) === 'event' && task.taskDate && task.taskDate >= todayStart)
    .sort((a, b) => a.taskDate - b.taskDate)
    .slice(0, 4);

  const metrics = {
    goal: {
      label: 'Meta eleitoral',
      value: filteredVoters.length ? `${Math.max(filteredVoters.length, 1000).toLocaleString('pt-BR')}` : 'Não definida',
      helper: filteredVoters.length ? 'Meta sugerida com base na base atual' : 'Configure metas na Fase 3'
    },
    confirmedVotes: filteredVoters.filter((voter) => matchesStage(voter, STAGE_GROUPS.confirmed)).length,
    probableVotes: filteredVoters.filter((voter) => matchesStage(voter, STAGE_GROUPS.probable)).length,
    supporters: filteredVoters.filter((voter) => matchesStage(voter, STAGE_GROUPS.supporters)).length,
    undecided: filteredVoters.filter((voter) => matchesStage(voter, STAGE_GROUPS.undecided)).length,
    volunteers: filteredVoters.filter((voter) => matchesStage(voter, STAGE_GROUPS.volunteers)).length,
    leaders: filteredVoters.filter((voter) => matchesStage(voter, STAGE_GROUPS.leaders)).length,
    voters: filteredVoters.length,
    newToday: filteredVoters.filter((voter) => voter.createdAtDate && voter.createdAtDate >= todayStart).length,
    supportToday: filteredVoters.filter(
      (voter) =>
        voter.updatedAtDate &&
        voter.updatedAtDate >= todayStart &&
        matchesStage(voter, STAGE_GROUPS.supporters)
    ).length,
    agendaToday: todayTasks.length,
    upcomingEvents: upcomingEvents.length,
    pendingTasks: pendingTasks.length,
    criticalDemands: pendingTasks.filter((task) => task.taskDate && task.taskDate < todayStart).length,
    alerts: data.alerts.length
  };

  const leaderboard = Object.values(
    filteredVoters.reduce((acc, voter) => {
      const key = voter.assessorName || 'Equipe';
      if (!acc[key]) acc[key] = { name: key, total: 0, confirmed: 0, neighborhood: voter.neighborhood };
      acc[key].total += 1;
      if (matchesStage(voter, STAGE_GROUPS.confirmed)) acc[key].confirmed += 1;
      return acc;
    }, {})
  )
    .sort((a, b) => b.confirmed - a.confirmed || b.total - a.total)
    .slice(0, 5);

  return {
    loading,
    userType,
    filters,
    setFilters,
    filterOptions,
    birthdays: data.birthdays,
    alerts: data.alerts,
    chartData,
    leaderboard,
    filteredTasks,
    metrics,
    upcomingEvents,
    todayTasks
  };
}
