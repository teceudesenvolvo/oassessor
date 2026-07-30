import React from 'react';
import { useOutletContext } from 'react-router-dom';
import AccountabilityEntityCenter from '../../../components/accountability/AccountabilityEntityCenter';
import { useAccountabilityEntity } from '../../../hooks/useAccountabilityEntity';

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const STATUS_OPTIONS = [
  { value: 'recebido', label: 'Recebido' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'validado', label: 'Validado' },
  { value: 'com inconsistência', label: 'Com inconsistência' }
];

const CATEGORY_OPTIONS = [
  { value: 'comprovante', label: 'Comprovante' },
  { value: 'nota fiscal', label: 'Nota fiscal' },
  { value: 'extrato bancário', label: 'Extrato bancário' },
  { value: 'contrato', label: 'Contrato' },
  { value: 'recibo', label: 'Recibo' },
  { value: 'outros', label: 'Outros' }
];

export default function DocumentsTab() {
  const { scope, user } = useOutletContext();
  const { records, saving, saveRecord, deleteRecord } = useAccountabilityEntity({
    user,
    scope,
    collectionKey: 'documents',
    entity: 'prestacao_documento',
    transformSave: (payload) => ({
      title: payload.title || payload.documentName || 'Documento',
      documentName: payload.documentName || '',
      category: payload.category || 'comprovante',
      description: payload.description || '',
      documentUrl: payload.documentUrl || '',
      mimeType: payload.mimeType || '',
      fileSize: Number(payload.fileSize || 0),
      date: payload.date || new Date().toISOString().slice(0, 10),
      status: payload.status || 'recebido'
    })
  });

  const handleSaveDocument = async (payload, recordId = null) => {
    let documentUrl = payload.documentUrl || '';
    let documentName = payload.documentName || '';
    let mimeType = payload.mimeType || '';
    let fileSize = payload.fileSize || 0;

    if (payload.documentFile) {
      documentUrl = await readFileAsDataUrl(payload.documentFile);
      documentName = payload.documentFile.name;
      mimeType = payload.documentFile.type || 'application/octet-stream';
      fileSize = payload.documentFile.size || 0;
    }

    await saveRecord({
      ...payload,
      documentUrl,
      documentName: documentName || payload.title || 'Documento',
      mimeType,
      fileSize
    }, recordId);
  };

  return (
    <AccountabilityEntityCenter
      title="Documentos"
      subtitle="Indexe comprovantes, anexos e evidências operacionais com upload direto"
      emptyText="Nenhum documento registrado."
      records={records}
      saving={saving}
      onSave={handleSaveDocument}
      onDelete={deleteRecord}
      initialForm={{ title: '', documentName: '', category: 'comprovante', description: '', documentUrl: '', date: '', status: 'recebido', documentFile: null }}
      fields={[
        { name: 'title', label: 'Título', placeholder: 'Ex.: Extrato bancário de julho' },
        { name: 'category', label: 'Tipo', type: 'select', options: CATEGORY_OPTIONS },
        { name: 'documentFile', label: 'Anexar arquivo', type: 'file', full: true, accept: '.pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.csv' },
        { name: 'documentUrl', label: 'Link / caminho', placeholder: 'Opcional quando houver upload direto' },
        { name: 'date', label: 'Data', type: 'date' },
        { name: 'status', label: 'Status', type: 'select', options: STATUS_OPTIONS },
        { name: 'description', label: 'Descrição', type: 'textarea', full: true, placeholder: 'Contexto do arquivo, origem e observações de conferência.' }
      ]}
    />
  );
}
