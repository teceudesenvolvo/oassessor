import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { equalTo, get, orderByChild, query, ref } from '../../../services/firestoreDatabase';
import { push, set } from '../../../services/firestoreDatabase';
import AccountabilityEntityCenter from '../../../components/accountability/AccountabilityEntityCenter';
import { useAccountabilityEntity } from '../../../hooks/useAccountabilityEntity';
import { upsertScopedRecord, listScopedCollection } from '../../../services/accountabilityService';
import { logAuditEvent } from '../../../services/auditService';
import { database } from '../../../firebaseConfig';

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const parseCurrencyToCents = (value) => {
  if (typeof value === 'number') return Math.round(value * 100);
  const digits = String(value || '').replace(/\D/g, '');
  return Number(digits || 0);
};

const formatCurrencyInput = (value) => {
  const cents = parseCurrencyToCents(value);
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
};

const STATUS_OPTIONS = [
  { value: 'conta a pagar', label: 'Conta a pagar' },
  { value: 'aguardando pagamento', label: 'Aguardando pagamento' },
  { value: 'paga', label: 'Paga' },
  { value: 'conciliada', label: 'Conciliada' },
  { value: 'vencendo', label: 'Vencendo' },
  { value: 'vencida', label: 'Vencida' },
  { value: 'pendente de revisão', label: 'Pendente de revisão' },
  { value: 'com inconsistência', label: 'Com inconsistência' }
];

const EXPENSE_TYPE_OPTIONS = [
  { value: 'fornecedor', label: 'Fornecedor' },
  { value: 'pessoal', label: 'Pessoal' },
  { value: 'operacional', label: 'Operacional' },
  { value: 'evento', label: 'Evento' },
  { value: 'midia', label: 'Mídia' },
  { value: 'deslocamento', label: 'Deslocamento' }
];

const CATEGORY_OPTIONS = [
  { value: 'serviços', label: 'Serviços' },
  { value: 'material gráfico', label: 'Material gráfico' },
  { value: 'combustível', label: 'Combustível' },
  { value: 'alimentação', label: 'Alimentação' },
  { value: 'locação', label: 'Locação' },
  { value: 'pessoal', label: 'Pessoal' },
  { value: 'publicidade', label: 'Publicidade' },
  { value: 'jurídico', label: 'Jurídico' },
  { value: 'contábil', label: 'Contábil' },
  { value: 'outros', label: 'Outros' }
];

const getPayableStatus = (payload) => {
  if (!payload.isPayable || !payload.dueDate) return payload.status || 'aguardando pagamento';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(payload.dueDate);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due - today) / 86400000);
  if (diffDays < 0) return 'vencida';
  if (diffDays <= 3) return 'vencendo';
  return payload.status === 'paga' || payload.status === 'conciliada' ? payload.status : 'conta a pagar';
};

export default function ExpensesTab() {
  const { scope, user, reload } = useOutletContext();
  const [bankAccounts, setBankAccounts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);

  const { records, saving, saveRecord, deleteRecord } = useAccountabilityEntity({
    user,
    scope,
    collectionKey: 'expenses',
    entity: 'prestacao_despesa',
    onMutationComplete: reload,
    transformSave: (payload) => ({
      title: payload.title || payload.description || 'Despesa',
      description: payload.description || '',
      expenseType: payload.expenseType || 'fornecedor',
      category: payload.category || 'serviços',
      amountCents: parseCurrencyToCents(payload.amountCents),
      date: payload.date || new Date().toISOString().slice(0, 10),
      dueDate: payload.dueDate || '',
      isPayable: Boolean(payload.isPayable),
      supplierId: payload.supplierId || '',
      supplierName: payload.supplierName || '',
      teamMemberId: payload.teamMemberId || '',
      teamMemberName: payload.teamMemberName || '',
      accountId: payload.accountId || '',
      accountName: payload.accountName || '',
      documentId: payload.documentId || '',
      documentName: payload.documentName || '',
      status: getPayableStatus(payload)
    })
  });

  useEffect(() => {
    if (!scope?.adminId) return;

    const loadDependencies = async () => {
      const [accounts, catalogs] = await Promise.all([
        listScopedCollection('bankAccounts', scope),
        listScopedCollection('catalogs', scope)
      ]);

      const assessoresSnapshot = await get(query(ref(database, 'assessores'), orderByChild('adminId'), equalTo(scope.adminId)));
      const members = assessoresSnapshot.exists()
        ? Object.entries(assessoresSnapshot.val()).map(([id, value]) => ({
            id,
            name: value.nome || value.name || value.email || 'Membro da equipe'
          }))
        : [];

      setBankAccounts(accounts);
      setSuppliers(catalogs.filter((item) => (item.category || '') === 'fornecedor'));
      setTeamMembers(members);
    };

    loadDependencies();
  }, [scope]);

  const supplierOptions = useMemo(
    () => [{ value: '', label: suppliers.length ? 'Selecione um fornecedor' : 'Cadastre um fornecedor primeiro' }].concat(
      suppliers.map((item) => ({ value: item.id, label: item.name || item.title || 'Fornecedor' }))
    ),
    [suppliers]
  );

  const teamOptions = useMemo(
    () => [{ value: '', label: teamMembers.length ? 'Selecione um membro da equipe' : 'Nenhum membro cadastrado' }].concat(
      teamMembers.map((item) => ({ value: item.id, label: item.name }))
    ),
    [teamMembers]
  );

  const accountOptions = useMemo(
    () => [{ value: '', label: bankAccounts.length ? 'Selecione uma conta bancária' : 'Cadastre uma conta bancária primeiro' }].concat(
      bankAccounts.map((item) => ({ value: item.id, label: item.accountName || `${item.bankName || 'Conta'} • ${item.accountNumber || ''}` }))
    ),
    [bankAccounts]
  );

  const handleSaveExpense = async (payload, recordId = null) => {
    let documentId = payload.documentId || '';
    let documentName = payload.documentName || '';

    const selectedSupplier = suppliers.find((item) => item.id === payload.supplierId);
    const selectedTeamMember = teamMembers.find((item) => item.id === payload.teamMemberId);
    const selectedAccount = bankAccounts.find((item) => item.id === payload.accountId);

    if (payload.invoiceFile) {
      const fileContent = await readFileAsDataUrl(payload.invoiceFile);
      documentName = payload.invoiceFile.name;
      documentId = await upsertScopedRecord(
        'documents',
        {
          title: `Nota fiscal - ${payload.title || selectedSupplier?.name || selectedTeamMember?.name || 'Despesa'}`,
          documentName,
          category: 'nota fiscal',
          description: payload.description || 'Documento fiscal vinculado à despesa.',
          documentUrl: fileContent,
          mimeType: payload.invoiceFile.type || 'application/octet-stream',
          fileSize: payload.invoiceFile.size || 0,
          date: payload.date || new Date().toISOString().slice(0, 10),
          status: 'recebido'
        },
        scope,
        user
      );

      await logAuditEvent({
        user,
        adminId: scope.adminId,
        action: 'create',
        entity: 'prestacao_documento',
        entityId: documentId,
        entityLabel: documentName,
        details: {
          targetName: documentName,
          changes: ['nota fiscal anexada']
        }
      });
    }

    const finalStatus = getPayableStatus(payload);
    await saveRecord({
      ...payload,
      supplierId: payload.expenseType === 'fornecedor' ? payload.supplierId : '',
      supplierName: payload.expenseType === 'fornecedor' ? (selectedSupplier?.name || '') : '',
      teamMemberId: payload.expenseType === 'pessoal' ? payload.teamMemberId : '',
      teamMemberName: payload.expenseType === 'pessoal' ? (selectedTeamMember?.name || '') : '',
      accountName: selectedAccount?.accountName || (selectedAccount ? `${selectedAccount.bankName || 'Conta'} • ${selectedAccount.accountNumber || ''}` : ''),
      documentId,
      documentName,
      status: finalStatus
    }, recordId);

    if (payload.isPayable && payload.dueDate && ['conta a pagar', 'vencendo', 'vencida'].includes(finalStatus)) {
      const notifRef = push(ref(database, 'notificacoes'));
      await set(notifRef, {
        adminId: scope.adminId,
        userId: user.uid,
        type: finalStatus === 'vencida' ? 'alert' : 'info',
        read: false,
        title: finalStatus === 'vencida' ? 'Conta vencida' : 'Conta a pagar com vencimento',
        description: `${payload.title || 'Despesa'} vence em ${payload.dueDate}. Status atual: ${finalStatus}.`,
        createdAt: new Date().toISOString(),
        source: 'prestacao_despesa'
      });
    }
  };

  return (
    <AccountabilityEntityCenter
      title="Despesas"
      subtitle="Saídas financeiras com rastreabilidade, vínculo operacional e justificativa fiscal"
      emptyText="Nenhuma despesa registrada."
      records={records}
      saving={saving}
      onSave={handleSaveExpense}
      onDelete={deleteRecord}
      initialForm={{
        title: '',
        description: '',
        expenseType: 'fornecedor',
        category: 'serviços',
        amountCents: '',
        date: '',
        dueDate: '',
        isPayable: false,
        supplierId: '',
        supplierName: '',
        teamMemberId: '',
        teamMemberName: '',
        accountId: '',
        accountName: '',
        status: 'aguardando pagamento',
        invoiceFile: null
      }}
      fields={[
        { name: 'title', label: 'Descrição da despesa', placeholder: 'Ex.: Impressão de material gráfico' },
        {
          name: 'expenseType',
          label: 'Tipo de despesa',
          type: 'select',
          options: EXPENSE_TYPE_OPTIONS,
          onChange: (event, prev) => ({
            ...prev,
            expenseType: event.target.value,
            supplierId: event.target.value === 'fornecedor' ? prev.supplierId : '',
            teamMemberId: event.target.value === 'pessoal' ? prev.teamMemberId : ''
          })
        },
        { name: 'category', label: 'Categoria', type: 'select', options: CATEGORY_OPTIONS },
        {
          name: 'amountCents',
          label: 'Valor',
          placeholder: 'R$ 0,00',
          helper: 'O valor é salvo em centavos automaticamente.',
          onChange: (event, prev) => ({ ...prev, amountCents: formatCurrencyInput(event.target.value) })
        },
        { name: 'date', label: 'Data', type: 'date' },
        {
          name: 'isPayable',
          label: 'É conta a pagar?',
          type: 'select',
          options: [
            { value: false, label: 'Não' },
            { value: true, label: 'Sim' }
          ],
          onChange: (event, prev) => ({ ...prev, isPayable: event.target.value === 'true' })
        },
        { name: 'dueDate', label: 'Vencimento', type: 'date', hidden: (form) => !form.isPayable, helper: 'Obrigatório para monitorar contas a pagar.' },
        { name: 'accountId', label: 'Conta bancária', type: 'select', options: accountOptions, helper: 'A conta precisa estar cadastrada na aba Contas Bancárias.' },
        {
          name: 'supplierId',
          label: 'Fornecedor',
          type: 'select',
          options: supplierOptions,
          hidden: (form) => form.expenseType === 'pessoal',
          helper: 'Selecione um fornecedor cadastrado na aba Fornecedores.'
        },
        {
          name: 'teamMemberId',
          label: 'Membro da equipe',
          type: 'select',
          options: teamOptions,
          hidden: (form) => form.expenseType !== 'pessoal',
          helper: 'Obrigatório quando a despesa for do tipo pessoal.'
        },
        { name: 'status', label: 'Status', type: 'select', options: STATUS_OPTIONS },
        { name: 'description', label: 'Observações', type: 'textarea', full: true, placeholder: 'Detalhes da contratação, contexto da despesa e observações contábeis.' },
        { name: 'invoiceFile', label: 'Anexar nota fiscal', type: 'file', full: true, accept: '.pdf,.png,.jpg,.jpeg,.webp' }
      ]}
      renderSummary={(items) => {
        const total = items.reduce((sum, item) => sum + Number(item.amountCents || 0), 0);
        const pending = items.filter((item) => item.status === 'aguardando pagamento').length;
        return (
          <div className="campaign-metrics-grid" style={{ marginBottom: 16 }}>
            <div className="campaign-metric-card">
              <strong>Total lançado</strong>
              <p>{(total / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            </div>
            <div className="campaign-metric-card">
              <strong>Aguardando pagamento</strong>
              <p>{pending}</p>
            </div>
          </div>
        );
      }}
    />
  );
}
