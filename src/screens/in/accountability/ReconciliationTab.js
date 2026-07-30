import React, { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { CheckCircle2, Save, Wallet, X } from 'lucide-react';
import InsightPanel from '../../../components/dashboard/InsightPanel';
import StatusBadge from '../../../components/accountability/StatusBadge';
import CurrencyValue from '../../../components/accountability/CurrencyValue';
import { useAccountabilityEntity } from '../../../hooks/useAccountabilityEntity';

const today = new Date().toISOString().slice(0, 10);

const formatDate = (value) => {
  if (!value) return 'Sem data';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(date);
};

const parseCurrencyToCents = (value) => {
  if (typeof value === 'number') return value;
  return Number(String(value || '').replace(/\D/g, '') || 0);
};

const formatCurrencyInput = (value) => {
  const cents = parseCurrencyToCents(value);
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const initialForm = {
  date: today,
  status: 'conciliada',
  reconciledAmount: '',
  bankReference: '',
  statementNote: ''
};

export default function ReconciliationTab() {
  const { scope, user, reload } = useOutletContext();
  const revenues = useAccountabilityEntity({ user, scope, collectionKey: 'revenues', entity: 'prestacao_receita', onMutationComplete: reload });
  const expenses = useAccountabilityEntity({ user, scope, collectionKey: 'expenses', entity: 'prestacao_despesa', onMutationComplete: reload });

  const [selectedItem, setSelectedItem] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [filters, setFilters] = useState({
    search: '',
    sourceType: 'todos',
    status: 'todos'
  });

  const allRecords = useMemo(
    () => [
      ...revenues.records.map((item) => ({ ...item, sourceType: 'receita' })),
      ...expenses.records.map((item) => ({ ...item, sourceType: 'despesa' }))
    ].sort((a, b) => new Date(b.date || b.updatedAt || 0) - new Date(a.date || a.updatedAt || 0)),
    [expenses.records, revenues.records]
  );

  const filteredRecords = useMemo(() => {
    const normalizedSearch = filters.search.trim().toLowerCase();
    return allRecords.filter((item) => {
      const matchesSearch = !normalizedSearch || [
        item.title,
        item.category,
        item.accountName,
        item.reconciliationBankReference,
        item.status
      ].filter(Boolean).some((value) => String(value).toLowerCase().includes(normalizedSearch));

      const matchesSource = filters.sourceType === 'todos' || item.sourceType === filters.sourceType;
      const matchesStatus = filters.status === 'todos' || item.status === filters.status;

      return matchesSearch && matchesSource && matchesStatus;
    });
  }, [allRecords, filters]);

  const pending = useMemo(
    () => filteredRecords
      .filter((item) => item.status !== 'conciliada')
      .sort((a, b) => new Date(b.date || b.updatedAt || 0) - new Date(a.date || a.updatedAt || 0)),
    [filteredRecords]
  );

  const reconciled = useMemo(
    () => filteredRecords
      .filter((item) => item.status === 'conciliada')
      .sort((a, b) => new Date(b.lastReconciledAt || b.reconciliationDate || b.updatedAt || 0) - new Date(a.lastReconciledAt || a.reconciliationDate || a.updatedAt || 0)),
    [filteredRecords]
  );

  const isSaving = revenues.saving || expenses.saving;

  const openModal = (item) => {
    setSelectedItem(item);
    setForm({
      date: today,
      status: 'conciliada',
      reconciledAmount: formatCurrencyInput(item.amountCents || 0),
      bankReference: item.accountName || '',
      statementNote: item.reconciliationNote || ''
    });
  };

  const resetModal = () => {
    setSelectedItem(null);
    setForm(initialForm);
  };

  const handleSave = async () => {
    if (!selectedItem) return;

    const saveRecord = selectedItem.sourceType === 'receita' ? revenues.saveRecord : expenses.saveRecord;

    await saveRecord({
      ...selectedItem,
      status: form.status,
      reconciliationDate: form.date,
      reconciliationNote: form.statementNote || '',
      reconciliationBankReference: form.bankReference || '',
      reconciledAmountCents: parseCurrencyToCents(form.reconciledAmount),
      lastReconciledAt: new Date().toISOString()
    }, selectedItem.id);

    resetModal();
  };

  return (
    <>
      <InsightPanel title="Conciliação" subtitle="Conferência entre lançamentos, extrato bancário e situação real de cada movimentação">
        <div className="accountability-toolbar">
          <div className="campaign-note-card reconciliation-note-card">
            <strong>Fluxo sugerido</strong>
            <p>Abra o popup da movimentação, confirme valor, data e referência bancária, e salve a conciliação sem sair da tela.</p>
          </div>
        </div>

        <div className="reconciliation-filters-shell">
          <div className="reconciliation-filters-bar">
            <label className="reconciliation-filter-field reconciliation-filter-search">
              <span>Buscar</span>
              <input
                type="text"
                className="campaign-filter-select"
                placeholder="Título, conta, status..."
                value={filters.search}
                onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
              />
            </label>

            <label className="reconciliation-filter-field">
              <span>Origem</span>
              <select
                className="campaign-filter-select"
                value={filters.sourceType}
                onChange={(event) => setFilters((prev) => ({ ...prev, sourceType: event.target.value }))}
              >
                <option value="todos">Todos</option>
                <option value="receita">Receitas</option>
                <option value="despesa">Despesas</option>
              </select>
            </label>

            <label className="reconciliation-filter-field">
              <span>Status</span>
              <select
                className="campaign-filter-select"
                value={filters.status}
                onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
              >
                <option value="todos">Todos</option>
                <option value="conciliada">Conciliadas</option>
                <option value="vencendo">Vencendo</option>
                <option value="vencida">Vencida</option>
                <option value="aguardando pagamento">Aguardando pagamento</option>
                <option value="conta a pagar">Conta a pagar</option>
                <option value="pendente de revisão">Pendente de revisão</option>
                <option value="com inconsistência">Com inconsistência</option>
              </select>
            </label>
          </div>
        </div>

        <div className="campaign-list-block reconciliation-list-block accountability-scroll-list reconciliation-scroll-list">
          {pending.length === 0 ? <div className="campaign-empty-state">Nenhuma transação pendente de conciliação.</div> : null}

          {pending.map((item) => (
            <article key={`${item.sourceType}-${item.id}`} className="campaign-list-item accountability-record-item reconciliation-record-item">
              <div className="reconciliation-record-main">
                <div className="reconciliation-record-copy">
                  <strong>{item.title || 'Lançamento sem título'}</strong>
                  <p>
                    <span>{item.sourceType === 'receita' ? 'Receita' : 'Despesa'}</span>
                    <span>•</span>
                    <span>{item.category || 'Sem categoria'}</span>
                    <span>•</span>
                    <span>{formatDate(item.date || item.updatedAt || item.createdAt)}</span>
                  </p>
                </div>

                <div className="reconciliation-record-details">
                  <div>
                    <small>Valor</small>
                    <strong><CurrencyValue valueCents={item.amountCents || 0} /></strong>
                  </div>
                  <div>
                    <small>Conta</small>
                    <strong>{item.accountName || 'Sem conta vinculada'}</strong>
                  </div>
                  <div>
                    <small>Status atual</small>
                    <StatusBadge status={item.status || 'pendente de revisão'} />
                  </div>
                </div>
              </div>

              <div className="reconciliation-record-actions">
                <button type="button" className="btn-primary" onClick={() => openModal(item)}>
                  <CheckCircle2 size={16} />
                  Conciliar
                </button>
              </div>
            </article>
          ))}
        </div>

        <div className="campaign-section-separator" />

        <div className="accountability-toolbar">
          <div className="campaign-note-card reconciliation-note-card">
            <strong>Conciliadas</strong>
            <p>Histórico das movimentações já conferidas com valor, referência bancária e data de conciliação.</p>
          </div>
        </div>

        <div className="campaign-list-block reconciliation-list-block accountability-scroll-list reconciliation-scroll-list">
          {reconciled.length === 0 ? <div className="campaign-empty-state">Nenhuma transação conciliada até o momento.</div> : null}

          {reconciled.map((item) => (
            <article key={`reconciled-${item.sourceType}-${item.id}`} className="campaign-list-item accountability-record-item reconciliation-record-item reconciliation-record-item-done">
              <div className="reconciliation-record-main">
                <div className="reconciliation-record-copy">
                  <strong>{item.title || 'Lançamento sem título'}</strong>
                  <p>
                    <span>{item.sourceType === 'receita' ? 'Receita' : 'Despesa'}</span>
                    <span>•</span>
                    <span>{item.category || 'Sem categoria'}</span>
                    <span>•</span>
                    <span>Conciliado em {formatDate(item.reconciliationDate || item.lastReconciledAt || item.updatedAt)}</span>
                  </p>
                </div>

                <div className="reconciliation-record-details">
                  <div>
                    <small>Valor conciliado</small>
                    <strong><CurrencyValue valueCents={item.reconciledAmountCents || item.amountCents || 0} /></strong>
                  </div>
                  <div>
                    <small>Referência bancária</small>
                    <strong>{item.reconciliationBankReference || item.accountName || 'Sem referência informada'}</strong>
                  </div>
                  <div>
                    <small>Status final</small>
                    <StatusBadge status={item.status || 'conciliada'} />
                  </div>
                </div>
              </div>

              <div className="reconciliation-record-actions">
                <button type="button" className="btn-secondary" onClick={() => openModal(item)}>
                  Revisar conciliação
                </button>
              </div>
            </article>
          ))}
        </div>
      </InsightPanel>

      {selectedItem ? (
        <div className="funnel-modal-backdrop dashboard-modal-backdrop" onClick={resetModal}>
          <div className="funnel-modal accountability-form-modal reconciliation-modal" onClick={(event) => event.stopPropagation()}>
            <div className="funnel-modal-header">
              <div>
                <h3>Conciliar movimentação</h3>
                <p>Confirme os dados do extrato e registre a situação final deste lançamento.</p>
              </div>
              <button type="button" className="accountability-modal-close" onClick={resetModal} aria-label="Fechar modal">
                <X size={18} />
              </button>
            </div>

            <div className="reconciliation-modal-highlight">
              <div className="reconciliation-modal-title">
                <span className={`reconciliation-source-pill ${selectedItem.sourceType}`}>{selectedItem.sourceType === 'receita' ? 'Receita' : 'Despesa'}</span>
                <strong>{selectedItem.title || 'Movimentação'}</strong>
              </div>
              <div className="reconciliation-modal-summary">
                <span><Wallet size={14} /> <CurrencyValue valueCents={selectedItem.amountCents || 0} /></span>
                <span>{selectedItem.accountName || 'Sem conta vinculada'}</span>
                <span>{formatDate(selectedItem.date || selectedItem.updatedAt || selectedItem.createdAt)}</span>
              </div>
            </div>

            <div className="campaign-filters-grid accountability-modal-grid">
              <label className="funnel-filter-field">
                <span>Data da conciliação</span>
                <input
                  type="date"
                  className="campaign-filter-select"
                  value={form.date}
                  onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
                />
              </label>

              <label className="funnel-filter-field">
                <span>Status final</span>
                <select
                  className="campaign-filter-select"
                  value={form.status}
                  onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
                >
                  <option value="conciliada">Conciliada</option>
                  <option value="com inconsistência">Com inconsistência</option>
                  <option value="pendente de revisão">Pendente de revisão</option>
                </select>
              </label>

              <label className="funnel-filter-field">
                <span>Valor conciliado</span>
                <input
                  type="text"
                  className="campaign-filter-select"
                  value={form.reconciledAmount}
                  placeholder="R$ 0,00"
                  onChange={(event) => setForm((prev) => ({ ...prev, reconciledAmount: formatCurrencyInput(event.target.value) }))}
                />
              </label>

              <label className="funnel-filter-field">
                <span>Referência bancária</span>
                <input
                  type="text"
                  className="campaign-filter-select"
                  value={form.bankReference}
                  placeholder="Ex.: Extrato BB 07/2026"
                  onChange={(event) => setForm((prev) => ({ ...prev, bankReference: event.target.value }))}
                />
              </label>

              <label className="funnel-filter-field full">
                <span>Observações da conciliação</span>
                <textarea
                  className="campaign-filter-select"
                  rows={4}
                  value={form.statementNote}
                  placeholder="Registre divergências, conferência com extrato, comprovantes ou observações do financeiro."
                  onChange={(event) => setForm((prev) => ({ ...prev, statementNote: event.target.value }))}
                />
              </label>
            </div>

            <div className="funnel-modal-actions">
              <button type="button" className="btn-secondary" onClick={resetModal}>
                Cancelar
              </button>
              <button type="button" className="btn-primary" disabled={isSaving} onClick={handleSave}>
                <Save size={16} />
                {isSaving ? 'Salvando...' : 'Salvar conciliação'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
