import { useEffect, useMemo, useState } from 'react';
import { equalTo, get, onValue, orderByChild, push, query, ref, remove, set, update } from 'firebase/database';
import { database } from '../firebaseConfig';

const normalizeUpper = (value) => String(value || '').trim().toUpperCase();

export function useVolunteers(user) {
  const [loading, setLoading] = useState(true);
  const [adminId, setAdminId] = useState(null);
  const [userType, setUserType] = useState(null);
  const [volunteers, setVolunteers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [assessors, setAssessors] = useState([]);

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
        setUserType(currentUserType || 'assessor');

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

        const volunteerQuery = query(ref(database, 'voluntarios'), orderByChild('adminId'), equalTo(effectiveAdminId));
        const unsubscribeVolunteers = onValue(volunteerQuery, (snapshot) => {
          if (!active) return;
          const data = snapshot.val() || {};
          const list = Object.entries(data).map(([id, value]) => ({
            id,
            ...value,
            nome: value.nome || 'Voluntário',
            regiao: normalizeUpper(value.regiao || 'Sem região'),
            disponibilidade: value.disponibilidade || [],
            habilidades: value.habilidades || [],
            tarefasIds: value.tarefasIds ? Object.values(value.tarefasIds) : [],
            eventosIds: value.eventosIds ? Object.values(value.eventosIds) : [],
            historico: value.historico ? Object.entries(value.historico).map(([key, item]) => ({ id: key, ...item })) : []
          }));
          setVolunteers(list);
          setLoading(false);
        });
        unsubscribes.push(unsubscribeVolunteers);

        const tasksQuery = query(ref(database, 'tarefas'), orderByChild('adminId'), equalTo(effectiveAdminId));
        const unsubscribeTasks = onValue(tasksQuery, (snapshot) => {
          if (!active) return;
          const data = snapshot.val() || {};
          const list = Object.entries(data).map(([id, value]) => ({
            id,
            ...value,
            titulo: value.titulo || 'Tarefa',
            tipo: value.tipo || 'general'
          }));
          setTasks(list);
          setEvents(list.filter((item) => item.tipo === 'event'));
        });
        unsubscribes.push(unsubscribeTasks);
      } catch (error) {
        console.error('Erro ao carregar voluntários:', error);
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [user]);

  const saveVolunteer = async (payload, selectedId = null) => {
    if (!adminId) return;

    const tarefasIds = {};
    (payload.tarefasIds || []).forEach((id) => { tarefasIds[id] = id; });
    const eventosIds = {};
    (payload.eventosIds || []).forEach((id) => { eventosIds[id] = id; });

    const historyEntries = payload.historico || [];
    const historyObject = {};
    historyEntries.forEach((entry) => {
      historyObject[entry.id || push(ref(database, 'tmp')).key] = {
        tipo: entry.tipo || 'registro',
        descricao: entry.descricao || '',
        data: entry.data || new Date().toISOString().split('T')[0]
      };
    });

    const data = {
      nome: payload.nome,
      telefone: payload.telefone || '',
      regiao: normalizeUpper(payload.regiao || ''),
      disponibilidade: payload.disponibilidade || [],
      habilidades: payload.habilidades || [],
      assessorResponsavel: payload.assessorResponsavel || '',
      observacoes: payload.observacoes || '',
      tarefasIds,
      eventosIds,
      historico: historyObject,
      adminId,
      updatedAt: new Date().toISOString()
    };

    if (selectedId) {
      await update(ref(database, `voluntarios/${selectedId}`), data);
      return selectedId;
    }

    const newRef = push(ref(database, 'voluntarios'));
    await set(newRef, {
      ...data,
      createdAt: new Date().toISOString()
    });
    return newRef.key;
  };

  const deleteVolunteer = async (id) => {
    await remove(ref(database, `voluntarios/${id}`));
  };

  const stats = useMemo(() => {
    const withEvents = volunteers.filter((item) => item.eventosIds.length > 0).length;
    const withTasks = volunteers.filter((item) => item.tarefasIds.length > 0).length;
    const uniqueSkills = new Set(volunteers.flatMap((item) => item.habilidades || []));

    return {
      total: volunteers.length,
      withEvents,
      withTasks,
      skills: uniqueSkills.size
    };
  }, [volunteers]);

  return {
    loading,
    userType,
    volunteers,
    tasks,
    events,
    assessors,
    stats,
    saveVolunteer,
    deleteVolunteer
  };
}
