import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { AlertTriangle, Banknote, Download, FileWarning, Wallet } from 'lucide-react';
import InsightPanel from '../../../components/dashboard/InsightPanel';
import MetricCard from '../../../components/dashboard/MetricCard';
import CurrencyValue from '../../../components/accountability/CurrencyValue';

export default function OverviewTab() {
  const { summary } = useOutletContext();
  const { metrics, attention } = summary;

  return (
    <>
      <div className="campaign-metrics-grid">
        <MetricCard title="Receitas" value={<CurrencyValue valueCents={metrics.totalRevenues} />} helper="Total ingressado" tone="success" />
        <MetricCard title="Despesas" value={<CurrencyValue valueCents={metrics.totalExpenses} />} helper="Total comprometido" tone="danger" />
        <MetricCard title="Saldo financeiro" value={<CurrencyValue valueCents={metrics.financialBalance} />} helper="Receitas menos despesas" />
        <MetricCard title="Saldo bancário" value={<CurrencyValue valueCents={metrics.bankBalance} />} helper="Saldo informado nas contas" tone="highlight" />
        <MetricCard title="Não conciliadas" value={metrics.nonReconciled} helper="Movimentações pendentes" />
        <MetricCard title="Documentos faltantes" value={metrics.missingDocs} helper="Pendências documentais" tone="danger" />
      </div>

      <div className="campaign-main-grid accountability-main-grid">
        <InsightPanel title="Atenção necessária" subtitle="Pontos que pedem ação imediata">
          <div className="campaign-alert-list accountability-scroll-list accountability-attention-list">
            <div className="campaign-alert-item"><div><strong><FileWarning size={16} /> Despesas sem documento</strong><p>{attention.expensesWithoutDocument} lançamento(s) aguardando anexo.</p></div></div>
            <div className="campaign-alert-item"><div><strong><Banknote size={16} /> Receitas sem comprovação</strong><p>{attention.revenuesWithoutProof} receita(s) sem documento associado.</p></div></div>
            <div className="campaign-alert-item"><div><strong><Wallet size={16} /> Divergências de saldo</strong><p>{attention.balanceDivergences} conta(s) com saldo divergente.</p></div></div>
            <div className="campaign-alert-item"><div><strong><AlertTriangle size={16} /> Revisões pendentes</strong><p>{attention.pendingReviews} item(ns) aguardando revisão.</p></div></div>
          </div>
        </InsightPanel>

        <InsightPanel title="Últimos marcos" subtitle="Leitura rápida da cadência do processo" compact>
          <div className="campaign-notes-list">
            <div className="campaign-note-item"><strong>Última movimentação</strong><p>{metrics.lastMovement}</p></div>
            <div className="campaign-note-item"><strong>Última conciliação</strong><p>{metrics.lastReconciliation}</p></div>
            <div className="campaign-note-item"><strong>Última revisão</strong><p>{metrics.lastReview}</p></div>
            <div className="campaign-note-item accountability-export-note">
              <strong><Download size={16} /> Exportações</strong>
              <p>Use a aba Relatórios para gerar a prestação em XLS ou PDF.</p>
            </div>
          </div>
        </InsightPanel>
      </div>
    </>
  );
}
