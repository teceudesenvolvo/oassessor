import { useEffect, useMemo, useState } from 'react';
import { equalTo, get, onValue, orderByChild, push, query, ref, remove, set, update } from '../services/firestoreDatabase';
import { database } from '../firebaseConfig';

const normalizeText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const normalizeUpper = (value) => String(value || '').trim().toUpperCase();

const SUPPORT_STAGES = ['simpatizante', 'apoiador', 'multiplicador', 'voto confirmado'];

const parseDate = (value) => {
  if (!value || typeof value !== 'string') return null;
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [day, month, year] = value.split('/');
    const br = new Date(`${year}-${month}-${day}T00:00:00`);
    if (!Number.isNaN(br.getTime())) return br;
  }
  return null;
};

const matchesBirthday = (value) => {
  const date = parseDate(value);
  if (!date) return false;
  const today = new Date();
  return date.getDate() === today.getDate() && date.getMonth() === today.getMonth();
};

const inferAudienceTags = (entry) => {
  const tags = new Set();
  const stage = normalizeText(entry.funnelStage || entry.etapa || entry.statusEleitoral || entry.classificacao || entry.tipoApoio);
  const role = normalizeText(entry.role || '');

  if (SUPPORT_STAGES.includes(stage)) tags.add('supporters');
  if (role.includes('lider')) tags.add('leaderships');
  if (entry.source === 'voluntarios') tags.add('volunteers');
  if (matchesBirthday(entry.nascimento)) tags.add('birthday');

  return [...tags];
};

const defaultTemplates = [
  {
    id: 'tpl-birthday',
    title: 'Aniversário',
    category: 'Relacionamento',
    audience: 'birthday',
    message: 'Olá, {{nome}}! Passando para desejar um feliz aniversário. Conte com a nossa equipe! 🎉'
  },
  {
    id: 'tpl-event',
    title: 'Convite para evento',
    category: 'Mobilização',
    audience: 'supporters',
    message: 'Olá, {{nome}}! Queremos te convidar para nosso próximo encontro em {{bairro}}. Posso te passar os detalhes?'
  },
  {
    id: 'tpl-followup',
    title: 'Retorno de demanda',
    category: 'Atendimento',
    audience: 'all',
    message: 'Olá, {{nome}}! Estamos retornando seu contato para atualizar o andamento da sua solicitação.'
  }
];

export function useCommunicationCenter(user) {
  const [loading, setLoading] = useState(true);
  const [adminId, setAdminId] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [templates, setTemplates] = useState([]);
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

        const ownerIds = new Set([effectiveAdminId]);
        const ownerEmails = new Set([user.email].filter(Boolean));
        assessorsList.forEach((assessor) => {
          if (assessor.userId) ownerIds.add(assessor.userId);
          if (assessor.email) ownerEmails.add(assessor.email);
        });

        const contactsMap = new Map();
        const syncContacts = () => {
          if (!active) return;
          const list = [...contactsMap.values()].map((item) => ({
            ...item,
            audienceTags: inferAudienceTags(item)
          }));
          setContacts(list.sort((a, b) => a.nome.localeCompare(b.nome)));
        };

        const votersRef = ref(database, 'eleitores');
        ownerIds.forEach((ownerId) => {
          const votersQuery = query(votersRef, orderByChild('creatorId'), equalTo(ownerId));
          const unsubscribe = onValue(votersQuery, (snapshot) => {
            [...contactsMap.keys()].forEach((key) => {
              if (contactsMap.get(key)?.source === 'eleitores' && contactsMap.get(key)?.creatorId === ownerId) contactsMap.delete(key);
            });
            if (snapshot.exists()) {
              Object.entries(snapshot.val()).forEach(([id, value]) => {
                contactsMap.set(`eleitores-${id}`, {
                  id,
                  source: 'eleitores',
                  creatorId: value.creatorId,
                  nome: value.nome || 'Eleitor',
                  telefone: value.telefone || value.whatsapp || '',
                  bairro: normalizeUpper(value.bairro || ''),
                  zona: String(value.zona || ''),
                  secao: String(value.secao || ''),
                  assessor: value.creatorEmail || '',
                  funnelStage: value.funnelStage || value.etapa || value.tipoApoio || '',
                  nascimento: value.nascimento || ''
                });
              });
            }
            syncContacts();
          });
          unsubscribes.push(unsubscribe);
        });

        ownerEmails.forEach((email) => {
          const votersQuery = query(votersRef, orderByChild('creatorEmail'), equalTo(email));
          const unsubscribe = onValue(votersQuery, (snapshot) => {
            [...contactsMap.keys()].forEach((key) => {
              if (contactsMap.get(key)?.source === 'eleitores' && contactsMap.get(key)?.assessor === email) contactsMap.delete(key);
            });
            if (snapshot.exists()) {
              Object.entries(snapshot.val()).forEach(([id, value]) => {
                contactsMap.set(`eleitores-${id}`, {
                  id,
                  source: 'eleitores',
                  creatorId: value.creatorId,
                  nome: value.nome || 'Eleitor',
                  telefone: value.telefone || value.whatsapp || '',
                  bairro: normalizeUpper(value.bairro || ''),
                  zona: String(value.zona || ''),
                  secao: String(value.secao || ''),
                  assessor: value.creatorEmail || '',
                  funnelStage: value.funnelStage || value.etapa || value.tipoApoio || '',
                  nascimento: value.nascimento || ''
                });
              });
            }
            syncContacts();
          });
          unsubscribes.push(unsubscribe);
        });

        const volunteersQuery = query(ref(database, 'voluntarios'), orderByChild('adminId'), equalTo(effectiveAdminId));
        const unsubscribeVolunteers = onValue(volunteersQuery, (snapshot) => {
          [...contactsMap.keys()].forEach((key) => {
            if (contactsMap.get(key)?.source === 'voluntarios') contactsMap.delete(key);
          });
          if (snapshot.exists()) {
            Object.entries(snapshot.val()).forEach(([id, value]) => {
              contactsMap.set(`voluntarios-${id}`, {
                id,
                source: 'voluntarios',
                nome: value.nome || 'Voluntário',
                telefone: value.telefone || '',
                bairro: normalizeUpper(value.regiao || ''),
                zona: '',
                secao: '',
                assessor: value.assessorResponsavel || '',
                funnelStage: '',
                nascimento: ''
              });
            });
          }
          syncContacts();
        });
        unsubscribes.push(unsubscribeVolunteers);

        const leadershipsQuery = query(ref(database, 'liderancas'), orderByChild('adminId'), equalTo(effectiveAdminId));
        const unsubscribeLeaderships = onValue(leadershipsQuery, (snapshot) => {
          [...contactsMap.keys()].forEach((key) => {
            if (contactsMap.get(key)?.source === 'liderancas') contactsMap.delete(key);
          });
          if (snapshot.exists()) {
            Object.entries(snapshot.val()).forEach(([id, value]) => {
              contactsMap.set(`liderancas-${id}`, {
                id,
                source: 'liderancas',
                nome: value.nome || 'Liderança',
                telefone: value.telefone || '',
                bairro: normalizeUpper(value.bairro || ''),
                zona: '',
                secao: '',
                assessor: value.assessorResponsavel || '',
                funnelStage: '',
                role: value.role || 'leadership',
                nascimento: ''
              });
            });
          }
          syncContacts();
        });
        unsubscribes.push(unsubscribeLeaderships);

        const templatesQuery = query(ref(database, 'modelosComunicacao'), orderByChild('adminId'), equalTo(effectiveAdminId));
        const unsubscribeTemplates = onValue(templatesQuery, (snapshot) => {
          if (!active) return;
          const list = snapshot.exists()
            ? Object.entries(snapshot.val()).map(([id, value]) => ({ id, ...value }))
            : [];
          setTemplates(list.length ? list : defaultTemplates);
          setLoading(false);
        });
        unsubscribes.push(unsubscribeTemplates);
      } catch (error) {
        console.error('Erro ao carregar central de comunicação:', error);
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
    const supporters = contacts.filter((item) => item.audienceTags.includes('supporters')).length;
    const volunteers = contacts.filter((item) => item.source === 'voluntarios').length;
    const leaderships = contacts.filter((item) => item.source === 'liderancas').length;
    const birthdays = contacts.filter((item) => item.audienceTags.includes('birthday')).length;

    return {
      total: contacts.length,
      supporters,
      volunteers,
      leaderships,
      birthdays,
      templates: templates.length
    };
  }, [contacts, templates]);

  const saveTemplate = async (payload, selectedId = null) => {
    if (!adminId) return;

    const data = {
      title: payload.title,
      category: payload.category || '',
      audience: payload.audience || 'all',
      message: payload.message || '',
      adminId,
      updatedAt: new Date().toISOString()
    };

    if (selectedId && !String(selectedId).startsWith('tpl-')) {
      await update(ref(database, `modelosComunicacao/${selectedId}`), data);
      return selectedId;
    }

    const newRef = push(ref(database, 'modelosComunicacao'));
    await set(newRef, {
      ...data,
      createdAt: new Date().toISOString()
    });
    return newRef.key;
  };

  const deleteTemplate = async (id) => {
    if (String(id).startsWith('tpl-')) return;
    await remove(ref(database, `modelosComunicacao/${id}`));
  };

  return {
    loading,
    contacts,
    templates,
    assessors,
    stats,
    saveTemplate,
    deleteTemplate
  };
}
