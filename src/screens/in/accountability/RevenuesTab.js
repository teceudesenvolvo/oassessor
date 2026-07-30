import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import AccountabilityEntityCenter from '../../../components/accountability/AccountabilityEntityCenter';
import { useAccountabilityEntity } from '../../../hooks/useAccountabilityEntity';
import { listScopedCollection } from '../../../services/accountabilityService';

const parseCurrencyToCents = (value) => Number(String(value || '').replace(/\D/g, '') || 0);
const formatCurrencyInput = (value) => ((parseCurrencyToCents(value) || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const STATUS_OPTIONS = [
  { value: 'pendente de revisão', label: 'Pendente de revisão' },
  { value: 'confirmada', label: 'Confirmada' },
  { value: 'conciliada', label: 'Conciliada' },
  { value: 'com inconsistência', label: 'Com inconsistência' }
];

const REVENUE_TYPE_OPTIONS = [
  { value: 'doação financeira', label: 'Doação financeira' },
  { value: 'doação estimável', label: 'Doação estimável' },
  { value: 'fundo partidário', label: 'Fundo partidário' },
  { value: 'fundo eleitoral', label: 'Fundo eleitoral' },
  { value: 'recursos próprios', label: 'Recursos próprios' }
];

export default function RevenuesTab() {
  const { scope, user, reload } = useOutletContext();
  const [bankAccounts, setBankAccounts] = useState([]);
  const { records, saving, saveRecord, deleteRecord } = useAccountabilityEntity({
    user,
    scope,
    collectionKey: 'revenues',
    entity: 'prestacao_receita',
    onMutationComplete: reload,
    transformSave: (payload) => ({
      title: payload.title || payload.description || 'Receita',
      description: payload.description || '',
      category: payload.category || 'doação financeira',
      amountCents: parseCurrencyToCents(payload.amountCents),
      date: payload.date || new Date().toISOString().slice(0, 10),
      accountId: payload.accountId || '',
      accountName: payload.accountName || '',
      donorName: payload.donorName || '',
      documentId: payload.documentId || '',
      status: payload.status || 'pendente de revisão'
    })
  });

  useEffect(() => {
    if (!scope?.adminId) return;
    listScopedCollection('bankAccounts', scope).then(setBankAccounts).catch(() => setBankAccounts([]));
  }, [scope]);

  const accountOptions = useMemo(
    () => [{ value: '', label: bankAccounts.length ? 'Selecione uma conta bancária' : 'Cadastre uma conta bancária primeiro' }].concat(
      bankAccounts.map((item) => ({ value: item.id, label: item.accountName || `${item.bankName || 'Conta'} • ${item.accountNumber || ''}` }))
    ),
    [bankAccounts]
  );

  const handleSaveRevenue = async (payload, recordId = null) => {
    const selectedAccount = bankAccounts.find((item) => item.id === payload.accountId);
    await saveRecord({
      ...payload,
      accountName: selectedAccount?.accountName || (selectedAccount ? `${selectedAccount.bankName || 'Conta'} • ${selectedAccount.accountNumber || ''}` : '')
    }, recordId);
  };

  return (
    <AccountabilityEntityCenter
      title="Receitas"
      subtitle="Entradas financeiras com status, origem e conta vinculada"
      emptyText="Nenhuma receita registrada."
      records={records}
      saving={saving}
      onSave={handleSaveRevenue}
      onDelete={deleteRecord}
      initialForm={{ title: '', description: '', category: 'doação financeira', amountCents: '', date: '', donorName: '', accountId: '', accountName: '', status: 'pendente de revisão' }}
      fields={[
        { name: 'title', label: 'Descrição', placeholder: 'Ex.: Doação recebida em evento' },
        { name: 'category', label: 'Tipo', type: 'select', options: REVENUE_TYPE_OPTIONS },
        { name: 'amountCents', label: 'Valor', placeholder: 'R$ 0,00', onChange: (event, prev) => ({ ...prev, amountCents: formatCurrencyInput(event.target.value) }) },
        { name: 'date', label: 'Data', type: 'date' },
        { name: 'donorName', label: 'Doador / origem', placeholder: 'Nome da origem do recurso' },
        { name: 'accountId', label: 'Conta bancária', type: 'select', options: accountOptions },
        { name: 'status', label: 'Status', type: 'select', options: STATUS_OPTIONS },
        { name: 'description', label: 'Observações', type: 'textarea', full: true, placeholder: 'Detalhes da receita, comprovantes e contexto do lançamento.' }
      ]}
    />
  );
}
