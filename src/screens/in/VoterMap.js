import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { ref, query, orderByChild, equalTo, onValue } from 'firebase/database';
import { database } from '../../firebaseConfig';
import { useAuth } from '../../useAuth';
import { ArrowLeft } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Correção para os ícones padrão do Leaflet no React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

export default function VoterMap() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [voters, setVoters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Carregando eleitores...');

  useEffect(() => {
    if (!user) return;

    const votersRef = ref(database, 'eleitores');
    const q = query(votersRef, orderByChild('creatorId'), equalTo(user.uid));

    const unsubscribe = onValue(q, (snapshot) => {
      const data = snapshot.val();
      const votersList = data
        ? Object.keys(data).map(key => ({ id: key, ...data[key] }))
        : [];
      
      if (votersList.length === 0) {
        setLoading(false);
        return;
      }

      // Converte os endereços em coordenadas de mapa (Geocoding)
      const geocodeVoters = async () => {
        setLoading(true);
        setLoadingMessage(`Geocodificando ${votersList.length} endereços...`);
        const geocodedVoters = [];

        for (const voter of votersList) {
          // Se o eleitor já tem lat/lng no banco, usa direto (otimização)
          if (voter.lat && voter.lng) {
            geocodedVoters.push(voter);
            continue;
          }

          // Constrói a string de busca do endereço
          let addressString = `${voter.endereco || ''}, ${voter.numero || ''}, ${voter.bairro || ''}, ${voter.cidade || ''}, ${voter.estado || ''}`;
          
          try {
            // Chama a API do Nominatim (OpenStreetMap)
            let response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressString)}&limit=1`);
            let results = await response.json();
            
            // Fallback 1: Tenta sem número e bairro (apenas Rua e Cidade) se a busca exata falhar
            if (results.length === 0 && voter.endereco && voter.cidade) {
               const fallbackAddress = `${voter.endereco}, ${voter.cidade}, ${voter.estado || ''}`;
               response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fallbackAddress)}&limit=1`);
               results = await response.json();
            }

            // Fallback 2: Tenta apenas pelo Bairro e Cidade se ainda falhar
            if (results.length === 0 && voter.bairro && voter.cidade) {
               const fallbackBairro = `${voter.bairro}, ${voter.cidade}, ${voter.estado || ''}`;
               response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fallbackBairro)}&limit=1`);
               results = await response.json();
            }
            
            if (results.length > 0) {
              const { lat, lon } = results[0];
              geocodedVoters.push({
                ...voter,
                lat: parseFloat(lat),
                lng: parseFloat(lon)
              });
            }
          } catch (error) {
            console.error(`Erro ao geocodificar endereço para ${voter.nome}:`, error);
          }
          // Adiciona um delay para não sobrecarregar a API pública (máx 1 req/seg)
          await new Promise(resolve => setTimeout(resolve, 1000)); 
        }
        setVoters(geocodedVoters);
        setLoading(false);
      };

      geocodeVoters();
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <div className="dashboard-card" style={{ height: '80vh', display: 'flex', flexDirection: 'column', padding: '15px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
        <button onClick={() => navigate('/dashboard/voters')} className="icon-btn">
          <ArrowLeft size={20} />
        </button>
        <h3>Mapa de Eleitores</h3>
      </div>

      <div style={{ flex: 1, borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', position: 'relative' }}>
        {loading && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.8)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <p style={{ color: '#0f172a', fontWeight: '500' }}>{loadingMessage}</p>
          </div>
        )}
         <MapContainer center={[-3.73, -38.65]} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {voters.map(voter => (
              voter.lat && voter.lng && ( // Renderiza o Marker apenas se tiver coordenadas
                <Marker key={voter.id} position={[voter.lat, voter.lng]}>
                  <Popup>
                    <strong style={{ color: '#0f172a' }}>{voter.nome}</strong><br />
                    <span style={{ fontSize: '0.9em', color: '#64748b' }}>
                      {voter.endereco}, {voter.numero}<br />
                      {voter.bairro}
                    </span>
                  </Popup>
                </Marker>
              )
            ))}
         </MapContainer>
      </div>
    </div>
  );
}