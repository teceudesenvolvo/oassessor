import React, { useState, useEffect } from 'react';
import { AlignLeft, CheckCircle, Circle, Clock, Plus, X, Edit2 } from 'lucide-react';
import { ref, query, orderByChild, equalTo, onValue, update, push, set } from 'firebase/database';
import { database } from '../../firebaseConfig';
import { useAuth } from '../../useAuth';

export default function Agenda() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [showModal, setShowModal] = useState(false);
  const [currentTask, setCurrentTask] = useState(null);
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    data: '',
    time: '',
    tipo: 'general'
  });

  useEffect(() => {
    if (!user) return;

    const tasksRef = ref(database, 'tarefas');
    
    // Queries para buscar tarefas onde o usuário é o responsável (userId) ou o administrador (adminId)
    // Alinhado com o App: creatorId para assessores, adminId para políticos
    const qUser = query(tasksRef, orderByChild('creatorId'), equalTo(user.uid));
    const qAdmin = query(tasksRef, orderByChild('adminId'), equalTo(user.uid));
    
    let tasksByUser = {};
    let tasksByAdmin = {};

    const updateEvents = () => {
      const combinedTasks = { ...tasksByUser, ...tasksByAdmin };
      const tasksList = Object.keys(combinedTasks).map(key => ({ id: key, ...combinedTasks[key] }));
      
      // Ordenar cronologicamente por Data e Hora
      tasksList.sort((a, b) => {
        if (a.fullDate && b.fullDate) {
          return new Date(a.fullDate) - new Date(b.fullDate);
        }
        // Fallback para conversão de DD/MM/YYYY para YYYY-MM-DD se fullDate não existir
        const dateA = a.data ? new Date(`${a.data.split('/').reverse().join('-')}T${a.time || '00:00'}`) : new Date(0);
        const dateB = b.data ? new Date(`${b.data.split('/').reverse().join('-')}T${b.time || '00:00'}`) : new Date(0);
        return dateA - dateB;
      });

      setTasks(tasksList);
      setLoading(false);
    };

    const unsubscribeUser = onValue(qUser, (snapshot) => {
      tasksByUser = snapshot.val() || {};
      updateEvents();
    });

    const unsubscribeAdmin = onValue(qAdmin, (snapshot) => {
      tasksByAdmin = snapshot.val() || {};
      updateEvents();
    });

    return () => {
      unsubscribeUser();
      unsubscribeAdmin();
    };
  }, [user]);

  const toggleTask = async (task) => {
    const newStatus = task.status === 'pending' ? 'done' : 'pending';
    try {
      const taskRef = ref(database, `tarefas/${task.id}`);
      await update(taskRef, { status: newStatus });
    } catch (error) {
      console.error("Erro ao atualizar tarefa:", error);
      alert("Não foi possível atualizar a tarefa.");
    }
  };

  const getTypeLabel = (type) => {
    switch(type) {
        case 'meeting': return 'Reunião';
        case 'visit': return 'Visita';
        case 'content': return 'Mídia';
        case 'event': return 'Evento';
        default: return 'Geral';
    }
  };

  const filteredTasks = tasks.filter(task => {
    const status = task.status || 'pending';
    return status === filterStatus;
  });

  const handleOpenModal = (task = null) => {
    if (task) {
      setCurrentTask(task);
      // Converte DD/MM/YYYY para YYYY-MM-DD para o input date
      let dateInput = '';
      if (task.data) {
        const parts = task.data.split('/');
        if (parts.length === 3) {
          dateInput = `${parts[2]}-${parts[1]}-${parts[0]}`;
        } else {
          dateInput = task.data;
        }
      }
      setFormData({
        titulo: task.titulo || '',
        descricao: task.descricao || '',
        data: dateInput,
        time: task.time || '',
        tipo: task.tipo || 'general'
      });
    } else {
      setCurrentTask(null);
      setFormData({
        titulo: '',
        descricao: '',
        data: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        tipo: 'general'
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    const fullDate = new Date(`${formData.data}T${formData.time}`).toISOString();
    const dataFormatada = formData.data.split('-').reverse().join('/');

    const taskData = {
      ...formData,
      data: dataFormatada,
      fullDate: fullDate,
      updatedAt: new Date().toISOString()
    };

    try {
      if (currentTask) {
        const taskRef = ref(database, `tarefas/${currentTask.id}`);
        await update(taskRef, taskData);
      } else {
        const tasksRef = ref(database, 'tarefas');
        const newTaskRef = push(tasksRef);
        await set(newTaskRef, {
          ...taskData,
          creatorId: user.uid,
          createdAt: new Date().toISOString(),
          status: 'pending'
        });
      }
      setShowModal(false);
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar tarefa.");
    }
  };

  return (
    <div className="dashboard-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3>Tarefas</h3>
        <button className="btn-primary" onClick={() => handleOpenModal()} style={{ padding: '8px 16px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={16} />
          Nova Tarefa
        </button>
      </div>
      
      <div style={{ display: 'flex', gap: '10px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '8px', marginBottom: '20px', width: 'fit-content' }}>
          <button 
            onClick={() => setFilterStatus('pending')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: filterStatus === 'pending' ? 'white' : 'transparent',
              color: filterStatus === 'pending' ? '#2563eb' : '#64748b',
              fontWeight: filterStatus === 'pending' ? '600' : '400',
              cursor: 'pointer',
              boxShadow: filterStatus === 'pending' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            Pendentes
          </button>
          <button 
            onClick={() => setFilterStatus('done')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: filterStatus === 'done' ? 'white' : 'transparent',
              color: filterStatus === 'done' ? '#16a34a' : '#64748b',
              fontWeight: filterStatus === 'done' ? '600' : '400',
              cursor: 'pointer',
              boxShadow: filterStatus === 'done' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            Concluídas
          </button>
        </div>

      <div style={{ marginTop: '20px' }}>
        {loading && <p>Carregando tarefas...</p>}
        {!loading && filteredTasks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            <p>Nenhuma tarefa {filterStatus === 'pending' ? 'pendente' : 'concluída'}.</p>
          </div>
        )}
        {filteredTasks.map(task => (
          <div key={task.id} style={{ 
            display: 'flex', 
            alignItems: 'center', 
            padding: '15px', 
            borderBottom: '1px solid #f1f5f9',
            gap: '15px',
            opacity: task.status === 'done' ? 0.7 : 1
          }}>
            <div 
              onClick={() => toggleTask(task)}
              style={{ cursor: 'pointer' }}
            >
              {task.status === 'done' ? (
                <CheckCircle size={24} color="#10b981" />
              ) : (
                <Circle size={24} color="#cbd5e1" />
              )}
            </div>
            
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: '5px' }}>
                <h4 style={{ margin: 0, color: '#0f172a', textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>
                  {task.titulo}
                </h4>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: '#64748b' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={14} />
                  {task.data} • {task.time}
                </span>
                {task.descricao && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlignLeft size={14} />
                    {task.descricao.length > 20 ? task.descricao.substring(0, 20) + '...' : task.descricao}
                  </span>
                )}
              </div>
            </div>

            <div style={{ 
              padding: '4px 10px', 
              borderRadius: '8px', 
              backgroundColor: task.tipo === 'meeting' ? '#dbeafe' : '#f1f5f9',
              color: task.tipo === 'meeting' ? '#2563eb' : '#64748b',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              whiteSpace: 'nowrap'
            }}>
              {getTypeLabel(task.tipo)}
            </div>
            
            <button 
              onClick={() => handleOpenModal(task)}
              className="icon-btn"
              style={{ marginLeft: '10px', padding: '6px' }}
            >
              <Edit2 size={18} color="#64748b" />
            </button>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{
            backgroundColor: 'white', padding: '25px', borderRadius: '12px',
            width: '90%', maxWidth: '500px', position: 'relative'
          }}>
            <button 
              onClick={() => setShowModal(false)}
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <X size={20} color="#64748b" />
            </button>
            
            <h3 style={{ marginBottom: '20px' }}>{currentTask ? 'Editar Tarefa' : 'Nova Tarefa'}</h3>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div className="input-group">
                <label>Título</label>
                <input type="text" value={formData.titulo} onChange={e => setFormData({...formData, titulo: e.target.value})} className="custom-input" required />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="input-group">
                  <label>Data</label>
                  <input type="date" value={formData.data} onChange={e => setFormData({...formData, data: e.target.value})} className="custom-input" required />
                </div>
                <div className="input-group">
                  <label>Hora</label>
                  <input type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="custom-input" required />
                </div>
              </div>

              <div className="input-group">
                <label>Tipo</label>
                <select value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})} className="custom-input">
                  <option value="general">Geral</option>
                  <option value="meeting">Reunião</option>
                  <option value="visit">Visita</option>
                  <option value="content">Mídia / Conteúdo</option>
                  <option value="event">Evento</option>
                </select>
              </div>

              <div className="input-group">
                <label>Descrição</label>
                <textarea value={formData.descricao} onChange={e => setFormData({...formData, descricao: e.target.value})} className="custom-input" rows="3" />
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: '10px' }}>
                {currentTask ? 'Salvar Alterações' : 'Criar Tarefa'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}