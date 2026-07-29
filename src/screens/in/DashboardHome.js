import React from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  MessageCircle,
  ShieldAlert,
  Target,
  TrendingUp,
  Users2,
  Vote
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../../useAuth';
import { useCampaignDashboard } from '../../hooks/useCampaignDashboard';
import CampaignFilters from '../../components/dashboard/CampaignFilters';
import MetricCard from '../../components/dashboard/MetricCard';
import InsightPanel from '../../components/dashboard/InsightPanel';

export default function DashboardHome() {
  const { user } = useAuth();
  const {
    loading,
    userType,
    filters,
    setFilters,
    filterOptions,
    birthdays,
    alerts,
    chartData,
    leaderboard,
    metrics,
    upcomingEvents,
    todayTasks
  } = useCampaignDashboard(user);

  const handleWhatsApp = (phone, name) => {
    if (!phone) return alert('Telefone não cadastrado.');
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length <= 11) {
      cleanPhone = `55${cleanPhone}`;
    }
    const message = `Parabéns ${name}! Feliz aniversário! 🎉`;

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const url = isMobile
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`
      : `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;

    window.open(url, '_blank');
  };

  const conversionRate = metrics.voters
    ? `${Math.round((metrics.confirmedVotes / metrics.voters) * 100)}%`
    : '0%';

  const executionRate = metrics.agendaToday
    ? `${Math.max(0, Math.round(((metrics.agendaToday - metrics.pendingTasks) / metrics.agendaToday) * 100))}%`
    : 'Sem agenda';

  const strategicSignals = [
    {
      title: 'Conversão atual',
      value: conversionRate,
      helper: `${metrics.confirmedVotes} voto(s) confirmados em ${metrics.voters} cadastro(s).`,
      icon: TrendingUp
    },
    {
      title: 'Execução do dia',
      value: executionRate,
      helper: metrics.agendaToday
        ? `${metrics.pendingTasks} item(ns) ainda pedem ação hoje.`
        : 'Nenhum compromisso programado para hoje.',
      icon: CalendarClock
    },
    {
      title: 'Pontos de atenção',
      value: `${metrics.alerts}`,
      helper: metrics.alerts
        ? 'Alertas operacionais ativos no recorte atual.'
        : 'Sem bloqueios críticos neste momento.',
      icon: ShieldAlert
    }
  ];

  const executiveHighlights = [
    { label: 'Base monitorada', value: metrics.voters, tone: 'default' },
    { label: 'Apoio em construção', value: metrics.probableVotes, tone: 'highlight' },
    { label: 'Risco de dispersão', value: metrics.undecided, tone: 'warning' },
    { label: 'Mobilização pronta', value: metrics.volunteers, tone: 'success' }
  ];

  return (
    <div className="campaign-dashboard">
      <CampaignFilters filters={filters} setFilters={setFilters} options={filterOptions} />

      <section className="campaign-hero campaign-hero-executive">
        <div className="campaign-hero-copy executive-copy">
          <div className="campaign-hero-topline">
            <p className="campaign-kicker">
              <Target size={16} />
              Central estratégica da campanha
            </p>
            <span className="campaign-hero-status">
              <CheckCircle2 size={14} />
              Operação sincronizada
            </span>
          </div>

          <h2>Dashboard executivo para decidir rápido, priorizar melhor e mover a campanha com confiança.</h2>
          <span>
            Consolidamos captação, conversão, tarefas e sinais de risco em uma leitura premium, com foco em clareza no desktop e fluidez no mobile.
          </span>

          <div className="campaign-executive-strip">
            {executiveHighlights.map((item) => (
              <article key={item.label} className={`campaign-executive-pill ${item.tone}`}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </article>
            ))}
          </div>
        </div>

        <div className="campaign-goal-card campaign-goal-executive">
          <div className="campaign-goal-header">
            <span>Meta eleitoral</span>
            <Vote size={18} />
          </div>
          <strong>{metrics.goal.value}</strong>
          <p>{metrics.goal.helper}</p>
          <div className="campaign-goal-progress">
            <div
              className="campaign-goal-progress-bar"
              style={{ width: `${Math.min(100, Math.round((metrics.confirmedVotes / Math.max(metrics.voters || 1, 1)) * 100))}%` }}
            />
          </div>
          <small>{conversionRate} da base já está em voto confirmado.</small>
        </div>
      </section>

      <div className="campaign-metrics-grid">
        <MetricCard title="Votos confirmados" value={metrics.confirmedVotes} helper="Base com confirmação explícita" tone="success" />
        <MetricCard title="Votos prováveis" value={metrics.probableVotes} helper="Simpatizantes, apoiadores e multiplicadores" tone="highlight" />
        <MetricCard title="Apoiadores" value={metrics.supporters} helper="Recorte com potencial de mobilização" />
        <MetricCard title="Indecisos" value={metrics.undecided} helper="Prioridade para próximo contato" tone="warning" />
        <MetricCard title="Voluntários" value={metrics.volunteers} helper="Base já disposta a atuar" />
        <MetricCard title="Lideranças" value={metrics.leaders} helper="Mapeadas nos dados atuais" />
        <MetricCard title="Eleitores cadastrados" value={metrics.voters} helper="Após aplicação dos filtros" />
        <MetricCard title="Cadastros do dia" value={metrics.newToday} helper="Novas entradas desde hoje" tone="success" />
        <MetricCard title="Apoios do dia" value={metrics.supportToday} helper="Atualizações com apoio identificado hoje" />
        <MetricCard title="Agenda do dia" value={metrics.agendaToday} helper="Compromissos e ações previstos" />
        <MetricCard title="Próximos eventos" value={metrics.upcomingEvents} helper="Eventos futuros cadastrados" />
        <MetricCard title="Tarefas pendentes" value={metrics.pendingTasks} helper="Itens aguardando conclusão" tone="warning" />
        <MetricCard title="Demandas críticas" value={metrics.criticalDemands} helper="Pendências já atrasadas" tone="danger" />
        <MetricCard title="Alertas" value={metrics.alerts} helper="Sinais que pedem correção de rota" tone="danger" />
      </div>

      <div className="campaign-executive-grid">
        <InsightPanel title="Resumo executivo" subtitle="Os indicadores que orientam a próxima decisão" compact>
          <div className="campaign-signal-grid">
            {strategicSignals.map((signal) => (
              <article key={signal.title} className="campaign-signal-card">
                <div className="campaign-signal-icon">
                  <signal.icon size={18} />
                </div>
                <div>
                  <span>{signal.title}</span>
                  <strong>{signal.value}</strong>
                  <p>{signal.helper}</p>
                </div>
              </article>
            ))}
          </div>
        </InsightPanel>

        <InsightPanel title="Direção sugerida" subtitle="Leitura automatizada do recorte atual" compact>
          <div className="campaign-priority-stack">
            <article className="campaign-priority-card success">
              <div>
                <strong>Expandir a conversão</strong>
                <p>Priorize apoiadores e simpatizantes com maior chance de virar voto confirmado.</p>
              </div>
              <ArrowUpRight size={18} />
            </article>

            <article className="campaign-priority-card warning">
              <div>
                <strong>Ativar os indecisos</strong>
                <p>{metrics.undecided} contato(s) pedem abordagem consultiva e próximo passo claro.</p>
              </div>
              <AlertTriangle size={18} />
            </article>

            <article className="campaign-priority-card neutral">
              <div>
                <strong>Organizar execução</strong>
                <p>{metrics.pendingTasks} tarefa(s) pendentes impactam a cadência operacional.</p>
              </div>
              <CalendarClock size={18} />
            </article>
          </div>
        </InsightPanel>
      </div>

      <div className="campaign-main-grid">
        <InsightPanel title="Ritmo de cadastros e apoios" subtitle="Últimos recortes do período selecionado">
          <div className="campaign-chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="cadastrosGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4ade80" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#4ade80" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="apoiosGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f172a" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#0f172a" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dbe4ee" />
                <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '14px', border: '1px solid #e2e8f0' }} />
                <Area type="monotone" dataKey="total" stroke="#4ade80" fill="url(#cadastrosGradient)" strokeWidth={3} name="Cadastros" />
                <Area type="monotone" dataKey="support" stroke="#0f172a" fill="url(#apoiosGradient)" strokeWidth={2} name="Apoios" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </InsightPanel>

        <InsightPanel title="Sala de comando" subtitle="Onde agir primeiro para manter tração" compact>
          <div className="campaign-alert-list">
            {alerts.length === 0 ? (
              <div className="campaign-empty-state">
                <CheckCircle2 size={18} />
                Nenhum alerta crítico no recorte atual.
              </div>
            ) : (
              alerts.map((alert) => (
                <article key={alert.title} className={`campaign-alert-item ${alert.type}`}>
                  <AlertTriangle size={18} />
                  <div>
                    <strong>{alert.title}</strong>
                    <p>{alert.description}</p>
                  </div>
                </article>
              ))
            )}
          </div>
        </InsightPanel>
      </div>

      <div className="campaign-secondary-grid">
        <InsightPanel title="Agenda do dia" subtitle="O que já está previsto para hoje" compact>
          <div className="campaign-list-block">
            {todayTasks.length === 0 ? (
              <div className="campaign-empty-state">
                <CalendarClock size={18} />
                Nenhuma agenda registrada para hoje.
              </div>
            ) : (
              todayTasks.slice(0, 5).map((task) => (
                <article key={task.id} className="campaign-list-item">
                  <div>
                    <strong>{task.titulo || 'Compromisso sem título'}</strong>
                    <p>{task.descricao || task.tipo || 'Ação programada para a equipe'}</p>
                  </div>
                  <span>{task.time || 'Hoje'}</span>
                </article>
              ))
            )}
          </div>
        </InsightPanel>

        <InsightPanel title="Próximos eventos" subtitle="Eventos futuros do calendário" compact>
          <div className="campaign-list-block">
            {upcomingEvents.length === 0 ? (
              <div className="campaign-empty-state">
                <CalendarClock size={18} />
                Nenhum evento futuro encontrado.
              </div>
            ) : (
              upcomingEvents.map((task) => (
                <article key={task.id} className="campaign-list-item">
                  <div>
                    <strong>{task.titulo || 'Evento'}</strong>
                    <p>{task.descricao || 'Evento da agenda principal'}</p>
                  </div>
                  <span>{task.data || 'Em breve'}</span>
                </article>
              ))
            )}
          </div>
        </InsightPanel>

        <InsightPanel title="Ranking de conversão" subtitle="Quem mais aproxima a meta no recorte atual" compact>
          <div className="campaign-list-block">
            {leaderboard.length === 0 ? (
              <div className="campaign-empty-state">
                <Users2 size={18} />
                Ainda não há base suficiente para o ranking.
              </div>
            ) : (
              leaderboard.map((item, index) => (
                <article key={item.name} className="campaign-rank-item">
                  <div className="campaign-rank-badge">{index + 1}</div>
                  <div className="campaign-rank-copy">
                    <strong>{item.name}</strong>
                    <p>{item.confirmed} voto(s) confirmados em {item.total} cadastro(s)</p>
                  </div>
                </article>
              ))
            )}
          </div>
        </InsightPanel>
      </div>

      <div className="campaign-secondary-grid">
        <InsightPanel title="Aniversariantes do dia" subtitle="Aproveite para ativar relacionamento" compact>
          <div className="campaign-list-block">
            {birthdays.length === 0 ? (
              <div className="campaign-empty-state">
                <MessageCircle size={18} />
                Nenhum aniversariante hoje.
              </div>
            ) : (
              birthdays.map((voter) => (
                <article key={voter.id} className="campaign-list-item">
                  <div>
                    <strong>{voter.nome}</strong>
                    <p>{voter.telefone || 'Sem telefone cadastrado'}</p>
                  </div>
                  <button onClick={() => handleWhatsApp(voter.telefone, voter.nome)} className="campaign-inline-action">
                    <MessageCircle size={16} />
                    Parabenizar
                  </button>
                </article>
              ))
            )}
          </div>
        </InsightPanel>

        <InsightPanel
          title="Leitura do recorte"
          subtitle={userType === 'assessor' ? 'Visão ajustada para a sua operação' : 'Visão consolidada da estrutura'}
          compact
        >
          <div className="campaign-notes-list">
            <div className="campaign-note-item">
              <strong>Filtros governam toda a Home.</strong>
              <p>Campanha, bairro, região, equipe, assessor e período sincronizam métricas, ranking e prioridades.</p>
            </div>
            <div className="campaign-note-item">
              <strong>A base já conversa com o funil.</strong>
              <p>Mesmo sem etapa formal em todos os registros, a leitura atual preserva compatibilidade e continuidade.</p>
            </div>
            <div className="campaign-note-item">
              <strong>Meta ainda é sugerida pela base.</strong>
              <p>Quando a configuração eleitoral estiver completa, este card passa a refletir metas oficiais por cargo e município.</p>
            </div>
          </div>
        </InsightPanel>
      </div>

      {loading ? <div className="dashboard-card">Carregando Central da Campanha...</div> : null}
    </div>
  );
}
