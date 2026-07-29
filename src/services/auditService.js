import { push, ref, set } from 'firebase/database';
import { database } from '../firebaseConfig';

const sanitizeDetails = (details = {}) => {
  try {
    return JSON.parse(JSON.stringify(details));
  } catch (error) {
    return {
      fallback: true,
      message: 'Não foi possível serializar os detalhes do evento.'
    };
  }
};

export async function logAuditEvent({
  user,
  adminId,
  action,
  entity,
  entityId = '',
  entityLabel = '',
  details = {}
}) {
  if (!user?.uid || !action || !entity) return null;

  const auditRef = push(ref(database, 'auditoria'));
  const payload = {
    action,
    entity,
    entityId,
    entityLabel,
    adminId: adminId || user.uid,
    actorId: user.uid,
    actorEmail: user.email || '',
    createdAt: new Date().toISOString(),
    details: sanitizeDetails(details)
  };

  await set(auditRef, payload);
  return auditRef.key;
}
