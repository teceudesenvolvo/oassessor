import React, { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowLeft, CheckSquare, ChevronDown, ChevronRight, FileText, Landmark, Map, MapPin, Search, Share2, Star, UserRound, Users } from 'lucide-react';
import { useAuth } from '../../useAuth';
import './PoliticalStrategy.css';
import { fetchTseLiveResults } from '../../services/tseLiveResults';

const ENDPOINT = 'https://us-central1-oassessor-blu.cloudfunctions.net/tseHistoricalResults';
const STORAGE_KEY = 'oassessor-political-strategy-analyses-v1';
const YEARS = [2026, 2024, 2022, 2020, 2018, 2016, 2014, 2012];
const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
const OFFICES = [
  { label: 'Presidente', general: true }, { label: 'Governador', general: true }, { label: 'Senador', general: true },
  { label: 'Deputado federal', general: true }, { label: 'Deputado estadual/distrital', general: true },
  { label: 'Prefeito', general: false }, { label: 'Vereador', general: false },
];
const RESULT_SECTIONS = [
  ['elections','Explorar eleições',CheckSquare,'Escolha o ano, o estado, o cargo e o turno.'],
  ['candidates','Candidatos',UserRound,'Pesquise candidaturas e abra os detalhes.'],
  ['parties','Partidos',Landmark,'Compare o total de votos por partido no recorte atual.'],
  ['compare','Comparar candidaturas',Users,'Compare até duas candidaturas do mesmo recorte.'],
];
const TERRITORY_SECTIONS = [
  ['municipalities','Município',MapPin], ['zones','Zona eleitoral',Map], ['locations','Local de votação',MapPin], ['sections','Seção',CheckSquare],
];
const number = value => Math.round(Number(value || 0)).toLocaleString('pt-BR');
const pct = value => `${Number(value || 0).toFixed(2).replace('.', ',')}%`;
const officeList = year => OFFICES.filter(item => item.general === (Number(year) % 4 !== 0));

async function queryResults(user, params) {
  if (!user) throw new Error('Entre novamente para consultar os resultados históricos.');
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
    body: JSON.stringify(params),
  });
  const body = await response.text();
  let result;
  try { result = JSON.parse(body); } catch { throw new Error(`Resposta inválida do serviço histórico (HTTP ${response.status}).`); }
  if (!response.ok) throw new Error(result.error || `Falha ao consultar a base histórica (HTTP ${response.status}).`);
  return result;
}

export default function PoliticalStrategy() {
  const { user } = useAuth();
  const [section, setSection] = useState('home');
  const [year, setYear] = useState(2022);
  const [turn, setTurn] = useState(1);
  const [uf, setUf] = useState('CE');
  const [office, setOffice] = useState('Governador');
  const [municipality, setMunicipality] = useState(null);
  const [municipalities, setMunicipalities] = useState([]);
  const [zones, setZones] = useState([]);
  const [locations, setLocations] = useState([]);
  const [sections, setSections] = useState([]);
  const [zoneCode, setZoneCode] = useState('');
  const [locationCode, setLocationCode] = useState('');
  const [sectionCode, setSectionCode] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [search, setSearch] = useState('');
  const [savedYearFilter, setSavedYearFilter] = useState('all');
  const [saved, setSaved] = useState(() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; } });
  const [favorites, setFavorites] = useState(() => { try { return JSON.parse(localStorage.getItem(`${STORAGE_KEY}-favorites`) || '[]'); } catch { return []; } });
  const [candidate, setCandidate] = useState(null);
  const [compare, setCompare] = useState([]);

  const localElection = Number(year) % 4 === 0;
  const offices = officeList(year);
  const availableTurns = ['Presidente', 'Governador', 'Prefeito'].includes(office) ? [1, 2] : [1];
  const params = useMemo(() => ({ year: Number(year), turn: Number(turn), uf, cargo: office, municipalityCode: municipality?.code || '', zoneCode, locationCode, sectionCode }), [year, turn, uf, office, municipality?.code, zoneCode, locationCode, sectionCode]);
  const pageTitle = ({ elections: 'Análise de Eleição', candidates: 'Análise de Candidatos', candidate: 'Detalhe do Candidato', compare: 'Comparar candidaturas', analysis: 'Minhas Análises', parties: 'Análise por Partidos', municipalities: 'Análise por Município', municipalityResult: 'Resultado por Município', zones: 'Análise por Zona', zoneResult: 'Resultado por Zona', locations: 'Análise por Local', locationResult: 'Resultado por Local', sections: 'Análise por Seção', sectionResult: 'Resultado por Seção' })[section];

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)); }, [saved]);
  useEffect(() => { localStorage.setItem(`${STORAGE_KEY}-favorites`, JSON.stringify(favorites)); }, [favorites]);
  useEffect(() => {
    const list = officeList(year);
    setOffice(current => {
      if (list.some(item => item.label === current)) return current;
      setTurn(1);
      return Number(year) % 4 === 0 ? 'Prefeito' : 'Governador';
    });
  }, [year]);

  useEffect(() => {
    const needsResults = ['elections','candidates','candidate','compare','parties','municipalities','municipalityResult','zones','zoneResult','locations','locationResult','sections','sectionResult'].includes(section);
    if (!needsResults) return undefined;
    let active = true;
    setLoading(true); setError('');
    const territoryGranularityPages = ['zones','zoneResult','locations','locationResult','sections','sectionResult'].includes(section);
    const granularity = ['zones','zoneResult'].includes(section) ? 'zone' : ['locations','locationResult'].includes(section) ? 'location' : ['sections','sectionResult'].includes(section) ? 'section' : '';
    let request;
    if (territoryGranularityPages && params.municipalityCode && params.year > 2024) request = Promise.reject(new Error('O arquivo oficial por zona, local e seção ainda não está disponível para esta eleição.'));
    else if (territoryGranularityPages && params.municipalityCode && params.year <= 2024) request = queryResults(user, { ...params, granularity });
    else if (Number(params.year) >= 2024) request = fetchTseLiveResults({ ...params, includeMunicipalities: localElection || ['municipalities','zones','zoneResult','locations','locationResult','sections','sectionResult'].includes(section) });
    else request = queryResults(user, params);
    request.then(data => {
      if (!active) return;
      setCandidates(data.candidates || []); setSummary(data.summary || null); setMunicipalities(data.municipalities || []);
      setZones(data.zones || []); setLocations(data.locations || []); setSections(data.sections || []);
    }).catch(err => { if (active) setError(err.message || 'Não foi possível carregar os resultados.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user, params, section, localElection, municipality?.code, retryCount]);

  const filteredCandidates = useMemo(() => candidates.filter(item => `${item.name} ${item.number} ${item.party}`.toLowerCase().includes(search.trim().toLowerCase())), [candidates, search]);
  const parties = useMemo(() => Object.values(candidates.reduce((all, item) => {
    const party = item.party || 'Sem partido';
    all[party] ||= { id: party, name: party, votes: 0, candidates: 0 };
    all[party].votes += Number(item.votes || 0); all[party].candidates += 1; return all;
  }, {})).sort((a,b) => b.votes - a.votes), [candidates]);

  const go = next => { setSearch(''); setSection(next); if (next === 'compare') { setCompare([]); } };
  const saveAnalysis = (record = {}) => {
    const item = { id: `${Date.now()}`, title: record.title || `${office} · ${year} · ${uf}`, subtitle: record.subtitle || `${year} · ${turn}º turno · ${uf}${municipality ? ` · ${municipality.name}` : ''}`, section: record.section || section, year, turn, uf, office, municipalityCode: municipality?.code || '', municipalityName: municipality?.name || '', zoneCode, locationCode, sectionCode, candidateIds: compare.map(item => item.id), candidateNames: compare.map(item => item.name), compareCandidates: compare, createdAt: new Date().toISOString() };
    setSaved(current => [item, ...current].slice(0, 100));
  };
  const restoreAnalysis = item => {
    setYear(Number(item.year) || 2022); setTurn(Number(item.turn) || 1); setUf(item.uf || 'CE'); setOffice(item.office || 'Governador');
    setMunicipality(item.municipalityCode ? { code:item.municipalityCode, name:item.municipalityName || item.municipalityCode } : null);
    setZoneCode(item.zoneCode || ''); setLocationCode(item.locationCode || ''); setSectionCode(item.sectionCode || '');
    setCompare(item.compareCandidates || []); setSearch('');
    setSection(['elections','candidates','candidate','compare','analysis','parties','municipalities','municipalityResult','zones','zoneResult','locations','locationResult','sections','sectionResult'].includes(item.section) ? item.section : 'elections');
  };
  const selectMunicipality = value => { setMunicipality(value); setZoneCode(''); setLocationCode(''); setSectionCode(''); };
  const changeYear = value => { setYear(Number(value)); setTurn(1); setMunicipality(null); setZoneCode(''); setLocationCode(''); setSectionCode(''); setCompare([]); };
  const filteredSaved = saved.filter(item => (savedYearFilter === 'all' || Number(item.year) === Number(savedYearFilter)) && `${item.title} ${item.subtitle}`.toLowerCase().includes(search.trim().toLowerCase()));
  const validVotes = Number(summary?.vv || 0);

  const select = (label, value, onChange, options) => <label className="strategy-field"><span>{label}</span><div className="strategy-select"><select value={value} onChange={event => onChange(event.target.value)}>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select><ChevronDown size={16} /></div></label>;
  const filters = (withOffice = true, showTerritory = false) => <section className="strategy-filters">
    {select('Eleição', year, changeYear, YEARS.map(item => ({ value: item, label: item })))}
    {(office !== 'Presidente' || showTerritory) && select('Estado', uf, value => { setUf(value); setMunicipality(null); setZoneCode(''); setLocationCode(''); setSectionCode(''); setCompare([]); }, UFS.map(item => ({ value: item, label: item })))}
    {withOffice && <>
      {select('Cargo', office, value => { setOffice(value); setTurn(1); setZoneCode(''); setLocationCode(''); setSectionCode(''); setCompare([]); }, offices.map(item => ({ value: item.label, label: item.label })))}
      {select('Turno', turn, value => { setTurn(Number(value)); setZoneCode(''); setLocationCode(''); setSectionCode(''); setCompare([]); }, availableTurns.map(item => ({ value: item, label: `${item}º turno` })))}
      {(localElection || showTerritory) && <label className="strategy-field"><span>Município</span><div className="strategy-select"><select value={municipality?.code || ''} onChange={event => { selectMunicipality(municipalities.find(item => item.code === event.target.value) || null); setCompare([]); }}><option value="">Selecione um município</option>{municipalities.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}</select><ChevronDown size={16} /></div></label>}
    </>}
  </section>;
  const searchBox = placeholder => <label className="strategy-search"><Search size={19} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder={placeholder} /></label>;
  const candidateRows = (rows = filteredCandidates, showCandidateButton = true) => <div className="strategy-list">{rows.map((item, index) => <button className="strategy-row" key={item.id || item.name} onClick={() => { if (showCandidateButton) { setCandidate(item); setSection('candidate'); } }}><span className="strategy-rank">{index + 1}</span><span className="strategy-row-copy"><strong>{item.name}</strong><small>{item.number || ''}{item.party ? ` · ${item.party}` : ''}</small></span><span className="strategy-row-votes"><strong>{number(item.votes)}</strong>{item.percent != null && <small>{pct(item.percent)}</small>}</span>{showCandidateButton && <ChevronRight size={18} />}</button>)}{!rows.length && <p className="strategy-empty-inline">{candidates.length ? 'Nenhuma candidatura corresponde à busca.' : 'Nenhuma candidatura encontrada para este recorte oficial.'}</p>}</div>;
  const errorState = error && <div className="strategy-notice error"><strong>Não foi possível carregar os dados</strong><span>{error}</span><button className="strategy-retry-button" onClick={() => setRetryCount(value => value + 1)}>Tentar novamente</button></div>;
  const loadingState = loading && <div className="strategy-loading"><span className="strategy-spinner" />Consultando resultados oficiais do TSE…</div>;
  const sectionHeader = <header className="strategy-page-header"><button className="strategy-icon-button" aria-label="Voltar para Estratégia Política" onClick={() => go('home')}><ArrowLeft /></button><div><h2>{pageTitle}</h2><i /></div><button className="strategy-icon-button" aria-label="Início da Estratégia Política" onClick={() => go('home')}><span className="strategy-home-glyph">⌂</span></button></header>;

  return <main className="political-strategy">
    {section === 'home' ? <>
      <section className="strategy-hero"><div className="strategy-kicker"><Activity size={16} /> DADOS OFICIAIS · TSE</div><h1>Estratégia política</h1><p>Consulte resultados por eleição e aprofunde a leitura por município, zona, local ou seção. Os dados variam conforme a eleição e a disponibilidade oficial.</p><div className="strategy-hero-meta"><span /> Fonte oficial do TSE · sem estimativas</div><button className="strategy-hero-cta" onClick={() => go('elections')}>Começar por uma eleição <ChevronRight size={18}/></button></section>
      <section className="strategy-home-group"><div className="strategy-section-heading"><div><h2>Resultados</h2><p>Comece pelo pleito e depois escolha o tipo de análise.</p></div></div><nav className="strategy-nav-grid" aria-label="Análises de resultados">{RESULT_SECTIONS.map(([id,label,Icon,description]) => <button key={id} onClick={() => go(id)}><span className="strategy-nav-icon"><Icon size={20} /></span><span><strong>{label}</strong><small>{description}</small></span><ChevronRight size={17}/></button>)}</nav></section>
      <section className="strategy-home-group"><div className="strategy-section-heading"><div><h2>Explorar por território</h2><p>Os recortes dependem da eleição e do município selecionados.</p></div></div><nav className="strategy-territory-grid" aria-label="Recortes territoriais">{TERRITORY_SECTIONS.map(([id,label,Icon]) => <button key={id} onClick={() => go(id)}><Icon size={19}/><strong>{label}</strong><ChevronRight size={16}/></button>)}</nav><p className="strategy-muted strategy-territory-help">O TSE não disponibiliza votação oficial por bairro. Por isso, esse recorte não aparece como opção.</p></section>
      <div className="strategy-section-heading"><div><h2>Minhas análises</h2><p>Filtros guardados neste navegador.</p></div><button onClick={() => go('analysis')}>Ver todas <ChevronRight size={16} /></button></div>
      <div className="strategy-card">{saved.slice(0,4).map(item => <button key={item.id} className="strategy-row" onClick={() => restoreAnalysis(item)}><span className="strategy-round-icon"><MapPin size={19} /></span><span className="strategy-row-copy"><strong>{item.title}</strong><small>{item.subtitle}</small></span><ChevronRight size={18} /></button>)}{!saved.length && <div className="strategy-empty-state"><FileText size={22}/><strong>Nenhuma análise salva</strong><span>Use “Salvar” dentro de uma análise para guardar seus filtros neste navegador.</span></div>}</div>
      <div className="strategy-section-heading"><div><h2>Acesso rápido por ano</h2><p>Selecione um ano para iniciar a consulta.</p></div></div><div className="strategy-year-pills">{YEARS.slice(0,3).map(item => <button key={item} onClick={() => { changeYear(item); go('elections'); }}>{item}</button>)}</div>
    </> : <>
      {sectionHeader}
      {section === 'analysis' ? <>
        {searchBox('Buscar análises…')}<div className="strategy-list-tools"><label>Filtrar por ano <select value={savedYearFilter} onChange={event => setSavedYearFilter(event.target.value)}><option value="all">Todos</option>{YEARS.map(item => <option key={item} value={item}>{item}</option>)}</select></label><span>{filteredSaved.length} salvas neste navegador</span><button onClick={() => { if (window.confirm('Excluir todas as análises salvas neste navegador?')) { setSaved([]); localStorage.removeItem(STORAGE_KEY); } }}>Limpar análises</button></div>
        <div className="strategy-card">{filteredSaved.map(item => <div className="strategy-row" key={item.id}><button className="strategy-row-open" onClick={() => restoreAnalysis(item)}><span className="strategy-row-copy"><strong>{item.title}</strong><small>{item.subtitle}</small></span><ChevronRight size={18} /></button><button className="strategy-icon-button small" aria-label={`Compartilhar ${item.title}`} onClick={() => navigator.clipboard?.writeText(`${item.title}\n${item.subtitle}\nFonte: TSE`)}><Share2 size={17} /></button></div>)}{!filteredSaved.length && <p className="strategy-empty-inline">Nenhuma análise salva encontrada.</p>}</div>
        <button className="strategy-primary-button" onClick={() => go('elections')}>＋ Nova análise</button>
      </> : null}
      {section === 'elections' && <>{filters(false)}<div className="strategy-section-heading"><h2>Eleição {year} · {uf}</h2><button onClick={() => saveAnalysis({section:'elections'})}>＋ Salvar</button></div><div className="strategy-card">{(localElection ? ['Prefeito','Vereador'] : offices.map(item => item.label)).flatMap(position => [1,...(['Presidente','Governador'].includes(position) ? [2] : [])].map(round => ({position,round}))).map((item,index) => <button className="strategy-row" key={`${item.position}-${item.round}`} onClick={() => { setOffice(item.position); setTurn(item.round); setSection('candidates'); }}><span className="strategy-round-icon"><CheckSquare size={20} /></span><span className="strategy-row-copy"><strong>Eleição {year} · {item.round}º turno · {uf}</strong><small>{item.position}</small></span><ChevronRight size={18} /></button>)}</div></>}
      {['candidates','parties','compare','municipalities'].includes(section) && <>
        {filters(true, section === 'municipalities')}
        {section === 'candidates' && <>{searchBox('Buscar por nome, número ou partido…')}{errorState}{loadingState}{!loading && !error && (localElection && !municipality ? <div className="strategy-notice">Selecione um município para consultar candidatos deste pleito.</div> : <div className="strategy-card">{candidateRows()}</div>)}</>}
        {section === 'parties' && <>{errorState}{loadingState}{!loading && !error && (localElection && !municipality ? <div className="strategy-notice">Selecione um município para consultar os votos por partido neste pleito.</div> : <div className="strategy-card">{candidateRows(parties.map(item => ({...item, number:`${item.candidates} candidaturas`})), false)}</div>)}</>}
        {section === 'compare' && <><div className="strategy-section-heading"><div><h2>Novo comparativo</h2><p>Escolha duas candidaturas da mesma eleição, cargo e território.</p></div><span>{compare.length}/2 selecionadas</span></div>{compare.length > 0 && <div className="strategy-selection-summary">{compare.map(item => <span key={item.id}>{item.name}</span>)}<button onClick={() => setCompare([])}>Limpar seleção</button></div>}{errorState}{loadingState}{!loading && !error && (localElection && !municipality ? <div className="strategy-notice">Escolha município e cargo para listar candidaturas.</div> : <div className="strategy-card">{filteredCandidates.map((item,index) => { const selected = compare.some(c => c.id === item.id); const limitReached = compare.length >= 2 && !selected; return <button key={item.id || `${item.name}-${item.number}`} disabled={limitReached} className={`strategy-row ${selected ? 'is-selected' : ''} ${limitReached ? 'is-disabled' : ''}`} onClick={() => setCompare(current => current.some(c => c.id === item.id) ? current.filter(c => c.id !== item.id) : current.length < 2 ? [...current,item] : current)}><span className="strategy-rank">{index+1}</span><span className="strategy-row-copy"><strong>{item.name}</strong><small>{item.party} · {number(item.votes)} votos</small></span><span className="strategy-check">{selected ? '✓' : '+'}</span></button>; })}{!filteredCandidates.length && <p className="strategy-empty-inline">Nenhuma candidatura encontrada com essa busca e esse recorte.</p>}</div>)}{compare.length > 0 && <div className="strategy-card strategy-comparison">{compare.map(item => <article key={item.id}><span className="strategy-avatar">{item.name?.slice(0,1)}</span><strong>{item.name}</strong><b>{number(item.votes)}</b><small>{pct(item.percent)} · {item.party}</small></article>)}{compare.length === 2 && <div className="strategy-comparison-note"><p>Comparação dos votos no recorte selecionado acima. Para comparar outro território, altere os filtros e crie uma nova análise.</p><button className="strategy-primary-button" onClick={() => saveAnalysis({section:'compare',title:`${compare[0].name} × ${compare[1].name}`})}>Salvar comparativo</button></div>}</div>}</>}
        {section === 'municipalities' && <>{errorState}{loadingState}{!loading && !error && <><button className="strategy-primary-button" disabled={!municipality} onClick={() => setSection('municipalityResult')}>Analisar por Município</button>{municipality && <button className="strategy-row strategy-card" onClick={() => setSection('municipalityResult')}><span className="strategy-row-copy"><strong>{municipality.name}</strong><small>Ver votação de {office} · {year} · {turn}º turno</small></span><ChevronRight /></button>}</>}</>}
      </>}
      {section === 'candidate' && candidate && <><div className="strategy-card strategy-candidate-profile"><div className="strategy-avatar large">{candidate.name?.slice(0,1)}</div><div><small>{candidate.party} · {candidate.number}</small><h2>{candidate.name}</h2><span>{candidate.elected || 'Candidato'}</span></div><button className="strategy-icon-button" aria-label={`${favorites.some(item => item.id === candidate.id) ? 'Remover' : 'Adicionar'} ${candidate.name} dos favoritos`} title="Favoritar candidato" onClick={() => setFavorites(current => current.some(item => item.id === candidate.id) ? current.filter(item => item.id !== candidate.id) : [...current,candidate])}><Star fill={favorites.some(item => item.id === candidate.id) ? 'currentColor' : 'none'}/></button><button className="strategy-icon-button" aria-label={`Copiar dados de ${candidate.name}`} title="Copiar dados do candidato" onClick={() => navigator.clipboard?.writeText(`${candidate.name} · ${number(candidate.votes)} votos (${pct(candidate.percent)})`)}><Share2/></button></div><div className="strategy-card strategy-candidate-metrics"><div><strong>{pct(candidate.percent)}</strong><small>dos votos válidos</small></div><div><strong>{number(candidate.votes)}</strong><small>votos</small></div><div><strong>{candidates.indexOf(candidate)+1}º</strong><small>colocação</small></div></div><div className="strategy-notice"><strong>Resultados oficiais por território</strong><p>Selecione um município e, quando os arquivos oficiais estiverem disponíveis, aprofunde por zona, local e seção. O TSE não publica votação por bairro.</p><button className="strategy-primary-button" onClick={() => go('municipalities')}>Explorar territórios</button></div></>}
      {section === 'municipalityResult' && <>{errorState}{loadingState}{!loading && !error && <><div className="strategy-card"><div className="strategy-kicker"><MapPin size={17}/> RESULTADO POR MUNICÍPIO</div><h2>{municipality?.name} · {year} · {office}</h2><p>{turn}º turno · {uf}</p><div className="strategy-candidate-metrics"><div><strong>{number(validVotes)}</strong><small>votos válidos</small></div><div><strong>{candidates.length}</strong><small>candidaturas</small></div></div></div><div className="strategy-card">{candidateRows()}</div><button className="strategy-primary-button" onClick={() => saveAnalysis({section:'municipalityResult',title:municipality?.name,subtitle:`${office} · ${year} · ${turn}º turno · ${uf}`})}><Star size={16}/> Salvar análise</button></>}</>}
      {['zones','locations','sections'].includes(section) && <>{filters(true, true)}<section className="strategy-filters"><label className="strategy-field"><span>Zona</span><div className="strategy-select"><select value={zoneCode} onChange={event => { setZoneCode(event.target.value); setLocationCode(''); setSectionCode(''); }}><option value="">Selecione uma zona</option>{zones.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}</select><ChevronDown size={16}/></div></label>{section !== 'zones' && <label className="strategy-field"><span>Local de votação</span><div className="strategy-select"><select value={locationCode} onChange={event => { setLocationCode(event.target.value); setSectionCode(''); }} disabled={!zoneCode}><option value="">Selecione um local</option>{locations.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}</select><ChevronDown size={16}/></div></label>}{section === 'sections' && <label className="strategy-field"><span>Seção</span><div className="strategy-select"><select value={sectionCode} onChange={event => setSectionCode(event.target.value)} disabled={!locationCode}><option value="">Selecione uma seção</option>{sections.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}</select><ChevronDown size={16}/></div></label>}<button className="strategy-primary-button" disabled={!municipality || (section === 'zones' ? !zoneCode : section === 'locations' ? !zoneCode || !locationCode : !zoneCode || !locationCode || !sectionCode)} onClick={() => go(section === 'zones' ? 'zoneResult' : section === 'locations' ? 'locationResult' : 'sectionResult')}>Analisar por {section === 'zones' ? 'Zona' : section === 'locations' ? 'Local' : 'Seção'}</button></section>{errorState}{loadingState}{!municipality && <div className="strategy-notice">Selecione eleição, estado, cargo, turno e município para carregar os recortes oficiais.</div>}{!loading && !error && municipality && !zones.length && <div className="strategy-notice"><strong>Recorte territorial indisponível</strong><p>Não encontramos dados oficiais de zona para esta combinação de eleição e município. Os resultados por município continuam disponíveis.</p></div>}</>}
      {['zoneResult','locationResult','sectionResult'].includes(section) && <>{errorState}{loadingState}{!loading && !error && <><div className="strategy-card"><div className="strategy-kicker"><MapPin size={17}/> {section === 'zoneResult' ? 'RESULTADO POR ZONA' : section === 'locationResult' ? 'RESULTADO POR LOCAL' : 'RESULTADO POR SEÇÃO'}</div><h2>{municipality?.name} · {year} · {office}</h2><p>{turn}º turno · {uf} · {zones.find(item => item.code === zoneCode)?.name}{section !== 'zoneResult' ? ` · ${locations.find(item => item.code === locationCode)?.name}` : ''}{section === 'sectionResult' ? ` · Seção ${sectionCode}` : ''}</p><div className="strategy-candidate-metrics"><div><strong>{number(validVotes)}</strong><small>votos das candidaturas</small></div><div><strong>{candidates.length}</strong><small>candidaturas</small></div></div></div><div className="strategy-card">{candidateRows()}</div><button className="strategy-primary-button" onClick={() => saveAnalysis({section,title:municipality?.name,subtitle:`${office} · ${year} · ${turn}º turno · ${uf} · ${zoneCode}`})}><Star size={16}/> Salvar análise</button></>}</>}
      <p className="strategy-source">Fonte: Tribunal Superior Eleitoral (TSE). Apuração oficial de 2024 e 2026; acervo histórico de 2012 a 2022, sem projeções.</p>
    </>}
  </main>;
}
