import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3, ChevronDown, ChevronRight, MapPin, Search,
  Share2, Star, Users,
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import './PoliticalStrategy.css';
import { fetchTseOpenDataResults } from '../../services/tseOpenDataResults';

const STORAGE_KEY = 'oassessor-political-strategy-analyses-v1';
const YEARS = [2026, 2024, 2022, 2020, 2018, 2016, 2014, 2012];
const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
const OFFICES = [
  { label: 'Presidente', general: true },
  { label: 'Governador', general: true },
  { label: 'Senador', general: true },
  { label: 'Deputado federal', general: true },
  { label: 'Deputado estadual/distrital', general: true },
  { label: 'Prefeito', general: false },
  { label: 'Vereador', general: false },
];
const SCOPES = [
  { value: 'municipality', label: 'Município' },
  { value: 'zone', label: 'Zona eleitoral' },
  { value: 'location', label: 'Local de votação' },
  { value: 'section', label: 'Seção' },
];
const number = value => Math.round(Number(value || 0)).toLocaleString('pt-BR');
const pct = value => `${Number(value || 0).toFixed(2).replace('.', ',')}%`;
const officeList = year => OFFICES.filter(item => item.general === (Number(year) % 4 !== 0));

export default function PoliticalStrategy() {
  const [year, setYear] = useState(2022);
  const [turn, setTurn] = useState(1);
  const [uf, setUf] = useState('CE');
  const [office, setOffice] = useState('Governador');
  const [municipality, setMunicipality] = useState(null);
  const [scope, setScope] = useState('municipality');
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
  const [saved, setSaved] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  });
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`${STORAGE_KEY}-favorites`) || '[]'); } catch { return []; }
  });
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [compare, setCompare] = useState([]);

  const offices = officeList(year);
  const availableTurns = ['Presidente', 'Governador', 'Prefeito'].includes(office) ? [1, 2] : [1];
  const needsZone = scope === 'zone' || scope === 'location' || scope === 'section';
  const needsLocation = scope === 'location' || scope === 'section';
  const needsSection = scope === 'section';
  const params = useMemo(() => ({
    year: Number(year), turn: Number(turn), uf, cargo: office,
    municipalityCode: municipality?.code || '', zoneCode, locationCode, sectionCode,
    granularity: scope, includeMunicipalities: true,
  }), [year, turn, uf, office, municipality?.code, zoneCode, locationCode, sectionCode, scope]);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)); }, [saved]);
  useEffect(() => { localStorage.setItem(`${STORAGE_KEY}-favorites`, JSON.stringify(favorites)); }, [favorites]);

  useEffect(() => {
    const validOffices = officeList(year);
    if (!validOffices.some(item => item.label === office)) {
      setOffice(Number(year) % 4 === 0 ? 'Prefeito' : 'Governador');
      setTurn(1);
    }
  }, [year, office]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    fetchTseOpenDataResults(params).then(data => {
      if (!active) return;
      setCandidates(data.candidates || []);
      setSummary(data.summary || null);
      if (data.municipalities?.length) setMunicipalities(data.municipalities);
      setZones(data.zones || []);
      setLocations(data.locations || []);
      setSections(data.sections || []);
      setSelectedCandidate(current => current && (data.candidates || []).some(item => item.id === current.id) ? current : null);
    }).catch(err => {
      if (active) setError(err.message || 'Não foi possível carregar os resultados oficiais.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [params, retryCount]);

  const filteredCandidates = useMemo(() => candidates.filter(item =>
    `${item.name} ${item.number} ${item.party}`.toLowerCase().includes(search.trim().toLowerCase())), [candidates, search]);
  const parties = useMemo(() => Object.values(candidates.reduce((all, item) => {
    const party = item.party || 'Sem partido';
    all[party] ||= { id: party, name: party, votes: 0, candidates: 0 };
    all[party].votes += Number(item.votes || 0);
    all[party].candidates += 1;
    return all;
  }, {})).sort((a, b) => b.votes - a.votes), [candidates]);
  const chartCandidates = filteredCandidates.slice(0, 8).map(item => ({
    name: item.name.length > 20 ? `${item.name.slice(0, 19)}…` : item.name,
    votos: Number(item.votes || 0),
    fullName: item.name,
  }));
  const scopeLabel = SCOPES.find(item => item.value === scope)?.label || 'Município';
  const validVotes = Number(summary?.vv || 0);
  const scopeNeedsSelection = !municipality
    || (needsZone && !zoneCode) || (needsLocation && !locationCode) || (needsSection && !sectionCode);
  const activeTerritory = [
    municipality?.name,
    needsZone ? zones.find(item => item.code === zoneCode)?.name : null,
    needsLocation ? locations.find(item => item.code === locationCode)?.name : null,
    needsSection ? `Seção ${sectionCode}` : null,
  ].filter(Boolean).join(' · ');

  const clearDeeper = () => { setZoneCode(''); setLocationCode(''); setSectionCode(''); };
  const saveAnalysis = () => {
    const record = {
      id: `${Date.now()}`,
      title: `${office} · ${municipality?.name || uf}`,
      subtitle: `${year} · ${turn}º turno · ${scopeLabel}${activeTerritory ? ` · ${activeTerritory}` : ''}`,
      year, turn, uf, office, municipalityCode: municipality?.code || '',
      municipalityName: municipality?.name || '', zoneCode, locationCode, sectionCode,
      candidateNames: compare.map(item => item.name), createdAt: new Date().toISOString(),
    };
    setSaved(current => [record, ...current].slice(0, 100));
  };
  const toggleCompare = item => setCompare(current => current.some(candidate => candidate.id === item.id)
    ? current.filter(candidate => candidate.id !== item.id)
    : current.length < 2 ? [...current, item] : [current[1], item]);

  const select = (label, value, onChange, options, disabled = false) => (
    <label className="strategy-field" key={label}>
      <span>{label}</span>
      <div className="strategy-select">
        <select value={value} onChange={event => onChange(event.target.value)} disabled={disabled}>
          {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <ChevronDown size={16} />
      </div>
    </label>
  );
  const renderRows = (items, isParty = false) => (
    <div className="strategy-list">
      {items.map((item, index) => {
        const isSelected = compare.some(candidate => candidate.id === item.id);
        const favorited = favorites.some(candidate => candidate.id === item.id);
        return <article className="strategy-result-row" key={item.id || item.name}>
          <span className="strategy-rank">{index + 1}</span>
          <button className="strategy-result-main" onClick={() => !isParty && setSelectedCandidate(item)}>
            <strong>{item.name}</strong>
            <small>{isParty ? `${item.candidates} candidaturas` : `${item.number || ''}${item.party ? ` · ${item.party}` : ''}`}</small>
          </button>
          <div className="strategy-row-votes"><strong>{number(item.votes)}</strong>{item.percent != null && <small>{pct(item.percent)}</small>}</div>
          {!isParty && <div className="strategy-row-actions">
            <button className={`strategy-mini-action ${isSelected ? 'active' : ''}`} aria-label="Comparar candidatura" title="Comparar" onClick={() => toggleCompare(item)}><Users size={16} /></button>
            <button className={`strategy-mini-action ${favorited ? 'active' : ''}`} aria-label="Favoritar candidatura" title="Favoritar" onClick={() => setFavorites(current => favorited ? current.filter(candidate => candidate.id !== item.id) : [...current, item])}><Star size={16} fill={favorited ? 'currentColor' : 'none'} /></button>
            <ChevronRight className="strategy-row-chevron" size={18} />
          </div>}
        </article>;
      })}
      {!items.length && <p className="strategy-empty-inline">{candidates.length ? 'Nenhum resultado corresponde à busca.' : 'Não há candidaturas para este recorte oficial.'}</p>}
    </div>
  );

  return <main className="political-strategy strategy-dashboard">
    <header className="strategy-dashboard-header">
      <div><span className="strategy-eyebrow">DADOS OFICIAIS · TSE</span><h1>Estratégia política</h1><p>Acompanhe a votação e aprofunde a análise sem perder os filtros selecionados.</p></div>
      <div className="strategy-live-badge"><span /> Apuração oficial</div>
    </header>

    <section className="strategy-panel strategy-filter-panel" aria-label="Filtros da apuração">
      <div className="strategy-panel-heading"><div><h2>Configure a análise</h2><p>Os resultados abaixo acompanham estes filtros.</p></div><BarChart3 size={21} /></div>
      <div className="strategy-filters">
        {select('Eleição', year, value => { setYear(Number(value)); setTurn(1); setMunicipality(null); clearDeeper(); }, YEARS.map(item => ({ value: item, label: item })))}
        {select('Estado', uf, value => { setUf(value); setMunicipality(null); clearDeeper(); }, UFS.map(item => ({ value: item, label: item })))}
        {select('Cargo', office, value => { setOffice(value); setTurn(1); clearDeeper(); }, offices.map(item => ({ value: item.label, label: item.label })))}
        {select('Turno', turn, value => setTurn(Number(value)), availableTurns.map(item => ({ value: item, label: `${item}º turno` })))}
        {select('Detalhar por', scope, value => { setScope(value); clearDeeper(); }, SCOPES)}
        {select('Município', municipality?.code || '', value => {
          setMunicipality(municipalities.find(item => item.code === value) || null); clearDeeper();
        }, [{ value: '', label: 'Selecione um município' }, ...municipalities.map(item => ({ value: item.code, label: item.name }))])}
        {needsZone && select('Zona eleitoral', zoneCode, value => { setZoneCode(value); setLocationCode(''); setSectionCode(''); }, [{ value: '', label: 'Selecione uma zona' }, ...zones.map(item => ({ value: item.code, label: item.name }))], !municipality)}
        {needsLocation && select('Local de votação', locationCode, value => { setLocationCode(value); setSectionCode(''); }, [{ value: '', label: 'Selecione um local' }, ...locations.map(item => ({ value: item.code, label: item.name }))], !zoneCode)}
        {needsSection && select('Seção', sectionCode, setSectionCode, [{ value: '', label: 'Selecione uma seção' }, ...sections.map(item => ({ value: item.code, label: item.name }))], !locationCode)}
      </div>
      <div className="strategy-filter-summary"><MapPin size={16} /><span>{year} · {uf} · {office} · {turn}º turno · {scopeLabel}{activeTerritory ? ` · ${activeTerritory}` : ''}</span></div>
    </section>

    {error && <div className="strategy-notice error"><strong>Não foi possível carregar os dados</strong><span>{error}</span><button className="strategy-retry-button" onClick={() => setRetryCount(value => value + 1)}>Tentar novamente</button></div>}
    {loading && <div className="strategy-loading"><span className="strategy-spinner" />Consultando os arquivos oficiais do TSE. A primeira consulta territorial pode levar alguns instantes…</div>}

    {!loading && !error && <>
      {scopeNeedsSelection && <div className="strategy-notice"><strong>Continue o recorte territorial</strong><p>Selecione {!municipality ? 'um município' : needsZone && !zoneCode ? 'uma zona eleitoral' : needsLocation && !locationCode ? 'um local de votação' : 'uma seção'} acima. O resultado será atualizado aqui, sem abrir outra tela.</p></div>}
      {!municipality && <div className="strategy-notice"><strong>Escolha um município</strong><p>Os resultados e gráficos serão carregados nesta página assim que você selecionar o município. A lista vem dos arquivos oficiais do TSE.</p></div>}

      {municipality && <>
        <section className="strategy-metric-grid" aria-label="Resumo dos resultados">
          <article className="strategy-metric-card"><span>Votos válidos</span><strong>{number(validVotes)}</strong><small>{activeTerritory || (municipality?.name || uf)}</small></article>
          <article className="strategy-metric-card"><span>Candidaturas</span><strong>{number(candidates.length)}</strong><small>{office} · {year}</small></article>
          <article className="strategy-metric-card"><span>Partidos</span><strong>{number(parties.length)}</strong><small>no recorte selecionado</small></article>
        </section>

        {!scopeNeedsSelection && candidates.length > 0 && <section className="strategy-panel strategy-chart-panel">
          <div className="strategy-panel-heading"><div><h2>Votação das candidaturas</h2><p>Principais resultados em {scopeLabel.toLowerCase()}.</p></div><span className="strategy-chart-total">{number(validVotes)} votos válidos</span></div>
          <div className="strategy-chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartCandidates} margin={{ top: 12, right: 16, left: 4, bottom: 54 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e6ebf0" />
                <XAxis dataKey="name" angle={-25} textAnchor="end" interval={0} height={68} tick={{ fontSize: 11, fill: '#657287' }} />
                <YAxis tickFormatter={value => number(value)} width={70} tick={{ fontSize: 11, fill: '#657287' }} />
                <Tooltip formatter={value => [`${number(value)} votos`, 'Votação']} labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label} />
                <Bar dataKey="votos" fill="#2864e8" radius={[6, 6, 0, 0]} maxBarSize={54} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>}

        <div className="strategy-results-layout">
          <section className="strategy-panel strategy-candidates-panel">
            <div className="strategy-panel-heading"><div><h2>Resultado por {scopeLabel.toLowerCase()}</h2><p>Selecione uma candidatura para ver os detalhes.</p></div><span className="strategy-result-count">{filteredCandidates.length}</span></div>
            <label className="strategy-search"><Search size={18} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar nome, número ou partido" /></label>
            {renderRows(filteredCandidates)}
            {compare.length > 0 && <div className="strategy-compare-tray"><div><strong>Comparação</strong><small>{compare.map(item => item.name).join(' × ')}</small></div><button onClick={() => setCompare([])}>Limpar</button></div>}
          </section>
          <aside className="strategy-side-panels">
            <section className="strategy-panel strategy-parties-panel"><div className="strategy-panel-heading"><div><h2>Votação por partido</h2><p>Soma dos votos das candidaturas.</p></div></div>{renderRows(parties.slice(0, 6), true)}</section>
            <section className="strategy-panel strategy-saved-panel"><div className="strategy-panel-heading"><div><h2>Análises salvas</h2><p>Este navegador guarda até 100 recortes.</p></div><button className="strategy-mini-action" aria-label="Salvar análise atual" title="Salvar análise" onClick={saveAnalysis}><Star size={16}/></button></div>{saved.slice(0, 4).map(item => <div className="strategy-saved-row" key={item.id}><strong>{item.title}</strong><small>{item.subtitle}</small></div>)}{!saved.length && <p className="strategy-muted">Salve o recorte atual para consultá-lo depois.</p>}</section>
          </aside>
        </div>

        {selectedCandidate && <section className="strategy-panel strategy-selected-candidate">
          <div className="strategy-panel-heading"><div><span className="strategy-eyebrow">DETALHE DA CANDIDATURA</span><h2>{selectedCandidate.name}</h2><p>{selectedCandidate.party} · {selectedCandidate.number}</p></div><button className="strategy-mini-action" onClick={() => setSelectedCandidate(null)} aria-label="Fechar detalhes">×</button></div>
          <div className="strategy-candidate-detail-metrics"><div><strong>{number(selectedCandidate.votes)}</strong><small>votos</small></div><div><strong>{pct(selectedCandidate.percent)}</strong><small>dos votos válidos</small></div><div><strong>{candidates.findIndex(item => item.id === selectedCandidate.id) + 1}º</strong><small>colocação</small></div></div>
          <div className="strategy-territory-inline"><div><strong>Explorar resultado territorial</strong><p>Altere “Detalhar por” nos filtros acima para município, zona, local ou seção. A página mantém a eleição e o contexto selecionados.</p></div><button className="strategy-primary-button" onClick={() => { setScope('municipality'); setSelectedCandidate(null); clearDeeper(); }}>Ver municípios</button></div>
          <button className="strategy-share-button" onClick={() => navigator.clipboard?.writeText(`${selectedCandidate.name} · ${number(selectedCandidate.votes)} votos (${pct(selectedCandidate.percent)})`)}><Share2 size={16}/> Copiar resumo</button>
        </section>}
      </>}
      </>}

    <p className="strategy-source">Fonte: Dados Abertos do Tribunal Superior Eleitoral (TSE). Os recortes por zona, local e seção dependem dos arquivos publicados para cada eleição. O TSE não publica votação por bairro.</p>
  </main>;
}
