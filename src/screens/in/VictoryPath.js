import React, { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar } from 'recharts';
import { Gauge, Save, Target, Trophy } from 'lucide-react';
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
  const { user } = useAuth();
  const { loading, metaConfig, setMetaConfig, saveMeta, analytics } = useVictoryPath(user);
  const [saving, setSaving] = useState(false);

  const statusText = useMemo(() => {
    if (!analytics.mainGoal) return 'Defina a meta principal para habilitar a projeção estratégica.';
    if (analytics.projectedVotes >= analytics.mainGoal) return 'A projeção atual alcança a meta principal.';
    if (analytics.projectedVotes >= analytics.minimumGoal) return 'A campanha projeta bater a meta mínima, mas ainda pede aceleração.';
    return 'O ritmo atual está abaixo da meta mínima e exige reforço de conversão.';
  }, [analytics]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setMetaConfig((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      await saveMeta(metaConfig);
      alert('Meta eleitoral salva com sucesso.');
    } catch (error) {
      console.error('Erro ao salvar meta eleitoral:', error);
      alert('Não foi possível salvar a meta eleitoral.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="campaign-dashboard">
      <section className="campaign-filters-card">
        <div className="campaign-filters-header">
          <div>
            <p className="campaign-kicker">
              <Target size={16} />
              Fase 3
            </p>
            <h3>Caminho para a Vitória</h3>
          </div>
          <div className="campaign-filters-pill">
            <Trophy size={16} />
            Metas eleitorais
          </div>
        </div>

        <form onSubmit={handleSave} className="campaign-filters-grid">
          <label className="funnel-filter-field">
            <span>Cargo</span>
            <input className="campaign-filter-select" name="cargo" value={metaConfig.cargo} onChange={handleChange} placeholder="Ex.: Vereador" />
          </label>
          <label className="funnel-filter-field">
            <span>Município</span>
            <input className="campaign-filter-select" name="municipio" value={metaConfig.municipio} onChange={handleChange} placeholder="Ex.: Pacatuba" />
          </label>
          <label className="funnel-filter-field">
            <span>Estado</span>
            <input className="campaign-filter-select" name="estado" value={metaConfig.estado} onChange={handleChange} placeholder="Ex.: CE" />
          </label>
          <label className="funnel-filter-field">
            <span>Meta mínima</span>
            <input className="campaign-filter-select" name="metaMinima" type="number" min="0" value={metaConfig.metaMinima} onChange={handleChange} placeholder="0" />
          </label>
          <label className="funnel-filter-field">
            <span>Meta principal</span>
            <input className="campaign-filter-select" name="metaPrincipal" type="number" min="0" value={metaConfig.metaPrincipal} onChange={handleChange} placeholder="0" />
          </label>
          <label className="funnel-filter-field">
            <span>Meta segura</span>
            <input className="campaign-filter-select" name="metaSegura" type="number" min="0" value={metaConfig.metaSegura} onChange={handleChange} placeholder="0" />
          </label>
          <label className="funnel-filter-field">
            <span>Data da eleição</span>
            <input className="campaign-filter-select" name="dataEleicao" type="date" value={metaConfig.dataEleicao} onChange={handleChange} />
          </label>
          <div className="victory-form-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              <Save size={16} />
              {saving ? 'Salvando...' : 'Salvar meta'}
            </button>
          </div>
        </form>
      </section>

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

      <div className="campaign-metrics-grid">
        <MetricCard title="Votos confirmados" value={analytics.confirmedVotes} helper="Base do funil em etapa final" tone="success" />
        <MetricCard title="Votos prováveis" value={analytics.probableVotes} helper="Reservatório imediato de conversão" tone="highlight" />
        <MetricCard title="Votos necessários" value={analytics.votesNeeded} helper="Faltam para atingir a meta principal" tone="warning" />
        <MetricCard title="Ritmo diário" value={analytics.dailyRhythm.toFixed(2)} helper="Confirmações por dia desde o início da base" />
        <MetricCard title="Projeção" value={analytics.projectedVotes} helper="Estimativa até a data da eleição" tone="success" />
        <MetricCard title="Dias restantes" value={analytics.daysRemaining} helper="Até a eleição configurada" tone="danger" />
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
