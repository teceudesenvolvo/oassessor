import React from 'react';
import { AlertTriangle, CalendarClock, CheckCircle2, MessageCircle, Target, Users2 } from 'lucide-react';
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
    if (!phone) return alert("Telefone não cadastrado.");
    let cleanPhone = phone.replace(/\D/g, '');
    // Adiciona DDI 55 se não tiver (assumindo números BR)
    if (cleanPhone.length <= 11) {
      cleanPhone = '55' + cleanPhone;
    }
    const message = `Parabéns ${name}! Feliz aniversário! 🎉`;
    
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const url = isMobile 
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`
      : `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;

    window.open(url, '_blank');
  };

  return (
    <div className="campaign-dashboard">
      <CampaignFilters filters={filters} setFilters={setFilters} options={filterOptions} />

      <section className="campaign-hero">
        <div className="campaign-hero-copy">
          <p className="campaign-kicker">
            <Target size={16} />
            Operação eleitoral em tempo real
          </p>
          <h2>Visão consolidada da campanha para decidir o próximo movimento.</h2>
          <span>
            Painel conectado à base atual do portal web, pronto para evoluir para funil, metas e território nas próximas fases.
          </span>
        </div>
        <div className="campaign-goal-card">
          <span>Meta eleitoral</span>
          <strong>{metrics.goal.value}</strong>
          <p>{metrics.goal.helper}</p>
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

        <InsightPanel title="Alertas operacionais" subtitle="Atenção para o que pode travar a campanha" compact>
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
                  <button
                    onClick={() => handleWhatsApp(voter.telefone, voter.nome)}
                    className="campaign-inline-action"
                  >
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
              <strong>Filtros aplicam-se em toda a central.</strong>
              <p>Bairro, região, equipe, assessor e período já influenciam métricas, alertas e ranking.</p>
            </div>
            <div className="campaign-note-item">
              <strong>Indicadores sem etapa formal usam fallback seguro.</strong>
              <p>A base já está pronta para receber o funil eleitoral da próxima fase sem refatoração da tela.</p>
            </div>
            <div className="campaign-note-item">
              <strong>Meta ainda é sugestiva nesta etapa.</strong>
              <p>Na Fase 3, ela passa a vir de configuração explícita por cargo, município e eleição.</p>
            </div>
          </div>
        </InsightPanel>
      </div>

      {loading ? <div className="dashboard-card">Carregando Central da Campanha...</div> : null}
    </div>
  );
}
