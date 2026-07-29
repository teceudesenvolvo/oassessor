import { useEffect, useMemo, useState } from 'react';
import { equalTo, get, onValue, orderByChild, query, ref } from 'firebase/database';
import { database } from '../firebaseConfig';

export const AUDIT_ACTION_OPTIONS = [
  { value: 'all', label: 'Todas as ações' },
  { value: 'create', label: 'Criação' },
  { value: 'update', label: 'Edição' },
  { value: 'delete', label: 'Exclusão' },
  { value: 'export', label: 'Exportação' },
  { value: 'permission_change', label: 'Alteração de permissões' }
];

const formatActionLabel = (value) => AUDIT_ACTION_OPTIONS.find((item) => item.value === value)?.label || value;

export function useAuditCenter(user) {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [adminId, setAdminId] = useState(null);

  useEffect(() => {
    if (!user) return;

    let active = true;
    let unsubscribeRef = null;

    const load = async () => {
      try {
        setLoading(true);

        let resolvedAdminId = user.uid;
        let currentUserType = null;

        if (user.email) {
          const assessoresRef = ref(database, 'assessores');
          const qEmail = query(assessoresRef, orderByChild('email'), equalTo(user.email));
          const snapshotEmail = await get(qEmail);
          if (snapshotEmail.exists()) currentUserType = 'assessor';
        }

        const usersRef = ref(database, 'users');
        const qUser = query(usersRef, orderByChild('userId'), equalTo(user.uid));
        const userSnapshot = await get(qUser);
        if (userSnapshot.exists()) {
          const userData = Object.values(userSnapshot.val())[0];
          currentUserType = userData.tipoUser || currentUserType;
          if (userData.adminId) resolvedAdminId = userData.adminId;
        }

        const effectiveAdminId = currentUserType === 'admin' ? user.uid : resolvedAdminId;
        if (!active) return;
        setAdminId(effectiveAdminId);

        const logsQuery = query(ref(database, 'auditoria'), orderByChild('adminId'), equalTo(effectiveAdminId));
        unsubscribeRef = onValue(logsQuery, (snapshot) => {
          if (!active) return;
          const list = snapshot.exists()
            ? Object.entries(snapshot.val())
                .map(([id, value]) => ({
                  id,
                  ...value,
                  actionLabel: formatActionLabel(value.action)
                }))
                .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
            : [];
          setLogs(list);
          setLoading(false);
        });
      } catch (error) {
        console.error('Erro ao carregar auditoria:', error);
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
      if (typeof unsubscribeRef === 'function') unsubscribeRef();
    };
  }, [user]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      total: logs.length,
      exports: logs.filter((item) => item.action === 'export').length,
      deletions: logs.filter((item) => item.action === 'delete').length,
      permissionChanges: logs.filter((item) => item.action === 'permission_change').length,
      today: logs.filter((item) => String(item.createdAt || '').slice(0, 10) === today).length
    };
  }, [logs]);

  return {
    loading,
    logs,
    stats,
    adminId
  };
}
