import { useEffect, useMemo, useState } from 'react';
import { equalTo, get, onValue, orderByChild, push, query, ref, remove, set, update } from 'firebase/database';
import { database } from '../firebaseConfig';

const normalizeUpper = (value) => String(value || '').trim().toUpperCase();

export const EVENT_CONFIRMATION_STATUSES = [
  { value: 'pending', label: 'Pendente' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'declined', label: 'Recusado' },
  { value: 'attended', label: 'Presente' }
];

const parseDate = (value) => {
  if (!value) return new Date(0);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
};

const mapGuests = (guests = {}) =>
  Object.entries(guests).map(([id, guest]) => ({
    id,
    ...guest,
    status: guest.status || 'pending'
  }));

const buildGuestsObject = (guests = []) => {
  const result = {};
  guests.forEach((guest) => {
    result[guest.id || push(ref(database, 'tmp')).key] = {
      name: guest.name || '',
      phone: guest.phone || '',
      role: guest.role || '',
      status: guest.status || 'pending'
    };
  });
  return result;
};

export function useEvents(user) {
  const [loading, setLoading] = useState(true);
  const [adminId, setAdminId] = useState(null);
  const [events, setEvents] = useState([]);
  const [assessors, setAssessors] = useState([]);
  const [volunteers, setVolunteers] = useState([]);

  useEffect(() => {
    if (!user) return;

    let active = true;
    const unsubscribes = [];

    const load = async () => {
      try {
        setLoading(true);

        let currentUserType = null;
        let resolvedAdminId = user.uid;

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

        const assessoresRef = ref(database, 'assessores');
        const assessorsSnapshot = await get(query(assessoresRef, orderByChild('adminId'), equalTo(effectiveAdminId)));
        const assessorsList = assessorsSnapshot.exists()
          ? Object.entries(assessorsSnapshot.val()).map(([id, value]) => ({
              id,
              ...value,
              nome: value.nome || value.name || value.email || 'Assessor'
            }))
          : [];
        if (!active) return;
        setAssessors(assessorsList);

        const volunteersQuery = query(ref(database, 'voluntarios'), orderByChild('adminId'), equalTo(effectiveAdminId));
        const unsubscribeVolunteers = onValue(volunteersQuery, (snapshot) => {
          if (!active) return;
          const data = snapshot.val() || {};
          const list = Object.entries(data).map(([id, value]) => ({
            id,
            ...value,
            nome: value.nome || 'Voluntário',
            telefone: value.telefone || '',
            regiao: normalizeUpper(value.regiao || 'SEM REGIÃO')
          }));
          setVolunteers(list);
        });
        unsubscribes.push(unsubscribeVolunteers);

        const eventQuery = query(ref(database, 'eventos'), orderByChild('adminId'), equalTo(effectiveAdminId));
        const unsubscribeEvents = onValue(eventQuery, (snapshot) => {
          if (!active) return;
          const data = snapshot.val() || {};
          const list = Object.entries(data).map(([id, value]) => ({
            id,
            ...value,
            title: value.title || 'Evento',
            local: value.local || 'Sem local',
            guests: mapGuests(value.guests || {})
          }));
          list.sort((a, b) => parseDate(a.startAt) - parseDate(b.startAt));
          setEvents(list);
          setLoading(false);
        });
        unsubscribes.push(unsubscribeEvents);
      } catch (error) {
        console.error('Erro ao carregar eventos:', error);
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [user]);

  const stats = useMemo(() => {
    const totalGuests = events.reduce((sum, event) => sum + event.guests.length, 0);
    const confirmed = events.reduce((sum, event) => sum + event.guests.filter((guest) => guest.status === 'confirmed').length, 0);
    const attended = events.reduce((sum, event) => sum + event.guests.filter((guest) => guest.status === 'attended').length, 0);
    const next = events.filter((event) => parseDate(event.startAt) >= new Date()).length;
    return {
      total: events.length,
      totalGuests,
      confirmed,
      attended,
      next
    };
  }, [events]);

  const saveEvent = async (payload, selectedId = null) => {
    if (!adminId) return;

    const assessor = assessors.find((item) => item.id === payload.assessorId);
    const data = {
      title: payload.title,
      description: payload.description || '',
      local: payload.local || '',
      startAt: payload.startAt || '',
      endAt: payload.endAt || '',
      assessorId: payload.assessorId || '',
      assessorResponsavel: assessor?.nome || payload.assessorResponsavel || '',
      report: payload.report || '',
      category: payload.category || '',
      guests: buildGuestsObject(payload.guests || []),
      adminId,
      updatedAt: new Date().toISOString()
    };

    if (selectedId) {
      await update(ref(database, `eventos/${selectedId}`), data);
      return selectedId;
    }

    const newRef = push(ref(database, 'eventos'));
    await set(newRef, {
      ...data,
      createdAt: new Date().toISOString()
    });
    return newRef.key;
  };

  const deleteEvent = async (id) => {
    await remove(ref(database, `eventos/${id}`));
  };

  return {
    loading,
    events,
    volunteers,
    assessors,
    stats,
    saveEvent,
    deleteEvent
  };
}
