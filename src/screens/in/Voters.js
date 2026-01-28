import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, Map, FileDown, UserPlus, Link as LinkIcon, Filter } from 'lucide-react';
import { ref, query, orderByChild, equalTo, onValue, get } from 'firebase/database';
import { database } from '../../firebaseConfig';
import { useAuth } from '../../useAuth';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import LogoAzul from '../../assets/logomarca-vertical-azul.png';

export default function Voters() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [voters, setVoters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [assessors, setAssessors] = useState([]);
  const [filterOwner, setFilterOwner] = useState('all');
  const [filterCity, setFilterCity] = useState('');
  const [filterNeighborhood, setFilterNeighborhood] = useState('');
  const [filterZone, setFilterZone] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterPollingPlace, setFilterPollingPlace] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!user) return;

    let unsubscribes = [];

    const fetchData = async () => {
      try {
        // 1. Verificar se o usuário é admin na coleção 'users'
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
        setIsAdmin(isUserAdmin);

        const votersRef = ref(database, 'eleitores');

        if (isUserAdmin) {
          // 2. Se admin, buscar assessores vinculados pelo adminId
          const assessoresRef = ref(database, 'assessores');
          const qAssessors = query(assessoresRef, orderByChild('adminId'), equalTo(user.uid));
          const assessorsSnapshot = await get(qAssessors);
          
          const idsToFilter = new Set();
          const emailsToFilter = new Set();
          idsToFilter.add(user.uid); // Inclui o próprio admin

          if (assessorsSnapshot.exists()) {
            const assessorsData = assessorsSnapshot.val();
            const assessorsList = [];
            Object.keys(assessorsData).forEach(key => {
              const assessor = { id: key, ...assessorsData[key] };
              assessorsList.push(assessor);
              
              if (assessor.userId) {
                idsToFilter.add(assessor.userId);
              } else if (assessor.email) {
                // Fallback: Se não tiver userId, usa o email
                emailsToFilter.add(assessor.email);
              }
            });
            setAssessors(assessorsList);
          }

          // 3. Filtrar eleitores pelos IDs encontrados (creatorId)
          let votersMap = {};

          const updateVotersList = () => {
            let allVoters = {};
            Object.values(votersMap).forEach(group => {
              Object.assign(allVoters, group);
            });
            const list = Object.keys(allVoters).map(key => ({ id: key, ...allVoters[key] }));
            setVoters(list);
            setLoading(false);
          };

          if (idsToFilter.size === 0 && emailsToFilter.size === 0) {
             setVoters([]);
             setLoading(false);
          }

          idsToFilter.forEach(id => {
            const qVoter = query(votersRef, orderByChild('creatorId'), equalTo(id));
            const unsub = onValue(qVoter, (snapshot) => {
              const data = snapshot.val() || {};
              votersMap[`id_${id}`] = data;
              updateVotersList();
            });
            unsubscribes.push(unsub);
          });

          // Busca também por email (para assessores sem userId vinculado ou legados)
          emailsToFilter.forEach(email => {
            const qVoter = query(votersRef, orderByChild('creatorEmail'), equalTo(email));
            const unsub = onValue(qVoter, (snapshot) => {
              const data = snapshot.val() || {};
              votersMap[`email_${email}`] = data;
              updateVotersList();
            });
            unsubscribes.push(unsub);
          });

        } else {
          // Se não for admin (assessor), busca apenas os seus criados pelo creatorId
          const qCreator = query(votersRef, orderByChild('creatorId'), equalTo(user.uid));
          const unsub = onValue(qCreator, (snapshot) => {
            const data = snapshot.val();
            const list = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
            setVoters(list);
            setLoading(false);
          });
          unsubscribes.push(unsub);
        }

      } catch (error) {
        console.error("Erro ao buscar dados:", error);
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [user]);

  const uniqueCities = [...new Set(voters.map(v => v.cidade).filter(Boolean))].sort();
  const uniqueNeighborhoods = [...new Set(voters.map(v => v.bairro).filter(Boolean))].sort();
  const uniqueZones = [...new Set(voters.map(v => v.zona).filter(Boolean))].sort((a, b) => a - b);
  const uniqueSections = [...new Set(voters.map(v => v.secao).filter(Boolean))].sort((a, b) => a - b);
  const uniquePollingPlaces = [...new Set(voters.map(v => v.localVotacao).filter(Boolean))].sort();

  const filteredVoters = voters.filter(voter => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = (
      (voter.nome && voter.nome.toLowerCase().includes(term)) ||
      (voter.email && voter.email.toLowerCase().includes(term)) ||
      (voter.telefone && voter.telefone.includes(term))
    );

    let matchesOwner = true;
    if (isAdmin) {
      if (filterOwner === 'me') {
        matchesOwner = voter.creatorId === user.uid;
      } else if (filterOwner !== 'all') {
        // Verifica tanto ID quanto Email para garantir compatibilidade
        matchesOwner = voter.creatorId === filterOwner || voter.creatorEmail === filterOwner;
      }
    }

    const matchesCity = filterCity ? voter.cidade === filterCity : true;
    const matchesNeighborhood = filterNeighborhood ? voter.bairro === filterNeighborhood : true;
    const matchesZone = filterZone ? voter.zona === filterZone : true;
    const matchesSection = filterSection ? voter.secao === filterSection : true;
    const matchesPollingPlace = filterPollingPlace ? voter.localVotacao === filterPollingPlace : true;

    return matchesSearch && matchesOwner && matchesCity && matchesNeighborhood && matchesZone && matchesSection && matchesPollingPlace;
  });

  const generatePdf = async () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // 1. Logo e Cabeçalho
    try {
        const img = new Image();
        img.src = LogoAzul;
        await new Promise((resolve) => {
            if (img.complete) resolve();
            img.onload = resolve;
            img.onerror = resolve;
        });
        const w = 25; 
        const h = (img.height * w) / img.width;
        doc.addImage(img, 'PNG', 14, 10, w, h);
    } catch (error) {
        console.error("Erro ao carregar logo", error);
    }

    doc.setFontSize(12);
    doc.setTextColor(40);
    doc.text("", pageWidth - 14, 20, { align: 'right' });

    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text("Lista de Eleitores", 14, 40);

    doc.setFontSize(10);
    doc.setTextColor(100);

    let filterDesc = [];
    if (searchTerm) filterDesc.push(`Busca: "${searchTerm}"`);
    if (filterCity) filterDesc.push(`Cidade: ${filterCity}`);
    if (filterNeighborhood) filterDesc.push(`Bairro: ${filterNeighborhood}`);
    if (filterZone) filterDesc.push(`Zona: ${filterZone}`);
    if (filterSection) filterDesc.push(`Seção: ${filterSection}`);
    if (filterPollingPlace) filterDesc.push(`Local: ${filterPollingPlace.split(' - ')[0]}`);
    
    if (isAdmin && filterOwner !== 'all') {
         if (filterOwner === 'me') {
             filterDesc.push(`Responsável: Meus Cadastros`);
         } else {
             const owner = assessors.find(a => a.userId === filterOwner || a.email === filterOwner);
             if (owner) filterDesc.push(`Responsável: ${owner.nome || owner.email}`);
         }
    }

    let y = 48;
    if (filterDesc.length > 0) {
        const text = `Filtros ativos: ${filterDesc.join(' | ')}`;
        const splitText = doc.splitTextToSize(text, pageWidth - 28);
        doc.text(splitText, 14, y);
        y += (splitText.length * 5);
    }
    doc.text(`Total: ${filteredVoters.length} registros`, 14, y);

    // Selecionamos as colunas mais relevantes para a planilha
    const tableColumn = [
      "Nome", 
      "Telefone", 
      "Nascimento", 
      "Endereço", 
      "Número", 
      "Bairro", 
      "Cidade", 
      "Estado", 
      "Local Votação", 
      "Zona", 
      "Seção", 
      "Título", 
      "ZonaSecao", 
      "Tipo", 
      "Atualizado"
    ];
    const tableRows = [];

    filteredVoters.forEach(voter => {
        let nascimento = voter.nascimento || '';
        if (nascimento.includes('-')) {
            const parts = nascimento.split('-');
            if (parts.length === 3) nascimento = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }

        let updatedAt = '';
        if (voter.updatedAt) {
            const d = new Date(voter.updatedAt);
            updatedAt = d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        }

        const voterData = [
            voter.nome || '',
            voter.telefone || '',
            nascimento,
            voter.endereco || '',
            voter.numero || '',
            voter.bairro || '',
            voter.cidade || '',
            voter.estado || '',
            (voter.localVotacao || '').split(' - ')[0],
            voter.zona || '',
            voter.secao || '',
            voter.titulo || '',
            voter.zonaSecao || '',
            voter.tipoUser || '',
            updatedAt
        ];
        tableRows.push(voterData);
    });

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: y + 5,
        theme: 'striped',
        styles: { fontSize: 6, cellPadding: 1 },
        headStyles: { fillColor: '#0F172A' },
        didDrawPage: (data) => {
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text("Desenvolvido por Blu Tecnologias", pageWidth / 2, pageHeight - 10, { align: 'center' });
        }
    });

    doc.save('lista_eleitores_o_assessor`.pdf');
  };

  const copyVoterFormLink = () => {
    if (!user) return;
    const link = `${window.location.origin}/eleitor-form?userId=${user.uid}&email=${encodeURIComponent(user.email)}`;
    navigator.clipboard.writeText(link).then(() => {
      alert('Link copiado para a área de transferência!');
    }).catch(err => {
      console.error('Erro ao copiar link:', err);
    });
  };

  return (
    <div className="dashboard-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h3>Base ({filteredVoters?.length || 0} eleitores)</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div className="search-box" style={{ display: 'flex' }}>
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Buscar eleitor..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {isAdmin && (
            <select 
              className="custom-input" 
              style={{ width: 'auto', padding: '8px', height: '40px' }}
              value={filterOwner}
              onChange={(e) => setFilterOwner(e.target.value)}
            >
              <option value="all">Todos os Cadastros</option>
              <option value="me">Meus Cadastros</option>
              {assessors.map(assessor => (
                <option key={assessor.id} value={assessor.userId || assessor.email}>{assessor.nome || assessor.email}</option>
              ))}
            </select>
          )}

          <button className="icon-btn" onClick={copyVoterFormLink} title="Link de Cadastro" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px', width: 'auto', height: 'auto', backgroundColor: '#f8fafc' }}>
            <LinkIcon size={20} color="#64748b" />
          </button>
          <button className="icon-btn" onClick={() => navigate('/dashboard/voters/new')} title="Novo Eleitor" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px', width: 'auto', height: 'auto', backgroundColor: '#dcfce7', color: '#166534' }}>
            <UserPlus size={20} />
          </button>
          <button className="icon-btn" onClick={() => navigate('/dashboard/voters/map')} title="Ver no Mapa" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px', width: 'auto', height: 'auto', backgroundColor: '#f8fafc' }}>
            <Map size={20} color="#3b82f6" />
          </button>
          <button className={`icon-btn ${showFilters ? 'active' : ''}`} onClick={() => setShowFilters(!showFilters)} title="Filtros Avançados" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px', width: 'auto', height: 'auto', backgroundColor: showFilters ? '#e0f2fe' : '#f8fafc', color: showFilters ? '#0284c7' : '#64748b' }}>
            <Filter size={20} />
          </button>
          <button onClick={generatePdf} className="icon-btn" title="Gerar PDF" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px', width: 'auto', height: 'auto', backgroundColor: '#f8fafc' }}>
            <FileDown size={20} color="#ef4444" />
          </button>
        </div>
      </div>

      {showFilters && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '20px', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <select className="custom-input" value={filterCity} onChange={e => setFilterCity(e.target.value)} style={{ padding: '8px' }}>
                <option value="">Todas as Cidades</option>
                {uniqueCities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="custom-input" value={filterNeighborhood} onChange={e => setFilterNeighborhood(e.target.value)} style={{ padding: '8px' }}>
                <option value="">Todos os Bairros</option>
                {uniqueNeighborhoods.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <select className="custom-input" value={filterZone} onChange={e => setFilterZone(e.target.value)} style={{ padding: '8px' }}>
                <option value="">Todas as Zonas</option>
                {uniqueZones.map(z => <option key={z} value={z}>{z}</option>)}
            </select>
            <select className="custom-input" value={filterSection} onChange={e => setFilterSection(e.target.value)} style={{ padding: '8px' }}>
                <option value="">Todas as Seções</option>
                {uniqueSections.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="custom-input" value={filterPollingPlace} onChange={e => setFilterPollingPlace(e.target.value)} style={{ padding: '8px' }}>
                <option value="">Todos os Locais</option>
                {uniquePollingPlaces.map(l => <option key={l} value={l}>{l.split(' - ')[0]}</option>)}
            </select>
            <button onClick={() => {
                setFilterCity(''); setFilterNeighborhood(''); setFilterZone(''); setFilterSection(''); setFilterPollingPlace('');
            }} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', color: '#64748b', fontWeight: '500' }}>
                Limpar Filtros
            </button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>Carregando eleitores...</div>
      ) : filteredVoters.length === 0 ? (
        voters.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
            <p style={{ marginBottom: '20px' }}>Nenhum eleitor cadastrado ainda.</p>
            
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
            <p>Nenhum eleitor encontrado para esta busca.</p>
          </div>
        )
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {filteredVoters.map(voter => (
            <li key={voter.id} style={{ padding: '15px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 'bold', color: '#0f172a' }}>{voter.nome}</div>
                <div style={{ fontSize: '0.9rem', color: '#64748b' }}>{voter.telefone || voter.email}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  {voter.bairro || 'Sem bairro'}
                </div>
                <button 
                  className="icon-btn" 
                  onClick={() => navigate(`/dashboard/voters/${voter.id}`)} 
                  title="Ver Detalhes"
                  style={{
                    backgroundColor: '#dcfce7',
                    color: '#16a34a',
                    borderRadius: '8px',
                    padding: '5px'
                  }}>
                  <Eye size={20} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}