import React from 'react';
import { useOutletContext } from 'react-router-dom';
import AccountabilityEntityCenter from '../../../components/accountability/AccountabilityEntityCenter';
import { useAccountabilityEntity } from '../../../hooks/useAccountabilityEntity';

const STATUS_OPTIONS = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'inativo', label: 'Inativo' },
  { value: 'bloqueado', label: 'Bloqueado' }
];

const SUPPLIER_TYPE_OPTIONS = [
  { value: 'pessoa juridica', label: 'Pessoa jurídica' },
  { value: 'pessoa fisica', label: 'Pessoa física' },
  { value: 'prestador autonomo', label: 'Prestador autônomo' }
];

export default function CatalogsTab() {
  const { scope, user } = useOutletContext();
  const { records, saving, saveRecord, deleteRecord } = useAccountabilityEntity({
    user,
    scope,
    collectionKey: 'catalogs',
    entity: 'prestacao_fornecedor',
    transformSave: (payload) => ({
      title: payload.name || payload.title || 'Fornecedor',
      name: payload.name || '',
      legalName: payload.legalName || '',
      document: payload.document || '',
      category: 'fornecedor',
      supplierType: payload.supplierType || 'pessoa juridica',
      email: payload.email || '',
      phone: payload.phone || '',
      city: payload.city || '',
      state: payload.state || '',
      description: payload.description || '',
      status: payload.status || 'ativo'
    })
  });

  return (
    <AccountabilityEntityCenter
      title="Fornecedores"
      subtitle="Cadastre prestadores e fornecedores para vincular despesas com consistência operacional"
      emptyText="Nenhum fornecedor cadastrado."
      records={records}
      saving={saving}
      onSave={saveRecord}
      onDelete={deleteRecord}
      initialForm={{
        name: '',
        legalName: '',
        document: '',
        supplierType: 'pessoa juridica',
        email: '',
        phone: '',
        city: '',
        state: '',
        description: '',
        status: 'ativo'
      }}
      fields={[
        { name: 'name', label: 'Nome fantasia / exibição', placeholder: 'Ex.: Gráfica Fortaleza' },
        { name: 'legalName', label: 'Razão social / nome completo', placeholder: 'Nome jurídico do fornecedor' },
        { name: 'document', label: 'CPF / CNPJ', placeholder: 'Documento do fornecedor' },
        { name: 'supplierType', label: 'Tipo de fornecedor', type: 'select', options: SUPPLIER_TYPE_OPTIONS },
        { name: 'email', label: 'E-mail', type: 'email', placeholder: 'contato@fornecedor.com.br' },
        { name: 'phone', label: 'Telefone / WhatsApp', placeholder: '(85) 99999-9999' },
        { name: 'city', label: 'Município', placeholder: 'Cidade base' },
        { name: 'state', label: 'UF', placeholder: 'CE' },
        { name: 'description', label: 'Observações', type: 'textarea', full: true, placeholder: 'Serviços prestados, condição de pagamento, observações fiscais...' },
        { name: 'status', label: 'Status', type: 'select', options: STATUS_OPTIONS }
      ]}
    />
  );
}
