import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar } from 'recharts';
import { ArrowRight, BrainCircuit, CalendarClock, Flag, Gauge, Save, Settings2, Sparkles, Target, Trophy, X } from 'lucide-react';
import { useAuth } from '../../useAuth';
import { useVictoryPath } from '../../hooks/useVictoryPath';
import InsightPanel from '../../components/dashboard/InsightPanel';
import MetricCard from '../../components/dashboard/MetricCard';

function RankingTable({ title, subtitle, items }) {
  return (
    <InsightPanel title={title} subtitle={subtitle} compact>
      <div className="campaign-list-block">
        {items.length === 0 ? (
          <div className="campaign-empty-state">Ainda não há dados suficientes para o ranking.</div>
        ) : (
          items.map((item, index) => (
            <article key={item.name} className="campaign-rank-item">
              <div className="campaign-rank-badge">{index + 1}</div>
              <div className="campaign-rank-copy">
                <strong>{item.name}</strong>
                <p>{item.confirmed} confirmado(s) • {item.probable} provável(is)</p>
              </div>
            </article>
          ))
        )}
      </div>
    </InsightPanel>
  );
}

export default function VictoryPath() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { loading, metaConfig, setMetaConfig, saveMeta, analytics } = useVictoryPath(user);
  const [saving, setSaving] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalDraft, setGoalDraft] = useState(metaConfig);

  const statusText = useMemo(() => {
    if (!analytics.mainGoal) return 'Defina a meta principal para habilitar a projeção estratégica.';
    if (analytics.projectedVotes >= analytics.mainGoal) return 'A projeção atual alcança a meta principal.';
    if (analytics.projectedVotes >= analytics.minimumGoal) return 'A campanha projeta bater a meta mínima, mas ainda pede aceleração.';
    return 'O ritmo atual está abaixo da meta mínima e exige reforço de conversão.';
  }, [analytics]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setGoalDraft((prev) => ({ ...prev, [name]: type === 'checkbox' ? String(checked) : value }));
  };

  const openGoalModal = () => {
    setGoalDraft(metaConfig);
    setShowGoalModal(true);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      await saveMeta(goalDraft);
      setMetaConfig(goalDraft);
      setShowGoalModal(false);
    } catch (error) {
      console.error('Erro ao salvar meta eleitoral:', error);
      alert('Não foi possível salvar a meta eleitoral.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="campaign-dashboard">
      <section className="victory-command-header">
        <div>
          <p className="campaign-kicker"><Sparkles size={16} /> Planejamento inteligente</p>
          <h1>Seu caminho até a vitória, explicado passo a passo.</h1>
          <p>A plataforma transforma sua meta eleitoral em uma rotina diária clara para a equipe executar.</p>
        </div>
        <button type="button" className="btn-primary victory-configure-button" onClick={openGoalModal}>
          <Settings2 size={18} />
          {analytics.mainGoal ? 'Configurar meta' : 'Criar minha meta'}
        </button>
      </section>

      <section className="victory-goal-summary">
        <div className="victory-goal-icon"><Target size={24} /></div>
        <div>
          <span>Objetivo principal</span>
          <strong>{analytics.mainGoal ? `${analytics.mainGoal.toLocaleString('pt-BR')} votos` : 'Meta ainda não configurada'}</strong>
          <p>{metaConfig.cargo || 'Cargo não informado'} · {metaConfig.municipio || 'Município não informado'}{metaConfig.estado ? `/${metaConfig.estado}` : ''}</p>
        </div>
        <div className={`victory-risk-badge risk-${analytics.riskLevel.toLowerCase().replace('í', 'i').replace('ç', 'c').replace(/\s+/g, '-')}`}>
          <span>Diagnóstico</span>
          <strong>{analytics.riskLevel}</strong>
        </div>
      </section>

      {showGoalModal ? (
        <div className="funnel-modal-backdrop dashboard-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setShowGoalModal(false)}>
          <section className="funnel-modal victory-goal-modal" role="dialog" aria-modal="true" aria-labelledby="victory-goal-title">
            <button type="button" className="accountability-modal-close" onClick={() => setShowGoalModal(false)} aria-label="Fechar">
              <X size={20} />
            </button>
            <div className="victory-modal-intro">
              <div className="victory-goal-icon"><Trophy size={22} /></div>
              <div>
                <p className="campaign-kicker">Configuração guiada</p>
                <h2 id="victory-goal-title">Qual é a vitória que você quer construir?</h2>
                <p>Informe o cenário eleitoral. O motor inteligente fará os cálculos e atualizará o plano automaticamente.</p>
              </div>
            </div>
            <form onSubmit={handleSave} className="campaign-filters-grid victory-goal-form">
          <label className="funnel-filter-field">
            <span>Cargo</span>
            <input className="campaign-filter-select" name="cargo" value={goalDraft.cargo || ''} onChange={handleChange} placeholder="Ex.: Vereador" />
          </label>
          <label className="funnel-filter-field">
            <span>Município</span>
            <input className="campaign-filter-select" name="municipio" value={goalDraft.municipio || ''} onChange={handleChange} placeholder="Ex.: Pacatuba" />
          </label>
          <label className="funnel-filter-field">
            <span>Estado</span>
            <input className="campaign-filter-select" name="estado" value={goalDraft.estado || ''} onChange={handleChange} placeholder="Ex.: CE" />
          </label>
          <label className="funnel-filter-field">
            <span>Meta mínima</span>
            <input className="campaign-filter-select" name="metaMinima" type="number" min="0" value={goalDraft.metaMinima || ''} onChange={handleChange} placeholder="Ex.: 40.000" />
          </label>
          <label className="funnel-filter-field">
            <span>Meta principal</span>
            <input className="campaign-filter-select" name="metaPrincipal" type="number" min="0" value={goalDraft.metaPrincipal || ''} onChange={handleChange} placeholder="Ex.: 50.000" required />
          </label>
          <label className="funnel-filter-field">
            <span>Meta segura</span>
            <input className="campaign-filter-select" name="metaSegura" type="number" min="0" value={goalDraft.metaSegura || ''} onChange={handleChange} placeholder="Ex.: 55.000" />
          </label>
          <label className="funnel-filter-field">
            <span>Data do 1º turno</span>
            <input className="campaign-filter-select" name="dataEleicao" type="date" value={goalDraft.dataEleicao || ''} onChange={handleChange} required />
          </label>
          <label className="funnel-filter-field">
            <span>Haverá 2º turno?</span>
            <select className="campaign-filter-select" name="temSegundoTurno" value={goalDraft.temSegundoTurno || 'false'} onChange={handleChange}>
              <option value="false">Não</option>
              <option value="true">Sim</option>
            </select>
          </label>
          {goalDraft.temSegundoTurno === 'true' ? (
            <label className="funnel-filter-field">
              <span>Data do 2º turno</span>
              <input className="campaign-filter-select" name="dataSegundoTurno" type="date" value={goalDraft.dataSegundoTurno || ''} onChange={handleChange} required />
            </label>
          ) : null}
          <div className="victory-form-actions victory-modal-actions">
            <button type="button" className="btn-secondary" onClick={() => setShowGoalModal(false)}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              <Save size={16} />
              {saving ? 'Salvando...' : 'Salvar meta'}
            </button>
          </div>
          </form>
        </section>
      </div>
      ) : null}

      <section className="campaign-hero">
        <div className="campaign-hero-copy">
          <p className="campaign-kicker">
            <Gauge size={16} />
            Projeção em tempo real
          </p>
          <h2>{statusText}</h2>
          <span>
            O cálculo considera votos confirmados, prováveis, ritmo diário e o tempo restante até a eleição configurada.
          </span>
        </div>
        <div className="campaign-goal-card">
          <span>Percentual atingido</span>
          <strong>{analytics.percentReached.toFixed(1)}%</strong>
          <p>{analytics.confirmedVotes} voto(s) confirmados sobre a meta principal atual.</p>
        </div>
      </section>

      <section className="victory-ai-board">
        <div className="victory-ai-heading">
          <div className="victory-ai-mark"><BrainCircuit size={24} /></div>
          <div>
            <p className="campaign-kicker">Motor inteligente da campanha</p>
            <h2>O que sua equipe precisa fazer agora</h2>
            <p>Recomendações recalculadas com a meta, prazo, conversão e produtividade registradas.</p>
          </div>
          <div className="victory-confidence">
            <span>Confiança da análise</span>
            <strong>{analytics.confidenceScore}%</strong>
            <div><i style={{ width: `${analytics.confidenceScore}%` }} /></div>
          </div>
        </div>

        <div className="victory-priority-list">
          {analytics.priorities.slice(0, 3).map((priority, index) => (
            <article className="victory-priority-card" key={priority.key}>
              <span className="victory-priority-number">{index + 1}</span>
              <div>
                <small>{index === 0 ? 'Prioridade máxima' : 'Próximo movimento'}</small>
                <strong>{priority.label}</strong>
                <p>
                  Meta de <b>{priority.required.toFixed(priority.required >= 10 ? 0 : 1)} {priority.unit}</b>.
                  {' '}Hoje a capacidade estimada é {priority.current.toFixed(priority.current >= 10 ? 0 : 1)}.
                </p>
              </div>
              <button type="button" onClick={() => navigate(priority.route)} aria-label={`Abrir ${priority.label}`}>
                <ArrowRight size={19} />
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="victory-scenario-section">
        <div className="victory-section-heading">
          <div>
            <p className="campaign-kicker"><Gauge size={16} /> Simulação automática</p>
            <h2>Três caminhos possíveis</h2>
          </div>
          <p>Os cenários variam a eficiência da operação para mostrar a margem de segurança da meta.</p>
        </div>
        <div className="victory-scenario-grid">
          {analytics.scenarios.map((scenario) => (
            <article key={scenario.key} className={`victory-scenario-card ${scenario.key === 'realistic' ? 'is-featured' : ''}`}>
              {scenario.key === 'realistic' ? <span className="victory-recommended-label">Recomendado</span> : null}
              <strong>{scenario.label}</strong>
              <p>{scenario.description}</p>
              <div><span>Conversão estimada</span><b>{(scenario.conversion * 100).toFixed(1)}%</b></div>
              <div><span>Cadastros por dia</span><b>{scenario.cadastrosPerDay.toFixed(1)}</b></div>
              <div><span>Projeção no ritmo atual</span><b>{scenario.projectedVotes.toLocaleString('pt-BR')} votos</b></div>
            </article>
          ))}
        </div>
      </section>

      {analytics.milestones.length ? (
        <section className="victory-milestones">
          <div className="victory-section-heading">
            <div>
              <p className="campaign-kicker"><Flag size={16} /> Rota de acompanhamento</p>
              <h2>Marcos para saber se a campanha está no caminho certo</h2>
            </div>
          </div>
          <div className="victory-milestone-track">
            {analytics.milestones.map((milestone) => (
              <div key={milestone.progress} className="victory-milestone">
                <i />
                <span>{milestone.date}</span>
                <strong>{milestone.target.toLocaleString('pt-BR')} votos</strong>
                <small>{milestone.progress}% do percurso</small>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="campaign-metrics-grid">
        <MetricCard title="Votos confirmados" value={analytics.confirmedVotes} helper="Base do funil em etapa final" tone="success" />
        <MetricCard title="Votos prováveis" value={analytics.probableVotes} helper="Reservatório imediato de conversão" tone="highlight" />
        <MetricCard title="Votos necessários" value={analytics.votesNeeded} helper="Faltam para atingir a meta principal" tone="warning" />
        <MetricCard title="Ritmo diário" value={analytics.dailyRhythm.toFixed(2)} helper="Confirmações por dia desde o início da base" />
        <MetricCard title="Projeção" value={analytics.projectedVotes} helper="Estimativa até a data da eleição" tone="success" />
        <MetricCard
          title={analytics.hasSecondTurn ? 'Dias até o 2º turno' : 'Dias restantes'}
          value={analytics.daysRemaining}
          helper={analytics.hasSecondTurn ? `1º turno em ${analytics.daysToFirstTurn} dia(s)` : 'Até a eleição configurada'}
          tone="danger"
        />
      </div>

      <div className="campaign-metrics-grid">
        <MetricCard title="Cadastros por dia" value={analytics.perDayUntilFinalTurn.cadastros.toFixed(1)} helper={`Total necessário: ${analytics.cadastrosNeeded}`} tone="highlight" />
        <MetricCard title="Visitas por dia" value={analytics.perDayUntilFinalTurn.visits.toFixed(1)} helper={`Total necessário: ${analytics.visitsNeeded}`} />
        <MetricCard title="Eventos por dia" value={analytics.perDayUntilFinalTurn.events.toFixed(2)} helper={`Total necessário: ${analytics.eventsNeeded}`} tone="warning" />
        <MetricCard title="Lideranças por dia" value={analytics.perDayUntilFinalTurn.leaderships.toFixed(2)} helper={`Total necessário: ${analytics.leadershipsNeeded}`} tone="success" />
      </div>

      <div className="campaign-main-grid">
        <InsightPanel title="Curva de votos confirmados e prováveis" subtitle="Evolução recente do potencial eleitoral">
          <div className="campaign-chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.chartData}>
                <defs>
                  <linearGradient id="confirmedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="probableGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f172a" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0f172a" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dbe4ee" />
                <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '14px', border: '1px solid #e2e8f0' }} />
                <Area type="monotone" dataKey="confirmados" stroke="#16a34a" fill="url(#confirmedGradient)" strokeWidth={3} name="Confirmados" />
                <Area type="monotone" dataKey="provaveis" stroke="#0f172a" fill="url(#probableGradient)" strokeWidth={2} name="Prováveis" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </InsightPanel>

        <InsightPanel title="Leitura estratégica" subtitle="Resumo executivo para decisão rápida" compact>
          <div className="campaign-notes-list">
            <div className="campaign-note-item">
              <strong>Meta mínima</strong>
              <p>{analytics.minimumGoal || 0} voto(s)</p>
            </div>
            <div className="campaign-note-item">
              <strong>Meta principal</strong>
              <p>{analytics.mainGoal || 0} voto(s)</p>
            </div>
            <div className="campaign-note-item">
              <strong>Meta segura</strong>
              <p>{analytics.safeGoal || 0} voto(s)</p>
            </div>
            <div className="campaign-note-item">
              <strong>Orientação</strong>
              <p>{statusText}</p>
            </div>
            <div className="campaign-note-item">
              <strong>Plano de execução</strong>
              <p>{analytics.operationalFocus}</p>
            </div>
          </div>
        </InsightPanel>
      </div>

      <div className="campaign-main-grid">
        <InsightPanel title="Motor de meta eleitoral" subtitle="O que a campanha precisa produzir para bater a meta">
          <div className="campaign-notes-list">
            <div className="campaign-note-item">
              <strong>
                <CalendarClock size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                Janela até o 1º turno
              </strong>
              <p>
                {analytics.daysToFirstTurn} dia(s) para produzir {analytics.perDayUntilFirstTurn.cadastros.toFixed(1)} cadastros,
                {' '}{analytics.perDayUntilFirstTurn.visits.toFixed(1)} visitas, {analytics.perDayUntilFirstTurn.events.toFixed(2)} eventos e
                {' '}{analytics.perDayUntilFirstTurn.leaderships.toFixed(2)} lideranças por dia.
              </p>
            </div>
            <div className="campaign-note-item">
              <strong>
                <Flag size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                Janela final da campanha
              </strong>
              <p>
                {analytics.daysRemaining} dia(s) no horizonte total para manter {analytics.weeklyPace.cadastros.toFixed(0)} cadastros,
                {' '}{analytics.weeklyPace.visits.toFixed(0)} visitas, {analytics.weeklyPace.events.toFixed(1)} eventos e
                {' '}{analytics.weeklyPace.leaderships.toFixed(1)} lideranças por semana.
              </p>
            </div>
            <div className="campaign-note-item">
              <strong>Base e eficiência atual</strong>
              <p>
                {analytics.totalCadastros} cadastro(s), {analytics.totalVisits} visita(s), {analytics.totalEvents} evento(s) e
                {' '}{analytics.totalLeaderships} liderança(s) registradas, com conversão histórica estimada em
                {' '}{(analytics.conversionRate * 100).toFixed(1)}%.
              </p>
            </div>
          </div>
        </InsightPanel>

        <InsightPanel title="Leituras acionáveis" subtitle="Frentes que precisam crescer para alcançar a meta" compact>
          <div className="campaign-notes-list">
            <div className="campaign-note-item">
              <strong>Cadastros totais a construir</strong>
              <p>{analytics.cadastrosNeeded} novo(s) cadastro(s) para sustentar a meta com a conversão atual.</p>
            </div>
            <div className="campaign-note-item">
              <strong>Visitas necessárias</strong>
              <p>{analytics.visitsNeeded} visita(s) estimadas com base na produtividade média já registrada.</p>
            </div>
            <div className="campaign-note-item">
              <strong>Eventos necessários</strong>
              <p>{analytics.eventsNeeded} evento(s) estimados para dar vazão ao volume de cadastros exigido.</p>
            </div>
            <div className="campaign-note-item">
              <strong>Lideranças necessárias</strong>
              <p>{analytics.leadershipsNeeded} liderança(s) mobilizadas para distribuir o volume de votos buscado.</p>
            </div>
          </div>
        </InsightPanel>
      </div>

      <div className="campaign-secondary-grid">
        <RankingTable title="Ranking por equipe" subtitle="Conversão por frente de operação" items={analytics.rankingByTeam} />
        <RankingTable title="Ranking por liderança" subtitle="Quem mais contribui para fechar a meta" items={analytics.rankingByLeadership} />
        <RankingTable title="Ranking por bairro" subtitle="Territórios com maior potencial confirmado" items={analytics.rankingByNeighborhood} />
      </div>

      <InsightPanel title="Comparativo dos rankings" subtitle="Distribuição entre confirmados e prováveis">
        <div className="campaign-chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.rankingByLeadership}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dbe4ee" />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '14px', border: '1px solid #e2e8f0' }} />
              <Bar dataKey="confirmed" fill="#16a34a" radius={[6, 6, 0, 0]} name="Confirmados" />
              <Bar dataKey="probable" fill="#0f172a" radius={[6, 6, 0, 0]} name="Prováveis" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </InsightPanel>

      {loading ? <div className="dashboard-card">Carregando Caminho para a Vitória...</div> : null}
    </div>
  );
}
