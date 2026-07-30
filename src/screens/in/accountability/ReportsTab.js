import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AlertCircle, Download, FileSpreadsheet, FileText, ShieldCheck } from 'lucide-react';
import { get, ref } from '../../../services/firestoreDatabase';
import { database } from '../../../firebaseConfig';
import InsightPanel from '../../../components/dashboard/InsightPanel';
import CurrencyValue from '../../../components/accountability/CurrencyValue';
import { listScopedCollection } from '../../../services/accountabilityService';

const formatCurrency = (value = 0) =>
  (Number(value || 0) / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

const toSlug = (value) =>
  String(value || 'relatorio')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const downloadBlob = (content, type, filename) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const datasetToXls = (title, columns, rows) => {
  const table = `
    <table>
      <tr>${columns.map((column) => `<th>${column.label}</th>`).join('')}</tr>
      ${rows
        .map((row) => `<tr>${columns.map((column) => `<td>${row[column.key] ?? ''}</td>`).join('')}</tr>`)
        .join('')}
    </table>
  `;
  downloadBlob(table, 'application/vnd.ms-excel;charset=utf-8;', `${toSlug(title)}-${new Date().toISOString().slice(0, 10)}.xls`);
};

const datasetToJson = (title, rows) => {
  downloadBlob(
    JSON.stringify({ title, generatedAt: new Date().toISOString(), rows }, null, 2),
    'application/json',
    `${toSlug(title)}-${new Date().toISOString().slice(0, 10)}.json`
  );
};

const datasetToPdf = (title, subtitle, columns, rows) => {
  const doc = new jsPDF();
  doc.setFontSize(12);
  doc.text('JUSTIÇA ELEITORAL', 105, 16, { align: 'center' });
  doc.setFontSize(10);
  doc.text(title, 105, 23, { align: 'center' });
  doc.setFontSize(9);
  if (subtitle) doc.text(subtitle, 14, 32);

  autoTable(doc, {
    startY: subtitle ? 38 : 30,
    head: [columns.map((column) => column.label)],
    body: rows.map((row) => columns.map((column) => row[column.key] ?? '-')),
    styles: { fontSize: 9 }
  });

  doc.save(`${toSlug(title)}-${new Date().toISOString().slice(0, 10)}.pdf`);
};

export default function ReportsTab() {
  const { summary, scope } = useOutletContext();
  const [datasets, setDatasets] = useState({
    revenues: [],
    expenses: [],
    bankAccounts: [],
    documents: [],
    budget: [],
    userProfile: null
  });

  useEffect(() => {
    if (!scope?.adminId) return;

    const load = async () => {
      const [revenues, expenses, bankAccounts, documents, budget, userSnapshot] = await Promise.all([
        listScopedCollection('revenues', scope),
        listScopedCollection('expenses', scope),
        listScopedCollection('bankAccounts', scope),
        listScopedCollection('documents', scope),
        listScopedCollection('budget', scope),
        get(ref(database, `users/${scope.adminId}`))
      ]);

      setDatasets({
        revenues,
        expenses,
        bankAccounts,
        documents,
        budget,
        userProfile: userSnapshot.exists() ? userSnapshot.val() : null
      });
    };

    load();
  }, [scope]);

  const reportConfigs = useMemo(() => {
    const pendingRows = [
      { indicador: 'Documentos faltantes', valor: summary.metrics.missingDocs, detalhe: 'Lançamentos sem anexo mínimo.' },
      { indicador: 'Receitas sem comprovação', valor: summary.attention.revenuesWithoutProof, detalhe: 'Receitas aguardando comprovação.' },
      { indicador: 'Despesas sem documento', valor: summary.attention.expensesWithoutDocument, detalhe: 'Saídas sem evidência documental.' },
      { indicador: 'Divergências de saldo', valor: summary.attention.balanceDivergences, detalhe: 'Contas com saldo incompatível.' },
      { indicador: 'Pendências de revisão', valor: summary.attention.pendingReviews, detalhe: 'Itens aguardando conferência humana.' }
    ];

    return [
      {
        title: 'Receitas',
        subtitle: 'Entradas financeiras lançadas na central',
        rows: datasets.revenues.map((item) => ({
          descricao: item.title || '-',
          tipo: item.category || '-',
          valor: formatCurrency(item.amountCents),
          data: item.date || '-',
          origem: item.donorName || '-',
          conta: item.accountName || '-',
          status: item.status || '-'
        })),
        columns: [
          { key: 'descricao', label: 'Descrição' },
          { key: 'tipo', label: 'Tipo' },
          { key: 'valor', label: 'Valor' },
          { key: 'data', label: 'Data' },
          { key: 'origem', label: 'Origem' },
          { key: 'conta', label: 'Conta' },
          { key: 'status', label: 'Status' }
        ]
      },
      {
        title: 'Despesas',
        subtitle: 'Saídas financeiras e vínculos operacionais',
        rows: datasets.expenses.map((item) => ({
          descricao: item.title || '-',
          tipo: item.expenseType || '-',
          categoria: item.category || '-',
          valor: formatCurrency(item.amountCents),
          data: item.date || '-',
          responsavel: item.teamMemberName || item.supplierName || '-',
          conta: item.accountName || '-',
          status: item.status || '-'
        })),
        columns: [
          { key: 'descricao', label: 'Descrição' },
          { key: 'tipo', label: 'Tipo' },
          { key: 'categoria', label: 'Categoria' },
          { key: 'valor', label: 'Valor' },
          { key: 'data', label: 'Data' },
          { key: 'responsavel', label: 'Fornecedor / equipe' },
          { key: 'conta', label: 'Conta' },
          { key: 'status', label: 'Status' }
        ]
      },
      {
        title: 'Saldos e indicadores',
        subtitle: 'Resumo consolidado da prestação',
        rows: [
          { indicador: 'Receitas', valor: formatCurrency(summary.metrics.totalRevenues) },
          { indicador: 'Despesas', valor: formatCurrency(summary.metrics.totalExpenses) },
          { indicador: 'Saldo financeiro', valor: formatCurrency(summary.metrics.financialBalance) },
          { indicador: 'Saldo bancário', valor: formatCurrency(summary.metrics.bankBalance) },
          { indicador: 'Não conciliadas', valor: String(summary.metrics.nonReconciled || 0) },
          { indicador: 'Documentos faltantes', valor: String(summary.metrics.missingDocs || 0) },
          { indicador: 'Inconsistências críticas', valor: String(summary.metrics.criticalIssues || 0) },
          { indicador: 'Conclusão', valor: `${summary.metrics.progress || 0}%` }
        ],
        columns: [
          { key: 'indicador', label: 'Indicador' },
          { key: 'valor', label: 'Valor' }
        ]
      },
      {
        title: 'Contas bancárias',
        subtitle: 'Contas cadastradas e saldos informados',
        rows: datasets.bankAccounts.map((item) => ({
          banco: item.bankName || '-',
          codigo: item.bankCode || '-',
          agencia: item.agency || '-',
          conta: item.accountNumber || '-',
          tipo: item.accountType || '-',
          finalidade: item.purpose || '-',
          saldoInicial: formatCurrency(item.initialBalanceCents),
          saldoInformado: formatCurrency(item.reportedBalanceCents),
          status: item.status || '-'
        })),
        columns: [
          { key: 'banco', label: 'Banco' },
          { key: 'codigo', label: 'Código' },
          { key: 'agencia', label: 'Agência' },
          { key: 'conta', label: 'Conta' },
          { key: 'tipo', label: 'Tipo' },
          { key: 'finalidade', label: 'Finalidade' },
          { key: 'saldoInicial', label: 'Saldo inicial' },
          { key: 'saldoInformado', label: 'Saldo informado' },
          { key: 'status', label: 'Status' }
        ]
      },
      {
        title: 'Dados do usuário responsável',
        subtitle: 'Dados do administrador / dono da conta',
        rows: datasets.userProfile
          ? [{
              nome: datasets.userProfile.nome || datasets.userProfile.name || '-',
              email: datasets.userProfile.email || '-',
              telefone: datasets.userProfile.telefone || '-',
              cargo: datasets.userProfile.cargo || '-',
              cpf: datasets.userProfile.cpf || '-',
              plano: datasets.userProfile.plano || datasets.userProfile.planId || '-'
            }]
          : [],
        columns: [
          { key: 'nome', label: 'Nome' },
          { key: 'email', label: 'E-mail' },
          { key: 'telefone', label: 'Telefone' },
          { key: 'cargo', label: 'Cargo' },
          { key: 'cpf', label: 'CPF' },
          { key: 'plano', label: 'Plano' }
        ]
      },
      {
        title: 'Pendências',
        subtitle: 'Fila operacional para revisão e correção',
        rows: pendingRows,
        columns: [
          { key: 'indicador', label: 'Pendência' },
          { key: 'valor', label: 'Qtd.' },
          { key: 'detalhe', label: 'Detalhe' }
        ]
      },
      {
        title: 'Documentos',
        subtitle: 'Arquivos, comprovantes e evidências anexadas',
        rows: datasets.documents.map((item) => ({
          nome: item.documentName || item.title || '-',
          tipo: item.category || '-',
          data: item.date || '-',
          status: item.status || '-',
          tamanho: item.fileSize ? `${Math.round(Number(item.fileSize || 0) / 1024)} KB` : '-',
          descricao: item.description || '-'
        })),
        columns: [
          { key: 'nome', label: 'Documento' },
          { key: 'tipo', label: 'Tipo' },
          { key: 'data', label: 'Data' },
          { key: 'status', label: 'Status' },
          { key: 'tamanho', label: 'Tamanho' },
          { key: 'descricao', label: 'Descrição' }
        ]
      },
      {
        title: 'Orçamento',
        subtitle: 'Planejamento financeiro por categoria',
        rows: datasets.budget.map((item) => ({
          item: item.title || '-',
          categoria: item.category || '-',
          valor: formatCurrency(item.plannedAmountCents),
          status: item.status || '-',
          descricao: item.description || '-'
        })),
        columns: [
          { key: 'item', label: 'Item' },
          { key: 'categoria', label: 'Categoria' },
          { key: 'valor', label: 'Valor planejado' },
          { key: 'status', label: 'Status' },
          { key: 'descricao', label: 'Descrição' }
        ]
      }
    ];
  }, [datasets, summary]);

  return (
    <InsightPanel title="Relatórios" subtitle="Exportações por bloco para conferência, auditoria e trabalho externo">
      <div className="campaign-alert-list accountability-scroll-list">
        {reportConfigs.map((report) => (
          <div key={report.title} className="campaign-alert-item accountability-report-card">
            <div className="accountability-report-copy">
              <strong><FileText size={16} /> {report.title}</strong>
              <p>{report.subtitle}</p>
            </div>
            <div className="accountability-export-actions">
              <button type="button" className="btn-secondary" onClick={() => datasetToXls(report.title, report.columns, report.rows)}>
                <FileSpreadsheet size={16} />
                Exportar XLS
              </button>
              <button type="button" className="btn-primary" onClick={() => datasetToPdf(report.title, report.subtitle, report.columns, report.rows)}>
                <FileText size={16} />
                Exportar PDF
              </button>
              <button type="button" className="btn-secondary" onClick={() => datasetToJson(report.title, report.rows)}>
                <Download size={16} />
                JSON
              </button>
            </div>
          </div>
        ))}

        <div className="campaign-alert-item accountability-report-card">
          <div className="accountability-report-copy">
            <strong><ShieldCheck size={16} /> Resumo atual</strong>
            <p>
              Receitas <CurrencyValue valueCents={summary.metrics.totalRevenues} /> • Despesas{' '}
              <CurrencyValue valueCents={summary.metrics.totalExpenses} /> • Saldo{' '}
              <CurrencyValue valueCents={summary.metrics.financialBalance} />
            </p>
          </div>
        </div>

        <div className="campaign-alert-item accountability-report-card accountability-report-warning">
          <div className="accountability-report-copy">
            <strong><AlertCircle size={16} /> Observação importante</strong>
            <p>
              Segundo o TSE, a entrega oficial deve seguir o sistema eleitoral aplicável. As exportações desta central servem para organização, conferência e apoio interno.
            </p>
          </div>
        </div>
      </div>
    </InsightPanel>
  );
}
