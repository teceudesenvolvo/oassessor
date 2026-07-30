import React from 'react';
import { useOutletContext } from 'react-router-dom';
import AccountabilityEntityCenter from '../../../components/accountability/AccountabilityEntityCenter';
import { useAccountabilityEntity } from '../../../hooks/useAccountabilityEntity';

export default function BudgetTab() {
  const { scope, user, reload } = useOutletContext();
  const { records, saving, saveRecord, deleteRecord } = useAccountabilityEntity({
    user,
    scope,
    collectionKey: 'budget',
    entity: 'prestacao_orcamento',
    onMutationComplete: reload,
    transformSave: (payload) => ({
      title: payload.title || payload.category || 'Orçamento',
      category: payload.category || 'categoria geral',
      plannedAmountCents: Number(payload.plannedAmountCents || 0),
      description: payload.description || '',
      status: payload.status || 'planejado'
    })
  });

  return (
    <AccountabilityEntityCenter
      title="Orçamento"
      subtitle="Planejado versus realizado por categoria e frente de gasto"
      emptyText="Nenhum item de orçamento cadastrado."
      records={records}
      saving={saving}
      onSave={saveRecord}
      onDelete={deleteRecord}
      initialForm={{ title: '', category: '', plannedAmountCents: '', description: '', status: 'planejado' }}
      fields={[
        { name: 'title', label: 'Nome do item' },
        { name: 'category', label: 'Categoria' },
        { name: 'plannedAmountCents', label: 'Valor planejado (centavos)', type: 'number' },
        { name: 'status', label: 'Status' },
        { name: 'description', label: 'Descrição', full: true }
      ]}
    />
  );
}
