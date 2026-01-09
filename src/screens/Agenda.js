import React from 'react';
import { MapPin } from 'lucide-react';

export default function Agenda() {
  const events = [
    { id: 1, title: 'Reunião com Lideranças', date: 'Hoje', time: '14:00', location: 'Comitê Central' },
    { id: 2, title: 'Caminhada no Bairro Centro', date: 'Amanhã', time: '09:00', location: 'Praça da Matriz' },
    { id: 3, title: 'Entrevista Rádio Local', date: '12/10', time: '08:30', location: 'Estúdio Rádio FM' },
  ];

  return (
    <div className="dashboard-card">
      <h3>Agenda de Campanha</h3>
      <div style={{ marginTop: '20px' }}>
        {events.map(event => (
          <div key={event.id} style={{ 
            display: 'flex', 
            alignItems: 'center', 
            padding: '15px', 
            borderBottom: '1px solid #f1f5f9',
            gap: '15px'
          }}>
            <div style={{ 
              backgroundColor: '#eff6ff', 
              padding: '10px', 
              borderRadius: '8px', 
              textAlign: 'center',
              minWidth: '70px'
            }}>
              <span style={{ display: 'block', fontSize: '0.8rem', color: '#64748b' }}>{event.date}</span>
              <span style={{ display: 'block', fontWeight: 'bold', color: '#2563eb' }}>{event.time}</span>
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: '0 0 5px 0', color: '#0f172a' }}>{event.title}</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.9rem', color: '#64748b' }}>
                <MapPin size={14} />
                {event.location}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}