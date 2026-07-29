import React, { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Download, FileSpreadsheet, FileText, LineChart, PlusSquare } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import InsightPanel from '../../components/dashboard/InsightPanel';
import MetricCard from '../../components/dashboard/MetricCard';
import { useReportsCenter } from '../../hooks/useReportsCenter';
import { logAuditEvent } from '../../services/auditService';
import { useAuth } from '../../useAuth';

const toCsv = (rows) => {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  return [headers.join(','), ...rows.map((row) => headers.map((header) => escape(row[header])).join(','))].join('\n');
};

const downloadBlob = (content, filename, type) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export default function ReportsCenter() {
  const { user } = useAuth();
  const { loading, summary, chartData, neighborhoodReport } = useReportsCenter(user);
  const [filter, setFilter] = useState('territory');

  const filteredRows = useMemo(() => {
    if (filter === 'territory') return neighborhoodReport;
    return chartData.map((item) => ({ indicador: item.label, total: item.total }));
  }, [chartData, filter, neighborhoodReport]);

  const exportCsv = async () => {
    downloadBlob(toCsv(filteredRows), `relatorio-${filter}-2026-07-29.csv`, 'text/csv;charset=utf-8');
    await logAuditEvent({
      user,
      action: 'export',
      entity: 'report',
      entityId: filter,
      entityLabel: 'Central de Relatórios',
      details: {
        format: 'csv',
        targetName: filter,
        rows: filteredRows.length
      }
    });
  };

  const exportPdf = async () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(18);
    doc.text('Central de Relatórios', 14, 20);
    doc.setFontSize(10);
    doc.text(`Exportado em 29/07/2026 • filtro: ${filter}`, 14, 28);

    autoTable(doc, {
      startY: 36,
      head: [Object.keys(filteredRows[0] || { coluna: 'Sem dados' })],
      body: filteredRows.length ? filteredRows.map((row) => Object.values(row)) : [['Sem dados']]
    });

    doc.save(`relatorio-${filter}-2026-07-29.pdf`);
    await logAuditEvent({
      user,
      action: 'export',
      entity: 'report',
      entityId: filter,
      entityLabel: 'Central de Relatórios',
      details: {
        format: 'pdf',
        targetName: filter,
        rows: filteredRows.length
      }
    });
  };

  return (
    <div className="campaign-dashboard">
      <section className="campaign-filters-card">
        <div className="campaign-filters-header">
          <div>
            <p className="campaign-kicker">
              <PlusSquare size={16} />
              Fase 14
            </p>
            <h3>Central de Relatórios</h3>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn-secondary" onClick={exportCsv} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <FileSpreadsheet size={16} />
              CSV
            </button>
            <button className="btn-primary" onClick={exportPdf} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={16} />
              PDF
            </button>
          </div>
        </div>

        <div className="campaign-filters-grid">
          <label className="funnel-filter-field">
            <span>Tipo de relatório</span>
            <select className="campaign-filter-select" value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option value="territory">Territorial</option>
              <option value="summary">Resumo executivo</option>
            </select>
          </label>
        </div>
      </section>

      <section className="campaign-hero">
        <div className="campaign-hero-copy">
          <p className="campaign-kicker">
            <LineChart size={16} />
            Relatórios executivos
          </p>
          <h2>Transforme dados da operação em leitura clara para decisão, auditoria e apresentação.</h2>
          <span>
            Consolidamos gráficos, exportação e resumos em um layout mais objetivo, leve para mobile e confortável para consultas longas.
          </span>
        </div>
        <div className="campaign-goal-card">
          <span>Linhas prontas</span>
          <strong>{filteredRows.length}</strong>
          <p>{filter === 'territory' ? 'Recortes territoriais' : 'Indicadores executivos'} preparados para exportação.</p>
        </div>
      </section>

      <div className="campaign-metrics-grid">
        <MetricCard title="Eleitores" value={summary.voters} helper="Base consolidada" />
        <MetricCard title="Apoiadores" value={summary.supporters} helper="Recorte eleitoral ativo" tone="success" />
        <MetricCard title="Tarefas" value={summary.tasks} helper="Produção registrada" />
        <MetricCard title="Visitas concluídas" value={summary.completedVisits} helper="Campo executado" tone="highlight" />
        <MetricCard title="Demandas pendentes" value={summary.pendingDemands} helper="Fila operacional" tone="danger" />
        <MetricCard title="Respostas de pesquisa" value={summary.totalAnswers} helper="Base de leitura estratégica" />
      </div>

      <div className="campaign-main-grid reports-main-grid">
        <InsightPanel title="Painel gráfico" subtitle="Leitura visual dos volumes consolidados">
          <div className="campaign-chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="reportsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dbe4ee" />
                <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '14px', border: '1px solid #e2e8f0' }} />
                <Area type="monotone" dataKey="total" stroke="#2563eb" fill="url(#reportsGradient)" strokeWidth={3} name="Volume" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </InsightPanel>

        <InsightPanel title="Tabela resumida" subtitle="Pronta para exportação e leitura mobile" compact>
          <div className="reports-table-list scrollable-panel long-list-panel">
            {loading ? <div className="campaign-empty-state">Carregando relatórios...</div> : null}
            {!loading && filteredRows.length === 0 ? <div className="campaign-empty-state">Nenhum dado encontrado para o relatório atual.</div> : null}

            {filteredRows.map((row, index) => (
              <div key={`${index}-${Object.values(row).join('-')}`} className="reports-table-card">
                {Object.entries(row).map(([key, value]) => (
                  <div key={key} className="reports-table-row">
                    <strong>{key}</strong>
                    <span>{value}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </InsightPanel>
      </div>

      <div className="campaign-secondary-grid">
        <InsightPanel title="Exportações disponíveis" subtitle="Sem depender de backend adicional" compact>
          <div className="campaign-notes-list">
            <div className="campaign-note-item">
              <strong>PDF</strong>
              <p>Relatório tabular pronto para apresentação e impressão.</p>
            </div>
            <div className="campaign-note-item">
              <strong>CSV</strong>
              <p>Arquivo leve para planilhas, auditoria e análise externa.</p>
            </div>
            <div className="campaign-note-item">
              <strong>Filtros</strong>
              <p>Base inicial pronta para expansão por território, equipe e pesquisas nas próximas iterações.</p>
            </div>
          </div>
        </InsightPanel>

        <InsightPanel title="Resumo do período" subtitle="Leitura executiva da operação em 29 de julho de 2026" compact>
          <div className="campaign-list-block">
            <article className="campaign-list-item">
              <div>
                <strong>Campanha consolidada</strong>
                <p>{summary.voters} eleitores, {summary.visits} visitas e {summary.demands} demandas registradas.</p>
              </div>
              <Download size={18} color="#2563eb" />
            </article>
          </div>
        </InsightPanel>
      </div>
    </div>
  );
}
