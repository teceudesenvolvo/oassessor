import {
  FieldPath,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query as firestoreQuery,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import { firestore } from '../firebaseConfig';

const cleanSegments = (path = '') => String(path).split('/').filter(Boolean);

const withoutUndefined = (value) => {
  if (Array.isArray(value)) return value.map(withoutUndefined);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => [key, withoutUndefined(item)])
  );
};

const nestedObject = (segments, value) =>
  segments.reduceRight((accumulator, segment) => ({ [segment]: accumulator }), value);

const readNestedValue = (value, segments) =>
  segments.reduce((current, segment) => current?.[segment], value);

class FirestoreSnapshot {
  constructor(value, key = null) {
    this.value = value;
    this.key = key;
  }

  exists() {
    return this.value !== null && this.value !== undefined;
  }

  val() {
    return this.value;
  }
}

const collectionSnapshotValue = (snapshot) => {
  const value = {};
  snapshot.forEach((documentSnapshot) => {
    value[documentSnapshot.id] = documentSnapshot.data();
  });
  return Object.keys(value).length ? value : null;
};

const resolveTarget = (reference) => {
  const segments = reference.path;
  if (segments.length === 1) {
    return { type: 'collection', collectionRef: collection(firestore, segments[0]), nested: [] };
  }

  const documentRef = doc(firestore, segments[0], segments[1]);
  return {
    type: segments.length === 2 ? 'document' : 'nested',
    documentRef,
    nested: segments.slice(2)
  };
};

export const ref = (_database, path = '') => ({
  path: cleanSegments(path),
  key: cleanSegments(path).at(-1) || null
});

export const orderByChild = (field) => ({ type: 'orderByChild', field });
export const equalTo = (value) => ({ type: 'equalTo', value });

export const query = (reference, ...constraints) => {
  const orderedField = constraints.find((constraint) => constraint.type === 'orderByChild')?.field;
  const equality = constraints.find((constraint) => constraint.type === 'equalTo');
  return { ...reference, queryField: orderedField, queryValue: equality?.value };
};

export const get = async (reference) => {
  const target = resolveTarget(reference);

  if (target.type === 'collection') {
    const source = reference.queryField
      ? firestoreQuery(target.collectionRef, where(reference.queryField, '==', reference.queryValue))
      : target.collectionRef;
    const snapshot = await getDocs(source);
    return new FirestoreSnapshot(collectionSnapshotValue(snapshot), reference.key);
  }

  const snapshot = await getDoc(target.documentRef);
  if (!snapshot.exists()) return new FirestoreSnapshot(null, reference.key);
  const value = target.type === 'nested'
    ? readNestedValue(snapshot.data(), target.nested)
    : snapshot.data();
  return new FirestoreSnapshot(value ?? null, reference.key);
};

export const onValue = (reference, callback, onError) => {
  const target = resolveTarget(reference);

  if (target.type === 'collection') {
    const source = reference.queryField
      ? firestoreQuery(target.collectionRef, where(reference.queryField, '==', reference.queryValue))
      : target.collectionRef;
    return onSnapshot(
      source,
      (snapshot) => callback(new FirestoreSnapshot(collectionSnapshotValue(snapshot), reference.key)),
      onError
    );
  }

  return onSnapshot(
    target.documentRef,
    (snapshot) => {
      const documentValue = snapshot.exists() ? snapshot.data() : null;
      const value = target.type === 'nested'
        ? readNestedValue(documentValue, target.nested)
        : documentValue;
      callback(new FirestoreSnapshot(value ?? null, reference.key));
    },
    onError
  );
};

export const push = (reference) => {
  const target = resolveTarget(reference);
  if (target.type === 'collection') {
    const documentRef = doc(target.collectionRef);
    return { path: [...reference.path, documentRef.id], key: documentRef.id };
  }

  const generatedId = doc(collection(firestore, '_ids')).id;
  return { path: [...reference.path, generatedId], key: generatedId };
};

export const set = async (reference, value) => {
  const target = resolveTarget(reference);
  const cleanedValue = withoutUndefined(value);

  if (target.type === 'document') {
    await setDoc(target.documentRef, cleanedValue);
    return;
  }
  if (target.type === 'nested') {
    await setDoc(target.documentRef, nestedObject(target.nested, cleanedValue), { merge: true });
    return;
  }

  throw new Error('Não é possível gravar diretamente em uma collection do Firestore.');
};

export const update = async (reference, value) => {
  const target = resolveTarget(reference);
  const cleanedValue = withoutUndefined(value);

  if (target.type === 'document') {
    await setDoc(target.documentRef, cleanedValue, { merge: true });
    return;
  }
  if (target.type === 'nested') {
    await setDoc(target.documentRef, nestedObject(target.nested, cleanedValue), { merge: true });
    return;
  }

  throw new Error('Não é possível atualizar diretamente uma collection do Firestore.');
};

export const remove = async (reference) => {
  const target = resolveTarget(reference);

  if (target.type === 'document') {
    await deleteDoc(target.documentRef);
    return;
  }
  if (target.type === 'nested') {
    await updateDoc(target.documentRef, new FieldPath(...target.nested), deleteField());
    return;
  }

  throw new Error('Não é possível excluir diretamente uma collection do Firestore.');
};
