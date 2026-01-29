import React, { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend 
} from 'recharts';
import { ref, query as rQuery, orderByChild, equalTo, get } from 'firebase/database';
import { database } from '../../firebaseConfig';
import { useAuth } from '../../useAuth';

export default function DashboardHome() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    voters: 0,
    team: 0,
    pendingTasks: 0
  });
  const [birthdays, setBirthdays] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [userType, setUserType] = useState(null);
  const [chartsData, setChartsData] = useState({
    age: [],
    sex: [],
    zone: [],
    neighborhood: [],
    city: []
  });

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      try {
        // Busca o tipo de usuário para renderização condicional
        let currentUserType = null;
        if (user.email) {
          const assessoresRef = ref(database, 'assessores');
          const qEmail = rQuery(assessoresRef, orderByChild('email'), equalTo(user.email));
          const snapshotEmail = await get(qEmail);
          if (snapshotEmail.exists()) {
            currentUserType = 'assessor';
          }
        }
        if (!currentUserType) {
            const usersRef = ref(database, 'users');
            const qUser = rQuery(usersRef, orderByChild('userId'), equalTo(user.uid));
            const userSnapshot = await get(qUser);
            if (userSnapshot.exists()) {
                const userData = Object.values(userSnapshot.val())[0];
                currentUserType = userData.tipoUser;
            }
        }
        setUserType(currentUserType);

        // 1. Contar Eleitores (Realtime DB)
        const votersRef = ref(database, 'eleitores');
        const qVotersCreator = rQuery(votersRef, orderByChild('creatorId'), equalTo(user.uid));
        const qVotersAdmin = rQuery(votersRef, orderByChild('adminId'), equalTo(user.uid));
        
        const [snapCreator, snapAdmin] = await Promise.all([
            get(qVotersCreator),
            get(qVotersAdmin)
        ]);
        
        let votersCount = 0;
        let todaysBirthdays = [];
        const tempChartData = {};
        const allVoters = {};

        const ageGroups = { '16-24': 0, '25-34': 0, '35-44': 0, '45-59': 0, '60+': 0 };
        const sexGroups = { 'Masculino': 0, 'Feminino': 0, 'Outro': 0 };
        const zoneGroups = {};
        const neighborhoodGroups = {};
        const cityGroups = {};

        if (snapCreator.exists()) Object.assign(allVoters, snapCreator.val());
        if (snapAdmin.exists()) Object.assign(allVoters, snapAdmin.val());

        votersCount = Object.keys(allVoters).length;

        if (votersCount > 0) {

          const today = new Date();
          const currentMonth = today.getMonth() + 1;
          const currentDay = today.getDate();

          Object.keys(allVoters).forEach(key => {
            const voter = { id: key, ...allVoters[key] };
            
            if (voter.nascimento) {
              // Cálculo de idade para o gráfico
              const birthDate = new Date(voter.nascimento);
              const todayDate = new Date();
              let age = todayDate.getFullYear() - birthDate.getFullYear();
              const m = todayDate.getMonth() - birthDate.getMonth();
              if (m < 0 || (m === 0 && todayDate.getDate() < birthDate.getDate())) {
                  age--;
              }
              
              if (age >= 16 && age <= 24) ageGroups['16-24']++;
              else if (age >= 25 && age <= 34) ageGroups['25-34']++;
              else if (age >= 35 && age <= 44) ageGroups['35-44']++;
              else if (age >= 45 && age <= 59) ageGroups['45-59']++;
              else if (age >= 60) ageGroups['60+']++;

              const parts = voter.nascimento.split('-'); // Esperado YYYY-MM-DD
              if (parts.length === 3) {
                const month = parseInt(parts[1], 10);
                const day = parseInt(parts[2], 10);
                if (month === currentMonth && day === currentDay) {
                  todaysBirthdays.push(voter);
                }
              }
            }

            // Sexo
            if (voter.sexo) {
                sexGroups[voter.sexo] = (sexGroups[voter.sexo] || 0) + 1;
            }

            // Zona
            if (voter.zona) {
                zoneGroups[voter.zona] = (zoneGroups[voter.zona] || 0) + 1;
            }

            // Bairro
            if (voter.bairro) {
                neighborhoodGroups[voter.bairro] = (neighborhoodGroups[voter.bairro] || 0) + 1;
            }

            // Cidade
            if (voter.cidade) {
                cityGroups[voter.cidade] = (cityGroups[voter.cidade] || 0) + 1;
            }

            // Processamento para o Gráfico (Agrupamento por data)
            if (voter.createdAt) {
              const dateObj = new Date(voter.createdAt);
              // Chave para ordenação YYYY-MM-DD
              const sortKey = dateObj.toISOString().split('T')[0];
              // Formato de exibição DD/MM
              const displayDate = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

              if (!tempChartData[sortKey]) {
                tempChartData[sortKey] = { date: displayDate, count: 0, sortKey };
              }
              tempChartData[sortKey].count += 1;
            }
          });

          setChartData(Object.values(tempChartData).sort((a, b) => a.sortKey.localeCompare(b.sortKey)));
          
          // Preparar dados para os gráficos
          const ageChartData = Object.keys(ageGroups).map(key => ({ name: key, value: ageGroups[key] }));
          
          const sexChartData = Object.keys(sexGroups)
            .filter(key => sexGroups[key] > 0)
            .map(key => ({ name: key, value: sexGroups[key] }));

          const zoneChartData = Object.keys(zoneGroups)
            .map(key => ({ name: key, value: zoneGroups[key] }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);

          const neighborhoodChartData = Object.keys(neighborhoodGroups)
            .map(key => ({ name: key, value: neighborhoodGroups[key] }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);

          const cityChartData = Object.keys(cityGroups)
            .map(key => ({ name: key, value: cityGroups[key] }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);

          setChartsData({
              age: ageChartData,
              sex: sexChartData,
              zone: zoneChartData,
              neighborhood: neighborhoodChartData,
              city: cityChartData
          });
        }
        
        // 2. Contar Equipe (Realtime DB)
        // Assumindo que os membros da equipe têm um campo 'ownerId' apontando para o admin
        const teamRef = ref(database, 'assessores');
        const qTeam = rQuery(teamRef, orderByChild('adminId'), equalTo(user.uid));
        const snapshotTeam = await get(qTeam);
        const teamCount = snapshotTeam.exists() ? Object.keys(snapshotTeam.val()).length : 0;

        // 3. Contar Tarefas Pendentes
        const tasksRef = ref(database, 'tarefas');
        const qTasksUser = rQuery(tasksRef, orderByChild('creatorId'), equalTo(user.uid));
        const qTasksAdmin = rQuery(tasksRef, orderByChild('adminId'), equalTo(user.uid));

        const [snapTasksUser, snapTasksAdmin] = await Promise.all([
            get(qTasksUser),
            get(qTasksAdmin)
        ]);

        let pendingCount = 0;
        const processedTaskIds = new Set();

        const countPending = (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                Object.keys(data).forEach(key => {
                    if (!processedTaskIds.has(key)) {
                        processedTaskIds.add(key);
                        // Verifica se status é 'pending' ou se não tem status (assume pending)
                        const status = data[key].status || 'pending';
                        if (status === 'pending') {
                            pendingCount++;
                        }
                    }
                });
            }
        };

        countPending(snapTasksUser);
        countPending(snapTasksAdmin);

        setStats(prev => ({
          ...prev,
          voters: votersCount,
          team: teamCount,
          pendingTasks: pendingCount
        }));
        setBirthdays(todaysBirthdays);
      } catch (error) {
        console.error("Erro ao carregar estatísticas:", error);
      }
    };

    fetchStats();
  }, [user]);

  const handleWhatsApp = (phone, name) => {
    if (!phone) return alert("Telefone não cadastrado.");
    let cleanPhone = phone.replace(/\D/g, '');
    // Adiciona DDI 55 se não tiver (assumindo números BR)
    if (cleanPhone.length <= 11) {
      cleanPhone = '55' + cleanPhone;
    }
    const message = `Parabéns ${name}! Feliz aniversário! 🎉`;
    
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const url = isMobile 
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`
      : `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;

    window.open(url, '_blank');
  };

  return (
    <>
    
      <div className="dashboard-card welcome-card" style={{ padding: '15px', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Bem-vindo ao Painel!</h3>
      </div>

      <div className="dashboard-card" style={{ marginTop: '20px' }}>
        <h3>🎉 Aniversariantes do Dia</h3>
        {birthdays.length === 0 ? (
          <p style={{ color: '#64748b', marginTop: '10px' }}>Nenhum aniversariante hoje.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
            {birthdays.map(voter => (
              <div key={voter.id} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '10px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}>
                <div>
                  <strong style={{ display: 'block', color: '#0f172a' }}>{voter.nome}</strong>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{voter.telefone || 'Sem telefone'}</span>
                </div>
                <button 
                  onClick={() => handleWhatsApp(voter.telefone, voter.nome)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    backgroundColor: '#25D366',
                    color: 'white',
                    border: 'none',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '0.9rem'
                  }}
                >
                  <MessageCircle size={18} />
                  Parabéns
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h4>Total de Eleitores</h4>
          <div className="stat-value">{stats.voters}</div>
          <span className="stat-trend positive">Cadastrados</span>
        </div>
        {userType !== 'assessor' && (
          <div className="stat-card">
            <h4>Equipe Ativa</h4>
            <div className="stat-value">{stats.team}</div>
            <span className="stat-trend">Assessores em campo</span>
          </div>
        )}
        <div className="stat-card">
          <h4>Tarefas Pendentes</h4>
          <div className="stat-value">{stats.pendingTasks}</div>
          <span className="stat-trend">Aguardando conclusão</span>
        </div>
      </div>

      {/* Novos Gráficos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '20px' }}>
        
        {/* Gráfico de Idade */}
        <div className="dashboard-card">
            <h3>Eleitores por Idade</h3>
            <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartsData.age}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{fill: '#64748b', fontSize: 12}} />
                        <YAxis tick={{fill: '#64748b', fontSize: 12}} allowDecimals={false} />
                        <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                        <Bar dataKey="value" fill="#3b82f6" name="Eleitores" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Gráfico de Sexo */}
        <div className="dashboard-card">
            <h3>Eleitores por Sexo</h3>
            <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartsData.sex}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {chartsData.sex.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none' }} />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Gráfico de Bairros */}
        <div className="dashboard-card">
            <h3>Top Bairros</h3>
            <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartsData.neighborhood} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                        <XAxis type="number" tick={{fill: '#64748b', fontSize: 12}} allowDecimals={false} />
                        <YAxis dataKey="name" type="category" width={100} tick={{fill: '#64748b', fontSize: 11}} />
                        <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                        <Bar dataKey="value" fill="#10b981" name="Eleitores" radius={[0, 4, 4, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Gráfico de Zonas */}
        <div className="dashboard-card">
            <h3>Eleitores por Zona</h3>
            <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartsData.zone}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{fill: '#64748b', fontSize: 12}} />
                        <YAxis tick={{fill: '#64748b', fontSize: 12}} allowDecimals={false} />
                        <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                        <Bar dataKey="value" fill="#f59e0b" name="Eleitores" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

      </div>

      <div className="dashboard-card" style={{ marginTop: '20px' }}>
        <h3>Evolução de Cadastros</h3>
        <div style={{ width: '100%', height: 300, marginTop: '20px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} allowDecimals={false} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
              />
              <Line type="monotone" dataKey="count" stroke="#4ADE80" strokeWidth={3} dot={{ r: 4, fill: '#4ADE80', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} name="Novos Eleitores" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      
    </>
  );
}