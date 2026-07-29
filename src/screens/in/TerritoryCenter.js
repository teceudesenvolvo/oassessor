import React, { useMemo } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Flame, Layers3, MapPinned, Users2 } from 'lucide-react';
import InsightPanel from '../../components/dashboard/InsightPanel';
import MetricCard from '../../components/dashboard/MetricCard';
import { useTerritoryCenter } from '../../hooks/useTerritoryCenter';
import { useAuth } from '../../useAuth';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const intensityTone = (value) => {
  if (value >= 12) return '#dc2626';
  if (value >= 6) return '#f97316';
  if (value >= 3) return '#eab308';
  return '#16a34a';
};

export default function TerritoryCenter() {
  const { user } = useAuth();
  const { loading, stats, neighborhoodSummary, mapMarkers, territory } = useTerritoryCenter(user);

  const center = useMemo(() => {
    if (!mapMarkers.length) return [-5.20, -39.53];
    const avgLat = mapMarkers.reduce((sum, item) => sum + item.lat, 0) / mapMarkers.length;
    const avgLng = mapMarkers.reduce((sum, item) => sum + item.lng, 0) / mapMarkers.length;
    return [avgLat, avgLng];
  }, [mapMarkers]);

  return (
    <div className="campaign-dashboard">
      <section className="campaign-filters-card">
        <div className="campaign-filters-header">
          <div>
            <p className="campaign-kicker">
              <MapPinned size={16} />
              Fase 12
            </p>
            <h3>Central Territorial</h3>
          </div>
          <div className="campaign-filters-pill">
            <Layers3 size={16} />
            Mapa + heatmap lógico
          </div>
        </div>
        <p style={{ margin: 0, color: '#64748b', lineHeight: 1.6 }}>
          Consolidação territorial de eleitores, lideranças, visitas, demandas e eventos com leitura rápida por bairro e base pronta para evoluir o heatmap.
        </p>
      </section>

      <div className="campaign-metrics-grid">
        <MetricCard title="Eleitores" value={stats.voters} helper="Base territorial total" />
        <MetricCard title="Georreferenciados" value={stats.mappedVoters} helper="Com latitude e longitude" tone="success" />
        <MetricCard title="Lideranças" value={stats.leaderships} helper="Rede em campo" />
        <MetricCard title="Visitas" value={stats.visits} helper="Operação territorial" tone="highlight" />
        <MetricCard title="Demandas" value={stats.demands} helper="Pressão territorial registrada" tone="danger" />
        <MetricCard title="Eventos" value={stats.events} helper="Ativação no território" />
      </div>

      <div className="campaign-main-grid territory-main-grid">
        <InsightPanel title="Mapa territorial" subtitle="Eleitores georreferenciados como base operacional">
          <div className="territory-map-shell">
            {loading ? (
              <div className="campaign-empty-state">Carregando mapa territorial...</div>
            ) : mapMarkers.length === 0 ? (
              <div className="campaign-empty-state">Ainda não há coordenadas suficientes para exibir o mapa.</div>
            ) : (
              <MapContainer center={center} zoom={11} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {mapMarkers.map((marker) => (
                  <CircleMarker
                    key={marker.id}
                    center={[marker.lat, marker.lng]}
                    radius={6}
                    pathOptions={{ color: '#16a34a', fillColor: '#22c55e', fillOpacity: 0.65 }}
                  >
                    <Popup>
                      <strong style={{ color: '#0f172a' }}>{marker.name}</strong>
                      <br />
                      <span style={{ color: '#64748b' }}>{marker.type} • {marker.bairro}</span>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            )}
          </div>
        </InsightPanel>

        <InsightPanel title="Heatmap lógico por bairro" subtitle="Intensidade combinada de eleitores, visitas e demandas" compact>
          <div className="territory-heat-list">
            {neighborhoodSummary.slice(0, 12).map((item) => (
              <div key={item.name} className="territory-heat-card">
                <div className="territory-heat-head">
                  <strong>{item.name}</strong>
                  <span style={{ backgroundColor: `${intensityTone(item.intensity)}20`, color: intensityTone(item.intensity) }}>
                    intensidade {item.intensity.toFixed(1)}
                  </span>
                </div>
                <div className="territory-heat-bar">
                  <div
                    className="territory-heat-fill"
                    style={{ width: `${Math.min(100, item.intensity * 8)}%`, backgroundColor: intensityTone(item.intensity) }}
                  />
                </div>
                <div className="territory-heat-stats">
                  <span><Users2 size={14} /> {item.voters} eleitores</span>
                  <span><MapPinned size={14} /> {item.visits} visitas</span>
                  <span><Flame size={14} /> {item.demands} demandas</span>
                </div>
              </div>
            ))}
          </div>
        </InsightPanel>
      </div>

      <div className="campaign-secondary-grid territory-secondary-grid">
        <InsightPanel title="Eventos por território" subtitle="Próximas ativações no mapa">
          <div className="territory-mini-list">
            {territory.events.length === 0 ? (
              <div className="campaign-empty-state">Nenhum evento cadastrado ainda.</div>
            ) : (
              territory.events.slice(0, 6).map((event) => (
                <div key={event.id} className="territory-mini-card">
                  <strong>{event.title}</strong>
                  <p>{event.local}</p>
                </div>
              ))
            )}
          </div>
        </InsightPanel>

        <InsightPanel title="Demandas territoriais" subtitle="Onde a pressão comunitária está maior">
          <div className="territory-mini-list">
            {territory.demands.length === 0 ? (
              <div className="campaign-empty-state">Nenhuma demanda cadastrada ainda.</div>
            ) : (
              territory.demands.slice(0, 6).map((demand) => (
                <div key={demand.id} className="territory-mini-card">
                  <strong>{demand.title}</strong>
                  <p>{demand.bairro || 'SEM BAIRRO'} • {demand.status || 'received'}</p>
                </div>
              ))
            )}
          </div>
        </InsightPanel>

        <InsightPanel title="Lideranças no território" subtitle="Rede organizada por bairro">
          <div className="territory-mini-list">
            {territory.leaderships.length === 0 ? (
              <div className="campaign-empty-state">Nenhuma liderança cadastrada ainda.</div>
            ) : (
              territory.leaderships.slice(0, 6).map((leadership) => (
                <div key={leadership.id} className="territory-mini-card">
                  <strong>{leadership.nome}</strong>
                  <p>{leadership.bairro || 'SEM BAIRRO'} • {leadership.role || 'leadership'}</p>
                </div>
              ))
            )}
          </div>
        </InsightPanel>
      </div>
    </div>
  );
}
