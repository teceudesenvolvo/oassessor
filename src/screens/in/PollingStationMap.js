import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { ref, query, orderByChild, equalTo, get, update } from 'firebase/database';
import { database } from '../../firebaseConfig';
import { useAuth } from '../../useAuth';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for Leaflet default icons in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

export default function PollingStationMap() {
  const { user } = useAuth();
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Carregando dados...');

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        // 1. Check if user is admin
        const usersRef = ref(database, 'users');
        const qUser = query(usersRef, orderByChild('userId'), equalTo(user.uid));
        const userSnapshot = await get(qUser);
        
        let isUserAdmin = false;
        if (userSnapshot.exists()) {
          const userData = Object.values(userSnapshot.val())[0];
          if (userData.tipoUser === 'admin') {
            isUserAdmin = true;
          }
        }

        const votersRef = ref(database, 'eleitores');
        let votersList = [];

        if (isUserAdmin) {
           // Admin: Fetch assessors linked to this admin
           const assessoresRef = ref(database, 'assessores');
           const qAssessors = query(assessoresRef, orderByChild('adminId'), equalTo(user.uid));
           const assessorsSnapshot = await get(qAssessors);
           
           const idsToFilter = new Set();
           idsToFilter.add(user.uid); // Include admin's own voters

           if (assessorsSnapshot.exists()) {
             const assessorsData = assessorsSnapshot.val();
             Object.values(assessorsData).forEach(assessor => {
               if (assessor.userId) idsToFilter.add(assessor.userId);
             });
           }

           // Fetch voters for each creatorId
           const promises = Array.from(idsToFilter).map(id => {
             const q = query(votersRef, orderByChild('creatorId'), equalTo(id));
             return get(q);
           });
           
           const snapshots = await Promise.all(promises);
           snapshots.forEach(snap => {
             if (snap.exists()) {
               const data = snap.val();
               Object.keys(data).forEach(key => votersList.push({id: key, ...data[key]}));
             }
           });

        } else {
           // Assessor: Fetch only their voters
           const q = query(votersRef, orderByChild('creatorId'), equalTo(user.uid));
           const snapshot = await get(q);
           if (snapshot.exists()) {
             const data = snapshot.val();
             Object.keys(data).forEach(key => votersList.push({id: key, ...data[key]}));
           }
        }

        if (votersList.length === 0) {
          setLoading(false);
          return;
        }

        // 1.5 Fetch localvotacao data for better address resolution
        const placesRef = ref(database, 'localvotacao');
        const placesSnapshot = await get(placesRef);
        const placesMap = {};

        if (placesSnapshot.exists()) {
            const allPlaces = placesSnapshot.val();
            Object.keys(allPlaces).forEach(cityKey => {
                const cityPlaces = allPlaces[cityKey];
                Object.entries(cityPlaces).forEach(([placeKey, place]) => {
                    const key = `${place.local || ''} - ${place.endereco || ''}`;
                    placesMap[key] = { ...place, city: cityKey, key: placeKey };
                });
            });
        }

        // 2. Group by Polling Station (localVotacao)
        const groups = {};
        votersList.forEach(voter => {
          if (!voter.localVotacao) return;
          
          // Use localVotacao + City as key to ensure uniqueness across cities
          const key = `${voter.localVotacao}-${voter.cidade || ''}`;
          
          if (!groups[key]) {
            groups[key] = {
              name: voter.localVotacao,
              city: voter.cidade,
              state: voter.estado,
              count: 0
            };
          }
          groups[key].count++;
        });

        const stationList = Object.values(groups);
        setLoadingMessage(`Geocodificando ${stationList.length} locais de votação...`);

        // 3. Geocode Stations
        const geocodedStations = [];
        for (const station of stationList) {
           let lat = null;
           let lng = null;
           let addressString = '';
           let extraInfo = {};

           // Try to find in placesMap
           const placeData = placesMap[station.name];
           
           if (placeData) {
               // Se já tiver coordenadas salvas no localvotacao, usa direto
               if (placeData.lat && placeData.lng) {
                   geocodedStations.push({ ...station, lat: placeData.lat, lng: placeData.lng, bairro: placeData.bairro, zona: placeData.zona });
                   continue;
               }

               // Use structured data from localvotacao
               const city = placeData.city || station.city || '';
               addressString = `${placeData.endereco}, ${placeData.bairro || ''}, ${city}`;
               extraInfo = { bairro: placeData.bairro, zona: placeData.zona };
           } else {
               // Fallback to string parsing
               addressString = `${station.name}, ${station.city || ''}, ${station.state || ''}`;
           }
           
           try {
             const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressString)}&limit=1`);
             const results = await response.json();
             
             if (results.length > 0) {
               lat = parseFloat(results[0].lat);
               lng = parseFloat(results[0].lon);

               // Salva as coordenadas de volta na coleção localvotacao para uso futuro
               if (placeData && placeData.city && placeData.key) {
                   const updateRef = ref(database, `localvotacao/${placeData.city}/${placeData.key}`);
                   update(updateRef, { lat, lng });
               }
             }
           } catch (err) {
             console.error("Erro ao geocodificar local:", station.name, err);
           }

           if (lat && lng) {
               geocodedStations.push({ ...station, lat, lng, ...extraInfo });
           }

           // Rate limit for Nominatim (1 request per second)
           await new Promise(r => setTimeout(r, 1000));
        }

        setStations(geocodedStations);
        setLoading(false);

      } catch (error) {
        console.error("Erro ao buscar dados:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  return (
    <div className="dashboard-card" style={{ height: '85vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
      <div style={{ flex: 1, position: 'relative' }}>
        {loading && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.8)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <p style={{ color: '#0f172a', fontWeight: '500' }}>{loadingMessage}</p>
          </div>
        )}
         <MapContainer center={[-5.20, -39.53]} zoom={7} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {stations.map((station, index) => (
              <Marker key={index} position={[station.lat, station.lng]}>
                <Popup>
                  <strong style={{ color: '#0f172a' }}>{station.name.split(' - ')[0]}</strong><br />
                  <span style={{ fontSize: '0.9em', color: '#64748b' }}>
                    {station.bairro ? `Bairro: ${station.bairro}` : (station.city || '')}
                    {station.zona && <><br />Zona: {station.zona}</>}
                  </span>
                  <div style={{ marginTop: '8px', fontWeight: 'bold', color: '#16a34a' }}>
                    {station.count} eleitores vinculados
                  </div>
                </Popup>
              </Marker>
            ))}
         </MapContainer>
      </div>
    </div>
  );
}