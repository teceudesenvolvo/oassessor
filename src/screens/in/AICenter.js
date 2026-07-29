import React, { useState } from 'react';
import { Bot, BrainCircuit, Lock, Send, ShieldCheck } from 'lucide-react';
import InsightPanel from '../../components/dashboard/InsightPanel';
import MetricCard from '../../components/dashboard/MetricCard';
import { useAICenter } from '../../hooks/useAICenter';

export default function AICenter() {
  const { features, selectedFeatureId, setSelectedFeatureId, selectedFeature, status, result, policy, runFeature } = useAICenter();
  const [payload, setPayload] = useState({
    objective: '',
    context: '',
    audience: ''
  });

  const handleRun = async (event) => {
    event.preventDefault();
    await runFeature(payload);
  };

  return (
    <div className="campaign-dashboard">
      <section className="campaign-filters-card">
        <div className="campaign-filters-header">
          <div>
            <p className="campaign-kicker">
              <Bot size={16} />
              Fase 15
            </p>
            <h3>Central de IA</h3>
          </div>
          <div className="campaign-filters-pill">
            <Lock size={16} />
            Backend obrigatório
          </div>
        </div>
        <p style={{ margin: 0, color: '#64748b', lineHeight: 1.6 }}>
          Estrutura preparada para IA sem usar chave da OpenAI no frontend. Esta etapa entrega telas, contratos, serviços e fluxo seguro de integração futura.
        </p>
      </section>

      <div className="campaign-metrics-grid">
        <MetricCard title="Segredo no frontend" value="Não" helper="Bloqueado por política de segurança" tone="success" />
        <MetricCard title="Backend seguro" value="Obrigatório" helper="Cloud Function ou API dedicada" tone="highlight" />
        <MetricCard title="Recursos prontos" value={features.length} helper="Contratos já previstos" />
      </div>

      <div className="campaign-main-grid ai-main-grid">
        <InsightPanel title="Recursos previstos" subtitle="Escopo de IA pronto para integração posterior">
          <div className="ai-feature-list">
            {features.map((feature) => (
              <button
                key={feature.id}
                type="button"
                className={`ai-feature-card ${selectedFeatureId === feature.id ? 'active' : ''}`}
                onClick={() => setSelectedFeatureId(feature.id)}
              >
                <strong>{feature.title}</strong>
                <p>{feature.description}</p>
              </button>
            ))}
          </div>
        </InsightPanel>

        <InsightPanel title="Contrato de execução" subtitle="Fluxo de entrada pronto para o backend de IA" compact>
          <form className="ai-request-form" onSubmit={handleRun}>
            <label className="funnel-filter-field">
              <span>Objetivo</span>
              <input className="campaign-filter-select" value={payload.objective} onChange={(event) => setPayload((prev) => ({ ...prev, objective: event.target.value }))} placeholder="Ex.: resumir cenário territorial" />
            </label>

            <label className="funnel-filter-field">
              <span>Público / contexto</span>
              <input className="campaign-filter-select" value={payload.audience} onChange={(event) => setPayload((prev) => ({ ...prev, audience: event.target.value }))} placeholder="Ex.: lideranças do bairro centro" />
            </label>

            <label className="funnel-filter-field">
              <span>Contexto</span>
              <textarea className="campaign-filter-select" rows="5" value={payload.context} onChange={(event) => setPayload((prev) => ({ ...prev, context: event.target.value }))} placeholder="Descreva o cenário que será enviado ao backend." />
            </label>

            <button type="submit" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <Send size={16} />
              Simular contrato
            </button>
          </form>
        </InsightPanel>
      </div>

      <div className="campaign-secondary-grid">
        <InsightPanel title="Política de segurança" subtitle="Por que não há chave no frontend" compact>
          <div className="campaign-notes-list">
            <div className="campaign-note-item">
              <strong>Frontend não usa segredo</strong>
              <p>{policy.frontendMayUseSecret ? 'Permitido' : 'Proibido'} — qualquer chave precisa ficar no backend.</p>
            </div>
            <div className="campaign-note-item">
              <strong>Transporte recomendado</strong>
              <p>{policy.recommendedTransport}</p>
            </div>
            <div className="campaign-note-item">
              <strong>Integração futura</strong>
              <p>Cloud Functions, API privada ou outro backend autenticado.</p>
            </div>
          </div>
        </InsightPanel>

        <InsightPanel title="Saída do contrato" subtitle="Resposta atual da camada de serviço" compact>
          <div className="ai-result-box">
            <div className="ai-result-header">
              <BrainCircuit size={18} />
              <strong>{selectedFeature.title}</strong>
            </div>
            <pre>{JSON.stringify({ status, result }, null, 2)}</pre>
          </div>
        </InsightPanel>

        <InsightPanel title="Pronto para backend" subtitle="Camadas entregues nesta fase" compact>
          <div className="campaign-list-block">
            <article className="campaign-list-item">
              <div>
                <strong>Contracts</strong>
                <p>Features, status e política de segurança.</p>
              </div>
              <ShieldCheck size={18} color="#16a34a" />
            </article>
            <article className="campaign-list-item">
              <div>
                <strong>Service</strong>
                <p>Stub seguro, sem integração direta no navegador.</p>
              </div>
              <ShieldCheck size={18} color="#16a34a" />
            </article>
            <article className="campaign-list-item">
              <div>
                <strong>Screen + Hook</strong>
                <p>Fluxo de uso pronto para conectar ao backend depois.</p>
              </div>
              <ShieldCheck size={18} color="#16a34a" />
            </article>
          </div>
        </InsightPanel>
      </div>
    </div>
  );
}
