import { equalTo, get, orderByChild, push, query as rtdbQuery, ref, set, update } from './firestoreDatabase';
import { collection, doc, getDoc, getDocs, query as fsQuery, setDoc, updateDoc, where } from 'firebase/firestore';
import { database, firestore } from '../firebaseConfig';
import { inferUserRole } from '../utils/userRoles';

const toArray = (snapshot) =>
  snapshot.exists()
    ? Object.entries(snapshot.val()).map(([id, value]) => ({ id, ...value }))
    : [];

const uniqueById = (items) => {
  const map = new Map();
  items.forEach((item) => {
    if (item?.id) map.set(item.id, item);
  });
  return [...map.values()];
};

const normalizeProfileRole = (profile) => {
  if (!profile) return profile;
  const normalizedRole = inferUserRole(profile, null);
  if (!normalizedRole) return profile;

  return {
    ...profile,
    tipoUser: normalizedRole,
    role: profile.role || normalizedRole
  };
};

const runFirestoreEqualityQueries = async (collectionName, field, values) => {
  const validValues = [...new Set(values.filter(Boolean))];
  const results = await Promise.all(
    validValues.map(async (value) => {
      const snapshot = await getDocs(fsQuery(collection(firestore, collectionName), where(field, '==', value)));
      return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    })
  );
  return uniqueById(results.flat());
};

export async function getUserProfileHybrid(uid, email) {
  const directDoc = await getDoc(doc(firestore, 'users', uid)).catch(() => null);
  if (directDoc?.exists()) return normalizeProfileRole({ id: directDoc.id, ...directDoc.data() });

  const indexedUsers = await runFirestoreEqualityQueries('users', 'userId', [uid]).catch(() => []);
  if (indexedUsers.length) return normalizeProfileRole(indexedUsers[0]);

  const indexedAssessors = await runFirestoreEqualityQueries('assessores', 'userId', [uid]).catch(() => []);
  if (indexedAssessors.length) return normalizeProfileRole(indexedAssessors[0]);

  if (email) {
    const emailAssessors = await runFirestoreEqualityQueries('assessores', 'email', [email]).catch(() => []);
    if (emailAssessors.length) return normalizeProfileRole(emailAssessors[0]);
  }

  const directSnapshot = await get(ref(database, `users/${uid}`));
  if (directSnapshot.exists()) return normalizeProfileRole({ id: uid, ...directSnapshot.val() });

  const indexedSnapshot = await get(rtdbQuery(ref(database, 'users'), orderByChild('userId'), equalTo(uid)));
  if (indexedSnapshot.exists()) return normalizeProfileRole(toArray(indexedSnapshot)[0]);

  if (email) {
    const assessorSnapshot = await get(rtdbQuery(ref(database, 'assessores'), orderByChild('email'), equalTo(email)));
    if (assessorSnapshot.exists()) return normalizeProfileRole(toArray(assessorSnapshot)[0]);
  }

  const assessorUserSnapshot = await get(rtdbQuery(ref(database, 'assessores'), orderByChild('userId'), equalTo(uid)));
  if (assessorUserSnapshot.exists()) return normalizeProfileRole(toArray(assessorUserSnapshot)[0]);

  return null;
}

export async function getAssessorsByAdminHybrid(adminId) {
  const firestoreItems = await runFirestoreEqualityQueries('assessores', 'adminId', [adminId]).catch(() => []);
  if (firestoreItems.length) return firestoreItems;

  const snapshot = await get(rtdbQuery(ref(database, 'assessores'), orderByChild('adminId'), equalTo(adminId)));
  return toArray(snapshot);
}

export async function getVotersByOwnersHybrid(ownerIds = [], ownerEmails = []) {
  const firestoreByIds = await runFirestoreEqualityQueries('eleitores', 'creatorId', ownerIds).catch(() => []);
  const firestoreByEmails = await runFirestoreEqualityQueries('eleitores', 'creatorEmail', ownerEmails).catch(() => []);
  const firestoreItems = uniqueById([...firestoreByIds, ...firestoreByEmails]);
  if (firestoreItems.length) return firestoreItems;

  const rtdbSnapshots = await Promise.all([
    ...[...new Set(ownerIds.filter(Boolean))].map((ownerId) =>
      get(rtdbQuery(ref(database, 'eleitores'), orderByChild('creatorId'), equalTo(ownerId)))
    ),
    ...[...new Set(ownerEmails.filter(Boolean))].map((email) =>
      get(rtdbQuery(ref(database, 'eleitores'), orderByChild('creatorEmail'), equalTo(email)))
    )
  ]);

  return uniqueById(rtdbSnapshots.flatMap((snapshot) => toArray(snapshot)));
}

export async function getTasksByAdminHybrid(adminId) {
  const firestoreItems = await runFirestoreEqualityQueries('tarefas', 'adminId', [adminId]).catch(() => []);
  if (firestoreItems.length) return firestoreItems;

  const snapshot = await get(rtdbQuery(ref(database, 'tarefas'), orderByChild('adminId'), equalTo(adminId)));
  return toArray(snapshot);
}

export async function updateVoterHybrid(voterId, payload) {
  const firestoreRef = doc(firestore, 'eleitores', voterId);
  const firestoreDoc = await getDoc(firestoreRef).catch(() => null);
  if (firestoreDoc?.exists()) {
    await updateDoc(firestoreRef, payload);
    return;
  }

  await update(ref(database, `eleitores/${voterId}`), payload);
}

export async function updateVoterFunnelHybrid(voterId, payload, historyEntry) {
  const firestoreRef = doc(firestore, 'eleitores', voterId);
  const firestoreDoc = await getDoc(firestoreRef).catch(() => null);

  if (firestoreDoc?.exists()) {
    const currentData = firestoreDoc.data() || {};
    const currentHistory = currentData.funnelHistory || {};
    const historyKey = historyEntry?.id || `history_${Date.now()}`;
    const historyData = { ...(historyEntry || {}) };
    delete historyData.id;
    await setDoc(
      firestoreRef,
      {
        ...payload,
        funnelHistory: {
          ...currentHistory,
          [historyKey]: historyData
        }
      },
      { merge: true }
    );
    return;
  }

  const voterRef = ref(database, `eleitores/${voterId}`);
  const historyRef = push(ref(database, `eleitores/${voterId}/funnelHistory`));

  await Promise.all([
    update(voterRef, payload),
    set(historyRef, historyEntry)
  ]);
}
