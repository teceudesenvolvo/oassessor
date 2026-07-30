import React from 'react';
import { useOutletContext } from 'react-router-dom';
import AccountabilityEntityCenter from '../../../components/accountability/AccountabilityEntityCenter';
import { useAccountabilityEntity } from '../../../hooks/useAccountabilityEntity';

const parseCurrencyToCents = (value) => Number(String(value || '').replace(/\D/g, '') || 0);
const formatCurrencyInput = (value) => ((parseCurrencyToCents(value) || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const ACCOUNT_TYPE_OPTIONS = [
  { value: 'corrente', label: 'Conta corrente' },
  { value: 'poupanca', label: 'Conta poupança' },
  { value: 'pagamento', label: 'Conta pagamento' }
];

const PURPOSE_OPTIONS = [
  { value: 'doações', label: 'Doações' },
  { value: 'movimentação geral', label: 'Movimentação geral' },
  { value: 'fundo partidário', label: 'Fundo partidário' },
  { value: 'fundo eleitoral', label: 'Fundo eleitoral' }
];

const STATUS_OPTIONS = [
  { value: 'ativa', label: 'Ativa' },
  { value: 'em conciliação', label: 'Em conciliação' },
  { value: 'encerrada', label: 'Encerrada' },
  { value: 'bloqueada', label: 'Bloqueada' }
];

export default function BankAccountsTab() {
  const { scope, user } = useOutletContext();
  const { records, saving, saveRecord, deleteRecord } = useAccountabilityEntity({
    user,
    scope,
    collectionKey: 'bankAccounts',
    entity: 'prestacao_conta_bancaria',
    transformSave: (payload) => ({
      bankName: payload.bankName || '',
      bankCode: payload.bankCode || '',
      accountName: `${payload.bankName || 'Conta'} • ${payload.accountNumber || ''}`,
      agency: payload.agency || '',
      accountNumber: payload.accountNumber || '',
      accountType: payload.accountType || 'corrente',
      purpose: payload.purpose || 'doações',
      initialBalanceCents: parseCurrencyToCents(payload.initialBalanceCents),
      reportedBalanceCents: parseCurrencyToCents(payload.reportedBalanceCents),
      status: payload.status || 'ativa'
    })
  });

  return (
    <AccountabilityEntityCenter
      title="Contas Bancárias"
      subtitle="Gerencie contas, saldos e finalidade de uso na prestação"
      emptyText="Nenhuma conta bancária cadastrada."
      records={records}
      saving={saving}
      onSave={saveRecord}
      onDelete={deleteRecord}
      initialForm={{ bankName: '', bankCode: '', agency: '', accountNumber: '', accountType: 'corrente', purpose: 'doações', initialBalanceCents: '', reportedBalanceCents: '', status: 'ativa' }}
      fields={[
        { name: 'bankName', label: 'Banco', placeholder: 'Ex.: Caixa Econômica Federal' },
        { name: 'bankCode', label: 'Código do banco', placeholder: '104' },
        { name: 'agency', label: 'Agência', placeholder: '0001' },
        { name: 'accountNumber', label: 'Número da conta', placeholder: '12345-6' },
        { name: 'accountType', label: 'Tipo de conta', type: 'select', options: ACCOUNT_TYPE_OPTIONS },
        { name: 'purpose', label: 'Finalidade', type: 'select', options: PURPOSE_OPTIONS },
        { name: 'initialBalanceCents', label: 'Saldo inicial', placeholder: 'R$ 0,00', onChange: (event, prev) => ({ ...prev, initialBalanceCents: formatCurrencyInput(event.target.value) }) },
        { name: 'reportedBalanceCents', label: 'Saldo informado', placeholder: 'R$ 0,00', onChange: (event, prev) => ({ ...prev, reportedBalanceCents: formatCurrencyInput(event.target.value) }) },
        { name: 'status', label: 'Status', type: 'select', options: STATUS_OPTIONS }
      ]}
    />
  );
}
