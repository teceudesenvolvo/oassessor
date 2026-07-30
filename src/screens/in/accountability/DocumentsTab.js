import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { push, ref, set } from '../../../services/firestoreDatabase';
import { database } from '../../../firebaseConfig';
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

const DUE_STATUS_OPTIONS = [
  { value: 'recebido', label: 'Recebido' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'validado', label: 'Validado' },
  { value: 'vencendo', label: 'Vencendo' },
  { value: 'vencido', label: 'Vencido' },
  { value: 'com inconsistência', label: 'Com inconsistência' }
];

const getDueStatus = (dueDate, fallback = 'recebido') => {
  if (!dueDate) return fallback;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due - today) / 86400000);
  if (diffDays < 0) return 'vencido';
  if (diffDays <= 3) return 'vencendo';
  return fallback;
};

export default function DocumentsTab() {
  const { scope, user, reload } = useOutletContext();
  const { records, saving, saveRecord, deleteRecord } = useAccountabilityEntity({
    user,
    scope,
    collectionKey: 'documents',
    entity: 'prestacao_documento',
    onMutationComplete: reload,
    transformSave: (payload) => ({
      title: payload.title || payload.documentName || 'Documento',
      documentName: payload.documentName || '',
      category: payload.category || 'comprovante',
      description: payload.description || '',
      documentUrl: payload.documentUrl || '',
      mimeType: payload.mimeType || '',
      fileSize: Number(payload.fileSize || 0),
      date: payload.date || new Date().toISOString().slice(0, 10),
      dueDate: payload.dueDate || '',
      status: getDueStatus(payload.dueDate, payload.status || 'recebido')
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

    const finalStatus = getDueStatus(payload.dueDate, payload.status || 'recebido');

    await saveRecord({
      ...payload,
      documentUrl,
      documentName: documentName || payload.title || 'Documento',
      mimeType,
      fileSize,
      status: finalStatus
    }, recordId);

    if (payload.dueDate && !recordId && ['vencendo', 'vencido'].includes(finalStatus)) {
      const notifRef = push(ref(database, 'notificacoes'));
      await set(notifRef, {
        adminId: scope.adminId,
        userId: user.uid,
        type: finalStatus === 'vencido' ? 'alert' : 'info',
        read: false,
        title: finalStatus === 'vencido' ? 'Documento vencido' : 'Documento próximo do vencimento',
        description: `${documentName || payload.title || 'Documento'} com vencimento em ${payload.dueDate}.`,
        createdAt: new Date().toISOString(),
        source: 'prestacao_documento',
        sourceId: recordId || notifRef.key
      });
    }
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
      initialForm={{ title: '', documentName: '', category: 'comprovante', description: '', documentUrl: '', date: '', dueDate: '', status: 'recebido', documentFile: null }}
      fields={[
        { name: 'title', label: 'Título', placeholder: 'Ex.: Extrato bancário de julho' },
        { name: 'category', label: 'Tipo', type: 'select', options: CATEGORY_OPTIONS },
        { name: 'documentFile', label: 'Anexar arquivo', type: 'file', full: true, accept: '.pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.csv' },
        { name: 'documentUrl', label: 'Link / caminho', placeholder: 'Opcional quando houver upload direto' },
        { name: 'date', label: 'Data', type: 'date' },
        { name: 'dueDate', label: 'Vencimento', type: 'date', helper: 'Use quando o documento exigir controle de prazo.' },
        { name: 'status', label: 'Status', type: 'select', options: DUE_STATUS_OPTIONS },
        { name: 'description', label: 'Descrição', type: 'textarea', full: true, placeholder: 'Contexto do arquivo, origem e observações de conferência.' }
      ]}
    />
  );
}
