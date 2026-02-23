import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import { Search, X, BarChart2, AlertCircle, Check, ChevronDown } from 'lucide-react';

// Constantes da API do TSE 2024
const BASE_URL = 'https://resultados.tse.jus.br/oficial/ele2024/divulgacao/oficial';
const ELEICAO_ID = '619'; // 1º Turno
const CONFIG_URL = `${BASE_URL}/${ELEICAO_ID}/config/mun-e000${ELEICAO_ID}-cm.json`;

export default function VoteComparison() {
  // Estados de Filtro
  const [ufs, setUfs] = useState([]);
  const [selectedUf, setSelectedUf] = useState('');
  const [municipalities, setMunicipalities] = useState([]);
  const [selectedMun, setSelectedMun] = useState('');
  const [role, setRole] = useState('0011'); // 0011 = Prefeito, 0013 = Vereador

  // Estados de Dados
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMun, setLoadingMun] = useState(true);
  const [error, setError] = useState('');

  // Carregar lista de municípios ao iniciar
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch(CONFIG_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setUfs(data.abr);
        setLoadingMun(false);
      } catch (err) {
        console.warn("Erro ao carregar municípios (fallback ativo):", err);
        // Fallback para UFs se a API falhar
        setUfs([
            { cd: "AC", ds: "Acre", mu: [] }, { cd: "AL", ds: "Alagoas", mu: [] }, { cd: "AP", ds: "Amapá", mu: [] },
            { cd: "AM", ds: "Amazonas", mu: [] }, { cd: "BA", ds: "Bahia", mu: [] }, { cd: "CE", ds: "Ceará", mu: [] },
            { cd: "DF", ds: "Distrito Federal", mu: [] }, { cd: "ES", ds: "Espírito Santo", mu: [] }, { cd: "GO", ds: "Goiás", mu: [] },
            { cd: "MA", ds: "Maranhão", mu: [] }, { cd: "MT", ds: "Mato Grosso", mu: [] }, { cd: "MS", ds: "Mato Grosso do Sul", mu: [] },
            { cd: "MG", ds: "Minas Gerais", mu: [] }, { cd: "PA", ds: "Pará", mu: [] }, { cd: "PB", ds: "Paraíba", mu: [] },
            { cd: "PR", ds: "Paraná", mu: [] }, { cd: "PE", ds: "Pernambuco", mu: [] }, { cd: "PI", ds: "Piauí", mu: [] },
            { cd: "RJ", ds: "Rio de Janeiro", mu: [] }, { cd: "RN", ds: "Rio Grande do Norte", mu: [] }, { cd: "RS", ds: "Rio Grande do Sul", mu: [] },
            { cd: "RO", ds: "Rondônia", mu: [] }, { cd: "RR", ds: "Roraima", mu: [] }, { cd: "SC", ds: "Santa Catarina", mu: [] },
            { cd: "SP", ds: "São Paulo", mu: [] }, { cd: "SE", ds: "Sergipe", mu: [] }, { cd: "TO", ds: "Tocantins", mu: [] }
        ]);
        setLoadingMun(false);
      }
    };
    fetchConfig();
  }, []);

  // Atualizar lista de municípios quando UF muda
  useEffect(() => {
    if (selectedUf) {
      const ufData = ufs.find(u => u.cd.toLowerCase() === selectedUf.toLowerCase());
      if (ufData) {
        setMunicipalities(ufData.mu);
      }
    } else {
      setMunicipalities([]);
    }
    setSelectedMun('');
    setCandidates([]);
    setSelectedCandidates([]);
  }, [selectedUf, ufs]);

  // Buscar resultados quando os filtros mudam
  useEffect(() => {
    if (selectedUf && selectedMun && role) {
      fetchResults();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUf, selectedMun, role]);

  const fetchResults = async () => {
    setLoading(true);
    setError('');
    setCandidates([]);
    setSelectedCandidates([]); // Limpa seleção ao mudar cidade/cargo

    try {
      // Construção da URL do arquivo de dados do TSE
      // Padrão: [BASE]/[ELEICAO]/dados/[UF]/[UF][MUN_CODE]-c[ROLE]-e[ELEICAO]-w.json
      const ufLower = selectedUf.toLowerCase();
      const url = `${BASE_URL}/${ELEICAO_ID}/dados/${ufLower}/${ufLower}${selectedMun}-c${role}-e000${ELEICAO_ID}-w.json`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Arquivo de resultados não encontrado.');
      
      const data = await response.json();
      
      // Processar candidatos
      // O JSON do TSE retorna "abr" -> "cand" (lista)
      const candList = data.abr[0]?.cand || [];
      
      // Mapear para formato mais amigável e ordenar por votos
      const formattedCands = candList.map(c => ({
        id: c.sqcand,
        name: c.nm,
        number: c.n,
        party: c.sgp,
        votes: parseInt(c.vap), // Votos Apurados
        percent: c.pvap, // Percentual
        status: c.st, // Eleito, Não Eleito, etc.
        imgStatus: c.st // Usado para buscar foto se necessário (não implementado aqui para evitar complexidade de URL dinâmica de foto)
      })).sort((a, b) => b.votes - a.votes);

      setCandidates(formattedCands);

    } catch (err) {
      console.error(err);
      setError("Erro ao buscar resultados. Verifique se a apuração já iniciou para esta localidade.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCandidate = (candidate) => {
    if (selectedCandidates.find(c => c.id === candidate.id)) {
      // Remove se já estiver selecionado
      setSelectedCandidates(prev => prev.filter(c => c.id !== candidate.id));
    } else {
      // Adiciona se tiver menos de 3
      if (selectedCandidates.length < 3) {
        setSelectedCandidates(prev => [...prev, candidate]);
      }
    }
  };

  const filteredCandidates = candidates.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.number.includes(searchTerm)
  );

  return (
    <>
      <header className="hero-section" style={{ minHeight: 'auto', paddingBottom: '40px' }}>
        <Navbar />
        <div className="hero-content" style={{ marginTop: '20px' }}>
          <h1>Comparativo Eleições 2024</h1>
          <p className="subtitle">Compare o desempenho de candidatos em tempo real com dados do TSE</p>
        </div>
      </header>

      <main className="content" style={{ marginTop: '-40px', paddingBottom: '80px', paddingLeft: '20px', paddingRight: '20px' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          
          {/* Filtros */}
          <div className="dashboard-card" style={{ marginBottom: '20px' }}>
            <div className="filters-grid">
              <div className="input-group">
                <label className="field-label">Estado</label>
                <div className="select-wrapper">
                  <select 
                    className="custom-input" 
                    value={selectedUf} 
                    onChange={(e) => setSelectedUf(e.target.value)}
                    disabled={loadingMun}
                  >
                    <option value="">Selecione UF</option>
                    {ufs.map(uf => (
                      <option key={uf.cd} value={uf.cd}>{uf.ds} ({uf.cd})</option>
                    ))}
                  </select>
                  <ChevronDown className="select-icon" size={16} />
                </div>
              </div>

              <div className="input-group">
                <label className="field-label">Município</label>
                <div className="select-wrapper">
                  <select 
                    className="custom-input" 
                    value={selectedMun} 
                    onChange={(e) => setSelectedMun(e.target.value)}
                    disabled={!selectedUf}
                  >
                    <option value="">Selecione a Cidade</option>
                    {municipalities.map(mun => (
                      <option key={mun.cd} value={mun.cd}>{mun.nm}</option>
                    ))}
                  </select>
                  <ChevronDown className="select-icon" size={16} />
                </div>
              </div>

              <div className="input-group">
                <label className="field-label">Cargo</label>
                <div className="select-wrapper">
                  <select 
                    className="custom-input" 
                    value={role} 
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="0011">Prefeito</option>
                    <option value="0013">Vereador</option>
                  </select>
                  <ChevronDown className="select-icon" size={16} />
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="error-banner">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {/* Área Principal */}
          {selectedUf && selectedMun && !loading && candidates.length > 0 && (
            <div className="comparison-layout">
              
              {/* Coluna da Esquerda: Busca e Lista */}
              <div className="candidate-list-section dashboard-card">
                <h3>Selecione Candidatos ({selectedCandidates.length}/3)</h3>
                
                <div className="search-box-voter">
                  <Search size={18} color="#64748b" />
                  <input 
                    type="text" 
                    placeholder="Buscar por nome ou número..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="candidates-scroll">
                  {filteredCandidates.map(candidate => {
                    const isSelected = selectedCandidates.find(c => c.id === candidate.id);
                    return (
                      <div 
                        key={candidate.id} 
                        className={`candidate-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSelectCandidate(candidate)}
                      >
                        <div className="candidate-info">
                          <span className="candidate-number">{candidate.number}</span>
                          <div>
                            <div className="candidate-name">{candidate.name}</div>
                            <div className="candidate-party">{candidate.party}</div>
                          </div>
                        </div>
                        {isSelected && <Check size={18} color="#10b981" />}
                      </div>
                    );
                  })}
                  {filteredCandidates.length === 0 && (
                    <p className="no-results">Nenhum candidato encontrado.</p>
                  )}
                </div>
              </div>

              {/* Coluna da Direita: Comparativo */}
              <div className="comparison-view-section">
                {selectedCandidates.length === 0 ? (
                  <div className="empty-state-card">
                    <BarChart2 size={48} color="#cbd5e1" />
                    <p>Selecione até 3 candidatos na lista ao lado para comparar seus votos.</p>
                  </div>
                ) : (
                  <div className="comparison-cards-container">
                    {selectedCandidates.map((cand, index) => (
                      <div key={cand.id} className="comparison-card fade-in">
                        <div className="card-header-comp">
                          <span className="rank-badge">#{candidates.findIndex(c => c.id === cand.id) + 1}</span>
                          <button className="remove-btn" onClick={() => handleSelectCandidate(cand)}>
                            <X size={16} />
                          </button>
                        </div>
                        
                        <div className="cand-avatar-placeholder">
                          {cand.name.charAt(0)}
                        </div>
                        
                        <h3 className="comp-name">{cand.name}</h3>
                        <p className="comp-party">{cand.party} - {cand.number}</p>
                        
                        <div className="comp-stats">
                          <div className="stat-row">
                            <span className="stat-label">Votos</span>
                            <span className="stat-value">{cand.votes.toLocaleString('pt-BR')}</span>
                          </div>
                          <div className="stat-row">
                            <span className="stat-label">Porcentagem</span>
                            <span className="stat-value highlight">{cand.percent}%</span>
                          </div>
                        </div>

                        <div className="vote-bar-bg">
                          <div 
                            className="vote-bar-fill" 
                            style={{ width: `${parseFloat(cand.percent.replace(',', '.'))}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {loading && (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Buscando dados no TSE...</p>
            </div>
          )}

        </div>
      </main>
    </>
  );
}