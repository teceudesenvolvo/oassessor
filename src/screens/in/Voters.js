import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, Map, FileDown, UserPlus } from 'lucide-react';
import { ref, query, orderByChild, equalTo, onValue } from 'firebase/database';
import { database } from '../../firebaseConfig';
import { useAuth } from '../../useAuth';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Voters() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [voters, setVoters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) return;

    const votersRef = ref(database, 'eleitores');
    const q = query(votersRef, orderByChild('creatorId'), equalTo(user.uid));
    
    const unsubscribe = onValue(q, (snapshot) => {
      const data = snapshot.val();
      const votersList = data 
        ? Object.keys(data).map(key => ({ id: key, ...data[key] })) 
        : [];
      setVoters(votersList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const filteredVoters = voters.filter(voter => {
    const term = searchTerm.toLowerCase();
    return (
      (voter.nome && voter.nome.toLowerCase().includes(term)) ||
      (voter.email && voter.email.toLowerCase().includes(term)) ||
      (voter.telefone && voter.telefone.includes(term))
    );
  });

  const generatePdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' });

    doc.text("Lista de Eleitores", 14, 15);

    // Selecionamos as colunas mais relevantes para a planilha
    const tableColumn = ["Nome", "Telefone", "Email", "Endereço", "Bairro", "Cidade", "CPF"];
    const tableRows = [];

    filteredVoters.forEach(voter => {
        const voterData = [
            voter.nome || '',
            voter.telefone || '',
            voter.email || '',
            `${voter.endereco || ''}, ${voter.numero || ''}`,
            voter.bairro || '',
            voter.cidade || '',
            voter.cpf || '',
        ];
        tableRows.push(voterData);
    });

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 20,
        theme: 'striped',
        styles: { fontSize: 8 },
    });

    doc.save('lista_eleitores.pdf');
  };

  return (
    <div className="dashboard-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h3>Base de Eleitores</h3>
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
          <button className="icon-btn" onClick={() => navigate('/dashboard/voters/new')} title="Novo Eleitor" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px', width: 'auto', height: 'auto', backgroundColor: '#dcfce7', color: '#166534' }}>
            <UserPlus size={20} />
          </button>
          <button className="icon-btn" onClick={() => navigate('/dashboard/voters/map')} title="Ver no Mapa" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px', width: 'auto', height: 'auto', backgroundColor: '#f8fafc' }}>
            <Map size={20} color="#3b82f6" />
          </button>
          <button onClick={generatePdf} className="icon-btn" title="Gerar PDF" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px', width: 'auto', height: 'auto', backgroundColor: '#f8fafc' }}>
            <FileDown size={20} color="#ef4444" />
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>Carregando eleitores...</div>
      ) : filteredVoters.length === 0 ? (
        voters.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
            <p style={{ marginBottom: '20px' }}>Nenhum eleitor cadastrado ainda.</p>
            <button className="btn-primary">Importar Lista de Contatos</button>
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