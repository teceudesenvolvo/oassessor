const BASE = 'https://resultados.tse.jus.br/oficial';
const CARGO_CODES = { Presidente: '1', Governador: '3', Senador: '5', 'Deputado federal': '6', 'Deputado estadual/distrital': '7', Prefeito: '11', Vereador: '13' };
const fresh = url => `${url}${url.includes('?') ? '&' : '?'}_=${Date.now()}`;
const parsedNumber = value => { const raw = String(value ?? '0').trim(); return Number(raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw) || 0; };

function parseCandidates(data, code) {
  const area = data?.abr?.[0];
  const race = (data?.carg || []).find(item => String(item.cd) === code);
  const source = race ? (race.agr || []).flatMap(group => (group.par || []).flatMap(party => (party.cand || []).map(item => ({ ...item, sg: item.sg || party.sg, partyName: party.nm })))) : area?.cand || data?.cand || [];
  return source.map(item => ({
    id: item.SQ_CAND || item.sqcand || item.sqc || `${item.NM_URNA_CAND || item.nmu}-${item.NR_CAND || item.n}`,
    name: item.NM_URNA_CAND || item.NM_CAND || item.nmu || item.nm,
    number: item.NR_CAND || item.n,
    party: item.SG_PARTIDO || item.sgp || item.sg || item.partyName,
    votes: parsedNumber(item.QT_VOTOS || item.vap),
    percent: parsedNumber(item.PROP_VOTOS || item.pvap),
    elected: item.DS_SIT_TOT_TURNO || item.st,
  })).filter(item => item.name).sort((a, b) => b.votes - a.votes);
}

export async function fetchTseLiveResults({ year, turn, uf, cargo, municipalityCode = '', includeMunicipalities = false }) {
  const code = CARGO_CODES[cargo];
  if (!code) throw new Error('Cargo não disponível para esta eleição.');
  const president = cargo === 'Presidente';
  const municipal = year % 4 === 0;
  const region = president ? 'br' : uf.toLowerCase();
  const configResponse = await fetch(fresh(`${BASE}/comum/config/ele-c.json`));
  if (!configResponse.ok) throw new Error(`Catálogo do TSE indisponível (HTTP ${configResponse.status}).`);
  const config = await configResponse.json();
  const elections = (config?.pl || []).flatMap(cycle => (cycle.e || []).map(item => ({ ...item, cycle: cycle.c })));
  let election = elections.find(item => {
    const parts = String(item.dt || '').split('/');
    return Number(parts[parts.length - 1]) === year && Number(item.t || 1) === turn && item.cycle === `ele${year}` && String(item.tp) !== '4'
      && (item.abr || []).some(area => (area.cd === (municipal ? 'br' : region) || area.cd === 'br') && area.cp?.some(position => String(position.cd) === code));
  });
  if (!election && [2024, 2026].includes(year)) {
    const id = year === 2026 ? (turn === 1 ? (president ? '6257' : '6259') : (president ? '6258' : '6260')) : (turn === 1 ? '619' : '620');
    election = elections.find(item => String(item.cd) === id && item.cycle === `ele${year}`);
  }
  if (!election) throw new Error(`Catálogo do TSE sem eleição ${year}, ${turn}º turno, ${cargo} e ${uf}.`);
  let municipalities = [];
  let selectedMunicipality = municipalityCode;
  if (municipal || includeMunicipalities) {
    const padded = String(election.cd).padStart(6, '0');
    const response = await fetch(fresh(`${BASE}/${election.cycle}/${election.cd}/config/mun-e${padded}-cm.json`));
    if (!response.ok) throw new Error(`Lista de municípios do TSE indisponível (HTTP ${response.status}).`);
    const data = await response.json();
    const area = (data?.abr || []).find(item => String(item.cd || item.cdabr || item.nmabr || item.nm).toLowerCase() === uf.toLowerCase());
    municipalities = (area?.mu || []).map(item => ({ code: String(item.cd || item.cdi || '').padStart(5, '0'), name: item.nm || item.nm_municipio || item.nome || item.nmabr || '' }))
      .filter(item => item.code && item.name).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    if (!selectedMunicipality && (municipal || includeMunicipalities)) return { candidates: [], summary: null, municipalities };
  }
  if (selectedMunicipality) {
    selectedMunicipality = String(selectedMunicipality).padStart(5, '0');
    if (includeMunicipalities && !municipalities.some(item => item.code === selectedMunicipality)) throw new Error('Município não encontrado na lista publicada pelo TSE.');
  }
  const electionCode = String(election.cd).padStart(6, '0');
  const scope = selectedMunicipality ? `${region}${selectedMunicipality}` : region;
  const url = `${BASE}/${election.cycle}/${election.cd}/dados/${region}/${scope}-c${code.padStart(4, '0')}-e${electionCode}-u.json`;
  const response = await fetch(fresh(url));
  if (!response.ok) throw new Error(`Arquivo de resultados do TSE indisponível (HTTP ${response.status}).`);
  const data = await response.json();
  return { candidates: parseCandidates(data, code), summary: data?.abr?.[0]?.v || data?.v || data?.s || data?.totais || null, municipalities };
}
