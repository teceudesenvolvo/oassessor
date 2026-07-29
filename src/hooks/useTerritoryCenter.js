import { useEffect, useMemo, useState } from 'react';
import { equalTo, get, onValue, orderByChild, query, ref } from '../services/firestoreDatabase';
import { database } from '../firebaseConfig';

const normalizeUpper = (value) => String(value || '').trim().toUpperCase();

const parseDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const buildNeighborhoodStats = (items, field = 'bairro') => {
  const map = new Map();
  items.forEach((item) => {
    const key = normalizeUpper(item[field] || 'SEM BAIRRO');
    if (!map.has(key)) map.set(key, { name: key, total: 0 });
    map.get(key).total += 1;
  });
  return [...map.values()].sort((a, b) => b.total - a.total);
};

export function useTerritoryCenter(user) {
  const [loading, setLoading] = useState(true);
  const [territory, setTerritory] = useState({
    voters: [],
    leaderships: [],
    visits: [],
    demands: [],
    events: [],
    assessors: []
  });

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

        const assessoresRef = ref(database, 'assessores');
        const assessorsSnapshot = await get(query(assessoresRef, orderByChild('adminId'), equalTo(effectiveAdminId)));
        const assessors = assessorsSnapshot.exists()
          ? Object.entries(assessorsSnapshot.val()).map(([id, value]) => ({
              id,
              ...value,
              nome: value.nome || value.name || value.email || 'Assessor'
            }))
          : [];

        const ownerIds = new Set([effectiveAdminId]);
        const ownerEmails = new Set([user.email].filter(Boolean));
        assessors.forEach((assessor) => {
          if (assessor.userId) ownerIds.add(assessor.userId);
          if (assessor.email) ownerEmails.add(assessor.email);
        });

        const votersMap = new Map();
        const current = {
          voters: [],
          leaderships: [],
          visits: [],
          demands: [],
          events: [],
          assessors
        };

        const sync = () => {
          if (!active) return;
          current.voters = [...votersMap.values()];
          setTerritory({
            ...current,
            voters: [...votersMap.values()]
          });
          setLoading(false);
        };

        const votersRef = ref(database, 'eleitores');
        ownerIds.forEach((ownerId) => {
          const votersQuery = query(votersRef, orderByChild('creatorId'), equalTo(ownerId));
          const unsubscribe = onValue(votersQuery, (snapshot) => {
            [...votersMap.keys()].forEach((key) => {
              if (votersMap.get(key)?.creatorId === ownerId) votersMap.delete(key);
            });
            if (snapshot.exists()) {
              Object.entries(snapshot.val()).forEach(([id, value]) => {
                votersMap.set(id, {
                  id,
                  ...value,
                  bairro: normalizeUpper(value.bairro || ''),
                  lat: Number(value.lat || 0),
                  lng: Number(value.lng || 0)
                });
              });
            }
            sync();
          });
          unsubscribes.push(unsubscribe);
        });

        ownerEmails.forEach((email) => {
          const votersQuery = query(votersRef, orderByChild('creatorEmail'), equalTo(email));
          const unsubscribe = onValue(votersQuery, (snapshot) => {
            [...votersMap.keys()].forEach((key) => {
              if (votersMap.get(key)?.creatorEmail === email) votersMap.delete(key);
            });
            if (snapshot.exists()) {
              Object.entries(snapshot.val()).forEach(([id, value]) => {
                votersMap.set(id, {
                  id,
                  ...value,
                  bairro: normalizeUpper(value.bairro || ''),
                  lat: Number(value.lat || 0),
                  lng: Number(value.lng || 0)
                });
              });
            }
            sync();
          });
          unsubscribes.push(unsubscribe);
        });

        const leadershipsQuery = query(ref(database, 'liderancas'), orderByChild('adminId'), equalTo(effectiveAdminId));
        unsubscribes.push(
          onValue(leadershipsQuery, (snapshot) => {
            current.leaderships = snapshot.exists()
              ? Object.entries(snapshot.val()).map(([id, value]) => ({
                  id,
                  ...value,
                  bairro: normalizeUpper(value.bairro || '')
                }))
              : [];
            sync();
          })
        );

        const visitsQuery = query(ref(database, 'visitas'), orderByChild('adminId'), equalTo(effectiveAdminId));
        unsubscribes.push(
          onValue(visitsQuery, (snapshot) => {
            current.visits = snapshot.exists()
              ? Object.entries(snapshot.val()).map(([id, value]) => ({
                  id,
                  ...value,
                  bairro: normalizeUpper(value.bairro || ''),
                  plannedAtDate: parseDate(value.plannedAt)
                }))
              : [];
            sync();
          })
        );

        const demandsQuery = query(ref(database, 'demandas'), orderByChild('adminId'), equalTo(effectiveAdminId));
        unsubscribes.push(
          onValue(demandsQuery, (snapshot) => {
            current.demands = snapshot.exists()
              ? Object.entries(snapshot.val()).map(([id, value]) => ({
                  id,
                  ...value,
                  bairro: normalizeUpper(value.bairro || '')
                }))
              : [];
            sync();
          })
        );

        const eventsQuery = query(ref(database, 'eventos'), orderByChild('adminId'), equalTo(effectiveAdminId));
        unsubscribes.push(
          onValue(eventsQuery, (snapshot) => {
            current.events = snapshot.exists()
              ? Object.entries(snapshot.val()).map(([id, value]) => ({
                  id,
                  ...value,
                  local: value.local || 'Sem local',
                  startAtDate: parseDate(value.startAt)
                }))
              : [];
            sync();
          })
        );
      } catch (error) {
        console.error('Erro ao carregar central territorial:', error);
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
    const mappedVoters = territory.voters.filter((item) => item.lat && item.lng).length;
    return {
      voters: territory.voters.length,
      mappedVoters,
      leaderships: territory.leaderships.length,
      visits: territory.visits.length,
      demands: territory.demands.length,
      events: territory.events.length
    };
  }, [territory]);

  const neighborhoodSummary = useMemo(() => {
    const voters = buildNeighborhoodStats(territory.voters);
    const visits = buildNeighborhoodStats(territory.visits);
    const demands = buildNeighborhoodStats(territory.demands);

    const map = new Map();
    [...voters, ...visits, ...demands].forEach((item) => {
      if (!map.has(item.name)) {
        map.set(item.name, { name: item.name, voters: 0, visits: 0, demands: 0, intensity: 0 });
      }
    });

    voters.forEach((item) => {
      const row = map.get(item.name);
      row.voters = item.total;
      row.intensity += item.total;
    });
    visits.forEach((item) => {
      const row = map.get(item.name);
      row.visits = item.total;
      row.intensity += item.total * 1.2;
    });
    demands.forEach((item) => {
      const row = map.get(item.name);
      row.demands = item.total;
      row.intensity += item.total * 1.4;
    });

    return [...map.values()].sort((a, b) => b.intensity - a.intensity);
  }, [territory]);

  const mapMarkers = useMemo(() => {
    const voterMarkers = territory.voters
      .filter((item) => item.lat && item.lng)
      .map((item) => ({
        id: `voter-${item.id}`,
        type: 'Eleitor',
        name: item.nome || 'Eleitor',
        bairro: item.bairro || 'SEM BAIRRO',
        lat: Number(item.lat),
        lng: Number(item.lng)
      }));

    return voterMarkers.slice(0, 300);
  }, [territory]);

  return {
    loading,
    territory,
    stats,
    neighborhoodSummary,
    mapMarkers
  };
}
