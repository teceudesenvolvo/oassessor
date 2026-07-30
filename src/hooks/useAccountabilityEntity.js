import { useCallback, useEffect, useState } from 'react';
import {
  listScopedCollection,
  softDeleteScopedRecord,
  upsertScopedRecord
} from '../services/accountabilityService';
import { logAuditEvent } from '../services/auditService';

export function useAccountabilityEntity({ user, scope, collectionKey, entity, transformSave, onMutationComplete }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [records, setRecords] = useState([]);

  const reload = useCallback(async () => {
    if (!scope?.adminId) return;
    setLoading(true);
    try {
      const data = await listScopedCollection(collectionKey, scope);
      setRecords(data);
    } finally {
      setLoading(false);
    }
  }, [collectionKey, scope]);

  useEffect(() => {
    reload();
  }, [reload]);

  const saveRecord = useCallback(async (payload, recordId = null) => {
    if (!scope?.adminId) return;
    setSaving(true);
    try {
      const finalPayload = transformSave ? transformSave(payload) : payload;
      const savedRecordId = await upsertScopedRecord(collectionKey, finalPayload, scope, user, recordId);
      await logAuditEvent({
        user,
        adminId: scope.adminId,
        action: recordId ? 'update' : 'create',
        entity,
        entityId: savedRecordId,
        entityLabel: finalPayload.title || finalPayload.description || entity,
        details: {
          targetName: finalPayload.title || finalPayload.description || entity,
          changes: [recordId ? `${collectionKey}: atualização` : collectionKey]
        }
      });
      await reload();
      if (onMutationComplete) {
        await onMutationComplete();
      }
    } finally {
      setSaving(false);
    }
  }, [collectionKey, entity, onMutationComplete, reload, scope, transformSave, user]);

  const deleteRecord = useCallback(async (recordId, reason) => {
    if (!scope?.adminId) return;
    setSaving(true);
    try {
      await softDeleteScopedRecord(collectionKey, recordId, reason, scope, user);
      await logAuditEvent({
        user,
        adminId: scope.adminId,
        action: 'delete',
        entity,
        entityId: recordId,
        entityLabel: entity,
        details: {
          targetName: entity,
          changes: [reason || 'arquivamento lógico']
        }
      });
      await reload();
      if (onMutationComplete) {
        await onMutationComplete();
      }
    } finally {
      setSaving(false);
    }
  }, [collectionKey, entity, onMutationComplete, reload, scope, user]);

  return {
    loading,
    saving,
    records,
    saveRecord,
    deleteRecord,
    reload
  };
}
