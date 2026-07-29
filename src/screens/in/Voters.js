import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, Map, FileDown, UserPlus, Link as LinkIcon, Filter, List, LayoutGrid } from 'lucide-react';
import { ref, query, orderByChild, equalTo, onValue, get } from '../../services/firestoreDatabase';
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
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('oassessor-voters-view') || 'cards');

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
            const list = Object.keys(allVoters).map(key => {
              const v = allVoters[key];
              return {
                id: key,
                ...v,
                endereco: v.endereco ? v.endereco.trim().toUpperCase() : '',
                bairro: v.bairro ? v.bairro.trim().toUpperCase() : '',
                cidade: v.cidade ? v.cidade.trim().toUpperCase() : '',
                localVotacao: v.localVotacao ? v.localVotacao.trim().toUpperCase() : ''
              };
            });
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
            const list = data ? Object.keys(data).map(key => {
              const v = data[key];
              return {
                id: key,
                ...v,
                endereco: v.endereco ? v.endereco.trim().toUpperCase() : '',
                bairro: v.bairro ? v.bairro.trim().toUpperCase() : '',
                cidade: v.cidade ? v.cidade.trim().toUpperCase() : '',
                localVotacao: v.localVotacao ? v.localVotacao.trim().toUpperCase() : ''
              };
            }) : [];
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

  useEffect(() => {
    localStorage.setItem('oassessor-voters-view', viewMode);
  }, [viewMode]);

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
    <div className="dashboard-card voters-shell">
      <div className="voters-toolbar">
        <h3>Base ({filteredVoters?.length || 0} eleitores)</h3>
        <div className="voters-toolbar-actions">
          <label className="funnel-search-box voters-search-box">
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Buscar eleitor..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </label>
          
          {isAdmin && (
            <select 
              className="campaign-filter-select voters-owner-filter"
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

          <button className="icon-btn voters-action-btn" onClick={copyVoterFormLink} title="Link de Cadastro">
            <LinkIcon size={20} color="#64748b" />
          </button>
          <button className="icon-btn voters-action-btn is-primary" onClick={() => navigate('/dashboard/voters/new')} title="Novo Eleitor">
            <UserPlus size={20} />
          </button>
          <button className="icon-btn voters-action-btn" onClick={() => navigate('/dashboard/voters/map')} title="Ver no Mapa">
            <Map size={20} color="#3b82f6" />
          </button>
          <button className={`icon-btn voters-action-btn ${showFilters ? 'active' : ''}`} onClick={() => setShowFilters(!showFilters)} title="Filtros Avançados">
            <Filter size={20} />
          </button>
          <button onClick={generatePdf} className="icon-btn voters-action-btn" title="Gerar PDF">
            <FileDown size={20} color="#ef4444" />
          </button>
          <div className="funnel-view-switch voters-view-switch">
            <button className={viewMode === 'cards' ? 'active' : ''} onClick={() => setViewMode('cards')} type="button">
              <LayoutGrid size={16} />
              Cards
            </button>
            <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')} type="button">
              <List size={16} />
              Lista
            </button>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="voters-filters-panel">
            <select className="campaign-filter-select" value={filterCity} onChange={e => setFilterCity(e.target.value)}>
                <option value="">Todas as Cidades</option>
                {uniqueCities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="campaign-filter-select" value={filterNeighborhood} onChange={e => setFilterNeighborhood(e.target.value)}>
                <option value="">Todos os Bairros</option>
                {uniqueNeighborhoods.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <select className="campaign-filter-select" value={filterZone} onChange={e => setFilterZone(e.target.value)}>
                <option value="">Todas as Zonas</option>
                {uniqueZones.map(z => <option key={z} value={z}>{z}</option>)}
            </select>
            <select className="campaign-filter-select" value={filterSection} onChange={e => setFilterSection(e.target.value)}>
                <option value="">Todas as Seções</option>
                {uniqueSections.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="campaign-filter-select" value={filterPollingPlace} onChange={e => setFilterPollingPlace(e.target.value)}>
                <option value="">Todos os Locais</option>
                {uniquePollingPlaces.map(l => <option key={l} value={l}>{l.split(' - ')[0]}</option>)}
            </select>
            <button className="btn-secondary voters-clear-btn" onClick={() => {
                setFilterCity(''); setFilterNeighborhood(''); setFilterZone(''); setFilterSection(''); setFilterPollingPlace('');
            }}>
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
      ) : viewMode === 'list' ? (
        <ul className="voters-list-scroll">
          {filteredVoters.map(voter => (
            <li key={voter.id} className="voters-list-item">
              <div className="voters-list-copy">
                <div className="voters-list-name">{voter.nome}</div>
                <div className="voters-list-contact">{voter.telefone || voter.email}</div>
              </div>
              <div className="voters-list-meta">
                <div className="voters-stage-pill">
                  {voter.funnelStage || voter.etapa || 'Não contatado'}
                </div>
                <div className="voters-list-neighborhood">
                  {voter.bairro || 'Sem bairro'}
                </div>
                <button 
                  className="icon-btn voters-detail-btn" 
                  onClick={() => navigate(`/dashboard/voters/${voter.id}`)} 
                  title="Ver Detalhes">
                  <Eye size={20} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="voters-cards-grid">
          {filteredVoters.map((voter) => (
            <article key={voter.id} className="voters-card-item">
              <div className="voters-card-head">
                <div className="voters-list-copy">
                  <div className="voters-list-name">{voter.nome}</div>
                  <div className="voters-list-contact">{voter.telefone || voter.email || 'Sem contato principal'}</div>
                </div>
                <div className="voters-stage-pill">
                  {voter.funnelStage || voter.etapa || 'Não contatado'}
                </div>
              </div>
              <div className="voters-card-body">
                <div className="voters-card-field">
                  <span>Bairro</span>
                  <strong>{voter.bairro || 'Sem bairro'}</strong>
                </div>
                <div className="voters-card-field">
                  <span>Cidade</span>
                  <strong>{voter.cidade || 'Sem cidade'}</strong>
                </div>
                <div className="voters-card-field">
                  <span>Zona / Seção</span>
                  <strong>{[voter.zona, voter.secao].filter(Boolean).join(' / ') || 'Não informado'}</strong>
                </div>
              </div>
              <div className="voters-card-actions">
                <button
                  className="icon-btn voters-detail-btn"
                  onClick={() => navigate(`/dashboard/voters/${voter.id}`)}
                  title="Ver Detalhes"
                  type="button"
                >
                  <Eye size={20} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
