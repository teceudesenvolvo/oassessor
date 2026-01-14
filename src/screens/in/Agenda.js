import React, { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import { ref, query, orderByChild, equalTo, onValue } from 'firebase/database';
import { database } from '../../firebaseConfig';
import { useAuth } from '../../useAuth';

export default function Agenda() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const tasksRef = ref(database, 'tarefas');
    const q = query(tasksRef, orderByChild('userId'), equalTo(user.uid));
    
    const unsubscribe = onValue(q, (snapshot) => {
      const data = snapshot.val();
      const eventsList = data 
        ? Object.keys(data).map(key => ({ id: key, ...data[key] })) 
        : [];
      setEvents(eventsList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <div className="dashboard-card">
      <h3>Agenda de Campanha</h3>
      <div style={{ marginTop: '20px' }}>
        {loading && <p>Carregando agenda...</p>}
        {!loading && events.length === 0 && <p style={{color: '#64748b'}}>Nenhum evento agendado.</p>}
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