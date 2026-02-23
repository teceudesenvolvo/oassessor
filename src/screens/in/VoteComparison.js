import React, { useState, useEffect } from 'react';
import { Search, X, BarChart2, AlertCircle, Check, ChevronDown, RefreshCw } from 'lucide-react';

// Constantes da API do TSE 2024
const BASE_URL = 'https://resultados.tse.jus.br/oficial/ele2024/divulgacao/oficial';
const ELEICAO_ID = '619'; // 1º Turno
const CONFIG_URL = `${BASE_URL}/${ELEICAO_ID}/config/mun-e000${ELEICAO_ID}-cm.json`;

export default function VoteComparison() {
  // Estados de Filtro
  const [year, setYear] = useState('2024');
  const [ufs, setUfs] = useState([]);
  const [selectedUf, setSelectedUf] = useState('');
  const [municipalities, setMunicipalities] = useState([]);
  const [selectedMun, setSelectedMun] = useState('');
  const [manualCity, setManualCity] = useState('');
  const [role, setRole] = useState('0011'); // 0011 = Prefeito, 0013 = Vereador

  // Estados de Dados
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMun, setLoadingMun] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState('');

  // Carregar lista de municípios ao iniciar
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch(CONFIG_URL);
        if (!response.ok) {
            // Se falhar (404), lançamos erro para cair no catch e usar o fallback
            throw new Error(`Configuração TSE não encontrada (${response.status})`);
        }
        const data = await response.json();
        setUfs(data.abr);
        setLoadingMun(false);
      } catch (err) {
        console.warn("Aviso: Lista de municípios automática indisponível. Ativando modo manual.", err.message);
        // Fallback para UFs para permitir a digitação manual do código da cidade
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
        setMunicipalities(ufData.mu || []);
      }
    } else {
      setMunicipalities([]);
    }
    setSelectedMun('');
    setManualCity('');
    setCandidates([]);
    setSelectedCandidates([]);
    setLastUpdate('');
  }, [selectedUf, ufs]);

  // Buscar resultados quando os filtros mudam
  useEffect(() => {
    // Dispara automaticamente apenas se houver município selecionado via lista (selectedMun)
    // ou se já houver uma cidade manual definida e o usuário trocar o ano/cargo.
    if (selectedUf && (selectedMun || (manualCity && manualCity.length >= 4)) && role && year) {
      fetchResults();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUf, selectedMun, role, year]);

  const fetchResults = async () => {
    setLoading(true);
    setError('');
    setCandidates([]);
    setLastUpdate('');

    const cityCode = selectedMun || manualCity;

    try {
      if (year === '2024') {
        // --- LÓGICA TSE 2024 (TEMPO REAL) ---
        const ufLower = selectedUf.toLowerCase();
        const url = `${BASE_URL}/${ELEICAO_ID}/dados/${ufLower}/${ufLower}${cityCode}-c${role}-e000${ELEICAO_ID}-w.json`;

        const response = await fetch(url);
        if (!response.ok) throw new Error('Aguardando dados do TSE...');
        
        const data = await response.json();
        
        if (data.dg && data.hg) {
          setLastUpdate(`${data.dg} às ${data.hg}`);
        }

        const candList = data.abr[0]?.cand || [];
        
        const formattedCands = candList.map(c => ({
          id: c.sqcand,
          name: c.nm,
          number: c.n,
          party: c.sgp,
          votes: parseInt(c.vap), // Votos Apurados
          percent: c.pvap, // Percentual
          status: c.st, // Eleito, Não Eleito, etc.
          imgStatus: c.st 
        })).sort((a, b) => b.votes - a.votes);

        setCandidates(formattedCands);

      } else {
        // --- LÓGICA CEPESP (HISTÓRICO) ---
        const roleInt = parseInt(role);
        // Garante que o código do município tenha 5 dígitos (padrão TSE)
        const formattedCityCode = cityCode.padStart(5, '0');
        
        // URL da API CEPESP para consulta agregada por município
        const url = `https://cepesp.io/api/consulta/tse?table=votacao_candidato_munzona&ano=${year}&uf=${selectedUf}&cod_mun_tse=${formattedCityCode}&cargo=${roleInt}&agregacao_regional=6&agregacao_politica=2`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Erro ao buscar dados históricos do CEPESP.');
        
        const json = await response.json();
        const rows = json.data || json || [];

        if (rows.length === 0) {
            setError(`Nenhum resultado encontrado para ${year}.`);
            setLoading(false);
            return;
        }

        // Calcular total de votos para porcentagem
        const totalVotes = rows.reduce((acc, curr) => acc + (curr.QTDE_VOTOS || 0), 0);

        const formattedCands = rows.map((c, index) => ({
            id: c.NUMERO_CANDIDATO || index,
            name: c.NOME_URNA_CANDIDATO || c.NOME_CANDIDATO,
            number: String(c.NUMERO_CANDIDATO),
            party: c.SIGLA_PARTIDO,
            votes: c.QTDE_VOTOS,
            percent: totalVotes > 0 ? ((c.QTDE_VOTOS / totalVotes) * 100).toFixed(2).replace('.', ',') : '0,00',
            status: c.DESC_SIT_TOT_TURNO || 'FIM',
            imgStatus: ''
        })).sort((a, b) => b.votes - a.votes);

        setCandidates(formattedCands);
        setLastUpdate('Base Histórica CEPESP');
      }

    } catch (err) {
      console.error(err);
      if (year === '2024') {
        setError("Aguardando início da apuração ou dados indisponíveis.");
      } else {
        setError("Não foi possível carregar o histórico. Verifique se o código da cidade está correto ou tente mais tarde.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCandidate = (candidate) => {
    if (selectedCandidates.find(c => c.id === candidate.id)) {
      setSelectedCandidates(prev => prev.filter(c => c.id !== candidate.id));
    } else {
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
    <div className="dashboard-card">
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3>Comparativo Eleições</h3>
          <p style={{ color: '#64748b', marginBottom: '5px' }}>
            {year === '2024' ? 'Acompanhamento em Tempo Real (TSE)' : `Histórico de Resultados ${year} (CEPESP)`}
          </p>
          {lastUpdate && (
            <span style={{ fontSize: '0.75rem', color: '#0f172a', backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <RefreshCw size={12} /> Atualizado: {lastUpdate}
            </span>
          )}
        </div>
      </div>
          
      {/* Filtros */}
      <div className="filters-grid" style={{ marginBottom: '20px' }}>
        
        <div className="input-group">
          <label className="field-label">Ano</label>
          <div className="select-wrapper">
            <select className="custom-input" value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="2024">2024</option>
              <option value="2020">2020</option>
              <option value="2016">2016</option>
            </select>
            <ChevronDown className="select-icon" size={16} />
          </div>
        </div>

        <div className="input-group">
          <label className="field-label">Estado</label>
          <div className="select-wrapper">
            <select className="custom-input" value={selectedUf} onChange={(e) => setSelectedUf(e.target.value)} disabled={loadingMun}>
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
            {municipalities.length > 0 ? (
              <>
                <select className="custom-input" value={selectedMun} onChange={(e) => setSelectedMun(e.target.value)} disabled={!selectedUf}>
                  <option value="">Selecione a Cidade</option>
                  {municipalities.map(mun => (
                    <option key={mun.cd} value={mun.cd}>{mun.nm}</option>
                  ))}
                </select>
                <ChevronDown className="select-icon" size={16} />
              </>
            ) : (
              <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                <input 
                  type="text"
                  className="custom-input"
                  placeholder={selectedUf ? "Cód. TSE (ex: 13196)" : "Selecione UF"}
                  value={manualCity}
                  onChange={(e) => setManualCity(e.target.value)}
                  disabled={!selectedUf}
                  style={{ flex: 1 }}
                />
                <button 
                  className="btn-primary" 
                  onClick={fetchResults}
                  disabled={!manualCity || manualCity.length < 4 || loading}
                  style={{ padding: '0 15px', borderRadius: '8px', fontSize: '0.9rem' }}
                >
                  Buscar
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="input-group">
          <label className="field-label">Cargo</label>
          <div className="select-wrapper">
            <select className="custom-input" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="0011">Prefeito</option>
              <option value="0013">Vereador</option>
            </select>
            <ChevronDown className="select-icon" size={16} />
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
      {selectedUf && (selectedMun || manualCity) && !loading && candidates.length > 0 && (
        <div className="comparison-layout">
          
          {/* Coluna da Esquerda: Busca e Lista */}
          <div className="candidate-list-section dashboard-card" style={{ border: '1px solid #e2e8f0', boxShadow: 'none' }}>
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
                      {cand.status && (
                        <div className="stat-row">
                          <span className="stat-label">Situação</span>
                          <span className="stat-value" style={{ fontSize: '0.8rem' }}>{cand.status}</span>
                        </div>
                      )}
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
          <p>Buscando dados...</p>
        </div>
      )}
    </div>
  );
}