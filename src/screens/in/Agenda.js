import React, { useEffect, useMemo, useState } from 'react';
import { AlignLeft, CalendarDays, CheckCircle, Circle, Clock, Columns3, Edit2, LayoutList, Phone, Plus, ShieldCheck, Trash, Truck, User, Users2, X } from 'lucide-react';
import { ref, query, orderByChild, equalTo, onValue, update, push, set, get, remove } from '../../services/firestoreDatabase';
import { database } from '../../firebaseConfig';
import { useAuth } from '../../useAuth';

const TASK_TYPES = [
  { value: 'general', label: 'Geral', color: '#64748b', icon: AlignLeft },
  { value: 'visit', label: 'Visita', color: '#2563eb', icon: Users2 },
  { value: 'call', label: 'Ligação', color: '#0f766e', icon: Phone },
  { value: 'meeting', label: 'Reunião', color: '#7c3aed', icon: AlignLeft },
  { value: 'return', label: 'Retorno', color: '#d97706', icon: Clock },
  { value: 'event', label: 'Evento', color: '#db2777', icon: CalendarDays },
  { value: 'mobilization', label: 'Mobilização', color: '#16a34a', icon: Users2 },
  { value: 'delivery', label: 'Entrega', color: '#ea580c', icon: Truck },
  { value: 'oversight', label: 'Fiscalização', color: '#b91c1c', icon: ShieldCheck },
  { value: 'content', label: 'Mídia / Conteúdo', color: '#475569', icon: AlignLeft }
];

const TASK_STATUSES = ['pending', 'done'];

const getTaskTypeMeta = (type) =>
  TASK_TYPES.find((item) => item.value === type) || TASK_TYPES[0];

const parseTaskDate = (task) => {
  if (task.fullDate) {
    const fullDate = new Date(task.fullDate);
    if (!Number.isNaN(fullDate.getTime())) return fullDate;
  }

  if (task.data) {
    const parsed = new Date(`${task.data.split('/').reverse().join('-')}T${task.time || '00:00'}`);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return null;
};

const formatCalendarLabel = (date) =>
  date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });

export default function Agenda() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [viewMode, setViewMode] = useState('list');
  const [showModal, setShowModal] = useState(false);
  const [currentTask, setCurrentTask] = useState(null);
  const [targetAdminId, setTargetAdminId] = useState(null);
  const [userName, setUserName] = useState('');
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    data: '',
    time: '',
    tipo: 'general'
  });

  useEffect(() => {
    if (!user) return;

    let activeUnsubscribe = null;
    let isMounted = true;

    const fetchTasks = async () => {
      try {
        let adminIdForTasks = user.uid;
        let userNameForCreation = 'Usuário';

        const assessoresRef = ref(database, 'users');
        const q = query(assessoresRef, orderByChild('userId'), equalTo(user.uid));
        const assessorSnap = await get(q);

        if (assessorSnap.exists()) {
          const assessorData = Object.values(assessorSnap.val())[0];
          if (assessorData.adminId) adminIdForTasks = assessorData.adminId;
          userNameForCreation = assessorData.name || assessorData.nome || 'Assessor';
        } else {
          const userRef = ref(database, `users/${user.uid}`);
          const userSnap = await get(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.val();
            userNameForCreation = userData.name || userData.nome || 'Admin';
          }
        }

        if (!isMounted) return;

        setTargetAdminId(adminIdForTasks);
        setUserName(userNameForCreation);

        const tasksRef = ref(database, 'tarefas');
        const tasksQuery = query(tasksRef, orderByChild('adminId'), equalTo(adminIdForTasks));

        const unsub = onValue(tasksQuery, (snapshot) => {
          if (!isMounted) return;
          const data = snapshot.val();
          const tasksList = data ? Object.keys(data).map((key) => ({ id: key, ...data[key] })) : [];

          tasksList.sort((a, b) => {
            const dateA = parseTaskDate(a) || new Date(0);
            const dateB = parseTaskDate(b) || new Date(0);
            return dateA - dateB;
          });

          setTasks(tasksList);
          setLoading(false);
        }, () => {
          if (isMounted) setLoading(false);
        });

        activeUnsubscribe = unsub;
      } catch (error) {
        console.error('Erro ao carregar agenda:', error);
        if (isMounted) setLoading(false);
      }
    };

    fetchTasks();

    return () => {
      isMounted = false;
      if (activeUnsubscribe) activeUnsubscribe();
    };
  }, [user]);

  const filteredTasks = useMemo(
    () => tasks.filter((task) => (task.status || 'pending') === filterStatus),
    [filterStatus, tasks]
  );

  const tasksByStatus = useMemo(
    () =>
      TASK_STATUSES.reduce((acc, status) => {
        acc[status] = tasks.filter((task) => (task.status || 'pending') === status);
        return acc;
      }, {}),
    [tasks]
  );

  const calendarGroups = useMemo(() => {
    const grouped = filteredTasks.reduce((acc, task) => {
      const date = parseTaskDate(task);
      const key = date ? date.toISOString().split('T')[0] : 'sem-data';
      if (!acc[key]) {
        acc[key] = {
          key,
          label: date ? formatCalendarLabel(date) : 'Sem data',
          tasks: []
        };
      }
      acc[key].tasks.push(task);
      return acc;
    }, {});

    return Object.values(grouped).sort((a, b) => a.key.localeCompare(b.key));
  }, [filteredTasks]);

  const toggleTask = async (task) => {
    const newStatus = (task.status || 'pending') === 'pending' ? 'done' : 'pending';
    try {
      await update(ref(database, `tarefas/${task.id}`), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
      alert('Não foi possível atualizar a tarefa.');
    }
  };

  const handleOpenModal = (task = null) => {
    if (task) {
      setCurrentTask(task);
      let dateInput = '';
      if (task.data) {
        const parts = task.data.split('/');
        dateInput = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : task.data;
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

  const handleSave = async (event) => {
    event.preventDefault();

    const fullDate = new Date(`${formData.data}T${formData.time}`).toISOString();
    const dataFormatada = formData.data.split('-').reverse().join('/');
    const taskData = {
      ...formData,
      data: dataFormatada,
      fullDate,
      updatedAt: new Date().toISOString()
    };

    try {
      if (currentTask) {
        await update(ref(database, `tarefas/${currentTask.id}`), taskData);
      } else {
        const tasksRef = ref(database, 'tarefas');
        const newTaskRef = push(tasksRef);
        await set(newTaskRef, {
          ...taskData,
          creatorId: user.uid,
          creatorName: userName,
          creatorEmail: user.email,
          adminId: targetAdminId,
          createdAt: new Date().toISOString(),
          status: 'pending'
        });
      }
      setShowModal(false);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar tarefa.');
    }
  };

  const handleDelete = async () => {
    if (!currentTask) return;
    if (!window.confirm('Tem certeza que deseja excluir esta tarefa?')) return;
    try {
      await remove(ref(database, `tarefas/${currentTask.id}`));
      setShowModal(false);
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('Erro ao excluir tarefa.');
    }
  };

  const moveTaskStatus = async (task, status) => {
    if ((task.status || 'pending') === status) return;
    try {
      await update(ref(database, `tarefas/${task.id}`), {
        status,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erro ao mover tarefa:', error);
      alert('Não foi possível mover a tarefa.');
    }
  };

  const renderTaskCard = (task, compact = false) => {
    const typeMeta = getTaskTypeMeta(task.tipo);
    const TypeIcon = typeMeta.icon;

    return (
      <div
        key={task.id}
        className={`task-card-shell ${compact ? 'compact' : ''}`}
        style={{ opacity: task.status === 'done' ? 0.7 : 1 }}
      >
        <div onClick={() => toggleTask(task)} style={{ cursor: 'pointer' }}>
          {task.status === 'done' ? <CheckCircle size={22} color="#10b981" /> : <Circle size={22} color="#cbd5e1" />}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: '6px', display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' }}>
            <h4 style={{ margin: 0, color: '#0f172a', textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>
              {task.titulo}
            </h4>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '999px',
                backgroundColor: `${typeMeta.color}15`,
                color: typeMeta.color,
                fontSize: '0.75rem',
                fontWeight: 700,
                whiteSpace: 'nowrap'
              }}
            >
              <TypeIcon size={13} />
              {typeMeta.label}
            </span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: '#64748b' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={14} />
              {task.data} • {task.time}
            </span>
            {task.creatorName ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                <User size={12} />
                Criada por: {task.creatorId === user.uid ? 'Você' : task.creatorName}
              </span>
            ) : null}
            {task.descricao ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlignLeft size={14} />
                {compact || task.descricao.length <= 60 ? task.descricao : `${task.descricao.substring(0, 60)}...`}
              </span>
            ) : null}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {viewMode === 'kanban' ? (
            <button
              type="button"
              className="funnel-link-btn"
              onClick={() => moveTaskStatus(task, task.status === 'done' ? 'pending' : 'done')}
            >
              {task.status === 'done' ? 'Reabrir' : 'Concluir'}
            </button>
          ) : null}
          <button onClick={() => handleOpenModal(task)} className="icon-btn" style={{ padding: '6px' }}>
            <Edit2 size={18} color="#64748b" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '14px', flexWrap: 'wrap' }}>
        <h3>Tarefas</h3>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="funnel-view-switch">
            <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>
              <LayoutList size={16} />
              Lista
            </button>
            <button className={viewMode === 'kanban' ? 'active' : ''} onClick={() => setViewMode('kanban')}>
              <Columns3 size={16} />
              Kanban
            </button>
            <button className={viewMode === 'calendar' ? 'active' : ''} onClick={() => setViewMode('calendar')}>
              <CalendarDays size={16} />
              Calendário
            </button>
          </div>

          <button className="btn-primary" onClick={() => handleOpenModal()} style={{ padding: '8px 16px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={16} />
            Nova Tarefa
          </button>
        </div>
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
            boxShadow: filterStatus === 'pending' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
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
            boxShadow: filterStatus === 'done' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
          }}
        >
          Concluídas
        </button>
      </div>

      <div style={{ marginTop: '20px' }}>
        {loading ? <p>Carregando tarefas...</p> : null}
        {!loading && filteredTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            <p>Nenhuma tarefa {filterStatus === 'pending' ? 'pendente' : 'concluída'}.</p>
          </div>
        ) : null}

        {!loading && viewMode === 'list' ? filteredTasks.map((task) => renderTaskCard(task)) : null}

        {!loading && viewMode === 'kanban' ? (
          <div className="tasks-kanban-board">
            {TASK_STATUSES.map((status) => (
              <div key={status} className="tasks-kanban-column">
                <div className="tasks-kanban-header">
                  <h4>{status === 'pending' ? 'Pendentes' : 'Concluídas'}</h4>
                  <span>{tasksByStatus[status].length}</span>
                </div>
                <div className="tasks-kanban-body">
                  {tasksByStatus[status].map((task) => renderTaskCard(task, true))}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {!loading && viewMode === 'calendar' ? (
          <div className="tasks-calendar-board">
            {calendarGroups.map((group) => (
              <div key={group.key} className="tasks-calendar-day">
                <div className="tasks-calendar-header">
                  <strong>{group.label}</strong>
                  <span>{group.tasks.length} tarefa(s)</span>
                </div>
                <div className="tasks-calendar-items">
                  {group.tasks.map((task) => renderTaskCard(task, true))}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {showModal ? (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              padding: '25px',
              borderRadius: '12px',
              width: '80%',
              maxWidth: '500px',
              position: 'relative'
            }}
          >
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
                <input type="text" value={formData.titulo} onChange={(e) => setFormData({ ...formData, titulo: e.target.value })} className="custom-input" required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="input-group">
                  <label>Data</label>
                  <input type="date" value={formData.data} onChange={(e) => setFormData({ ...formData, data: e.target.value })} className="custom-input" style={{ width: '60%' }} required />
                </div>
                <div className="input-group">
                  <label>Hora</label>
                  <input type="time" value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} className="custom-input" style={{ width: '60%' }} required />
                </div>
              </div>

              <div className="input-group">
                <label>Tipo</label><br />
                <select value={formData.tipo} onChange={(e) => setFormData({ ...formData, tipo: e.target.value })} className="custom-input" style={{ width: '100%', height: '60px' }}>
                  {TASK_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label>Descrição</label>
                <textarea value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} className="custom-input" rows="3" />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                {currentTask ? (
                  <button type="button" onClick={handleDelete} className="btn-secondary" style={{ flex: 1, color: '#ef4444', borderColor: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                    <Trash size={16} />
                    Excluir
                  </button>
                ) : null}
                <button type="submit" className="btn-primary" style={{ flex: 2 }}>
                  {currentTask ? 'Salvar Alterações' : 'Criar Tarefa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
