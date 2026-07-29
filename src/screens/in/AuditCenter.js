import React, { useMemo, useState } from 'react';
import { History, ShieldAlert } from 'lucide-react';
import InsightPanel from '../../components/dashboard/InsightPanel';
import MetricCard from '../../components/dashboard/MetricCard';
import { AUDIT_ACTION_OPTIONS, useAuditCenter } from '../../hooks/useAuditCenter';
import { useAuth } from '../../useAuth';

const formatDateTime = (value) => {
  if (!value) return 'Sem data';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date);
};

export default function AuditCenter() {
  const { user } = useAuth();
  const { loading, logs, stats } = useAuditCenter(user);
  const [actionFilter, setActionFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filteredLogs = useMemo(() => {
    const term = search.trim().toLowerCase();
    return logs.filter((entry) => {
      const matchesAction = actionFilter === 'all' || entry.action === actionFilter;
      const haystack = [
        entry.entity,
        entry.entityLabel,
        entry.actorEmail,
        entry.actionLabel,
        entry.details?.format,
        entry.details?.targetName
      ]
        .join(' ')
        .toLowerCase();
      const matchesSearch = !term || haystack.includes(term);
      return matchesAction && matchesSearch;
    });
  }, [actionFilter, logs, search]);

  return (
    <div className="campaign-dashboard">
      <section className="campaign-filters-card">
        <div className="campaign-filters-header">
          <div>
            <p className="campaign-kicker">
              <History size={16} />
              Fase 17
            </p>
            <h3>Auditoria</h3>
          </div>
        </div>

        <p style={{ margin: 0, color: '#64748b', lineHeight: 1.6 }}>
          Rastreabilidade de criação, edição, exclusão, exportação e alterações de permissão para apoiar operação, gestão e compliance.
        </p>

        <div className="campaign-filters-grid" style={{ marginTop: '18px' }}>
          <label className="funnel-filter-field">
            <span>Ação</span>
            <select className="campaign-filter-select" value={actionFilter} onChange={(event) => setActionFilter(event.target.value)}>
              {AUDIT_ACTION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="funnel-filter-field">
            <span>Busca</span>
            <input
              className="campaign-filter-select"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="usuário, formato, entidade..."
            />
          </label>
        </div>
      </section>

      <div className="campaign-metrics-grid">
        <MetricCard title="Eventos auditados" value={stats.total} helper="Histórico total" />
        <MetricCard title="Hoje" value={stats.today} helper="Registros em 29/07/2026" tone="highlight" />
        <MetricCard title="Exportações" value={stats.exports} helper="Arquivos gerados" />
        <MetricCard title="Exclusões" value={stats.deletions} helper="Ações críticas" tone="danger" />
        <MetricCard title="Permissões" value={stats.permissionChanges} helper="Mudanças de acesso" tone="success" />
      </div>

      <div className="campaign-main-grid audit-main-grid">
        <InsightPanel title="Linha do tempo" subtitle="Histórico mais recente da operação">
          <div className="audit-log-list">
            {loading ? <div className="campaign-empty-state">Carregando auditoria...</div> : null}
            {!loading && filteredLogs.length === 0 ? <div className="campaign-empty-state">Nenhum registro encontrado para os filtros atuais.</div> : null}

            {filteredLogs.map((entry) => (
              <article key={entry.id} className="audit-log-card">
                <div className="audit-log-head">
                  <div>
                    <strong>{entry.actionLabel}</strong>
                    <p>{entry.entityLabel || entry.entity || 'Sem entidade'} • {entry.actorEmail || 'Usuário não identificado'}</p>
                  </div>
                  <span className="users-role-pill">{formatDateTime(entry.createdAt)}</span>
                </div>

                <div className="audit-log-details">
                  <span>Entidade: {entry.entity}</span>
                  {entry.details?.format ? <span>Formato: {entry.details.format}</span> : null}
                  {entry.details?.targetName ? <span>Alvo: {entry.details.targetName}</span> : null}
                </div>

                {entry.details?.changes?.length ? (
                  <div className="audit-log-changes">
                    {entry.details.changes.map((change) => (
                      <span key={change} className="audit-change-pill">{change}</span>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </InsightPanel>

        <InsightPanel title="Cobertura atual" subtitle="Eventos já monitorados nesta fase" compact>
          <div className="campaign-notes-list">
            <div className="campaign-note-item">
              <strong>Usuários</strong>
              <p>Criação, edição, exclusão e alterações de permissões do módulo de usuários.</p>
            </div>
            <div className="campaign-note-item">
              <strong>Relatórios</strong>
              <p>Exportações em CSV e PDF já registradas com formato e filtro aplicado.</p>
            </div>
            <div className="campaign-note-item">
              <strong>Estrutura pronta</strong>
              <p>Serviço central criado para expandir auditoria para outros módulos sem mudar a arquitetura.</p>
            </div>
          </div>
        </InsightPanel>
      </div>

      <div className="campaign-secondary-grid">
        <InsightPanel title="Leitura rápida" subtitle="Como interpretar os eventos" compact>
          <div className="campaign-list-block">
            <article className="campaign-list-item">
              <div>
                <strong>Ações críticas</strong>
                <p>Exclusões e alterações de permissão aparecem como prioridade para revisão.</p>
              </div>
              <ShieldAlert size={18} color="#dc2626" />
            </article>
          </div>
        </InsightPanel>
      </div>
    </div>
  );
}
