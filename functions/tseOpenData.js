const { onRequest } = require('firebase-functions/v2/https');
const { Readable } = require('node:stream');
const { createInflateRaw } = require('node:zlib');
const { createHash } = require('node:crypto');
const admin = require('firebase-admin');

const DATASET_BASE = 'https://cdn.tse.jus.br/estatistica/sead/odsele';
const CACHE_BUCKET = 'oassessor-blu.firebasestorage.app';
const CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const RESULT_CACHE_VERSION = 'v1';
const RESULT_CACHE_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;
const CURRENT_ELECTION_CACHE_MAX_AGE_MS = 15 * 60 * 1000;
const CARGO_CODES = {
  Presidente: '1', Governador: '3', Senador: '5', 'Deputado federal': '6',
  'Deputado estadual/distrital': '7', Prefeito: '11', Vereador: '13',
};
const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
const requestCache = new Map();
const archiveLoads = new Map();

function readUint16(buffer, offset) { return buffer.readUInt16LE(offset); }
function readUint32(buffer, offset) { return buffer.readUInt32LE(offset); }

function findZipCsv(zipBuffer, year, scope) {
  const start = Math.max(0, zipBuffer.length - 22 - 0xffff);
  let eocd = -1;
  for (let offset = zipBuffer.length - 22; offset >= start; offset -= 1) {
    if (readUint32(zipBuffer, offset) === 0x06054b50) { eocd = offset; break; }
  }
  if (eocd < 0) throw new Error('O ZIP oficial do TSE não contém um diretório válido.');

  const entries = readUint16(zipBuffer, eocd + 10);
  let cursor = readUint32(zipBuffer, eocd + 16);
  const csvEntries = [];
  for (let index = 0; index < entries; index += 1) {
    if (readUint32(zipBuffer, cursor) !== 0x02014b50) throw new Error('O diretório do ZIP oficial do TSE está inválido.');
    const method = readUint16(zipBuffer, cursor + 10);
    const compressedSize = readUint32(zipBuffer, cursor + 20);
    const nameLength = readUint16(zipBuffer, cursor + 28);
    const extraLength = readUint16(zipBuffer, cursor + 30);
    const commentLength = readUint16(zipBuffer, cursor + 32);
    const localOffset = readUint32(zipBuffer, cursor + 42);
    const name = zipBuffer.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8');
    if (/\.csv$/i.test(name)) csvEntries.push({ name, method, compressedSize, localOffset });
    cursor += 46 + nameLength + extraLength + commentLength;
  }

  if (!csvEntries.length) throw new Error('O ZIP oficial do TSE não contém um CSV.');
  const yearEntries = csvEntries.filter(item => item.name.toLowerCase().includes(String(year)));
  const wanted = yearEntries.find(item => item.name.toLowerCase().endsWith(`_${String(scope).toLowerCase()}.csv`));
  const entry = wanted || (yearEntries.length === 1 ? yearEntries[0] : null);
  if (!entry) throw new Error(`O arquivo oficial do TSE não contém um CSV identificado para ${scope}.`);
  if (readUint32(zipBuffer, entry.localOffset) !== 0x04034b50) throw new Error('O arquivo CSV dentro do ZIP do TSE está inválido.');
  const fileNameLength = readUint16(zipBuffer, entry.localOffset + 26);
  const extraLength = readUint16(zipBuffer, entry.localOffset + 28);
  const dataStart = entry.localOffset + 30 + fileNameLength + extraLength;
  const compressed = zipBuffer.subarray(dataStart, dataStart + entry.compressedSize);
  if (entry.method === 0) return Readable.from([compressed]);
  if (entry.method !== 8) throw new Error(`Formato de compactação do TSE não suportado (${entry.method}).`);
  return Readable.from([compressed]).pipe(createInflateRaw());
}

async function *parseSemicolonCsv(stream) {
  let field = '';
  let row = [];
  let quoted = false;
  let afterQuote = false;
  let carry = '';
  for await (const chunk of stream) {
    const text = carry + (Buffer.isBuffer(chunk) ? chunk.toString('latin1') : String(chunk));
    carry = '';
    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      if (quoted) {
        if (char === '"') {
          if (index === text.length - 1) { carry = text.slice(index); break; }
          if (text[index + 1] === '"') { field += '"'; index += 1; }
          else { quoted = false; afterQuote = true; }
        } else field += char;
        continue;
      }
      if (char === '"' && (field.length === 0 || afterQuote)) { quoted = true; afterQuote = false; continue; }
      if (char === ';') { row.push(field); field = ''; afterQuote = false; continue; }
      if (char === '\n' || char === '\r') {
        if (char === '\r' && text[index + 1] === '\n') index += 1;
        row.push(field); field = ''; afterQuote = false;
        if (row.some(value => value !== '')) yield row;
        row = [];
        continue;
      }
      field += char;
      afterQuote = false;
    }
  }
  if (carry) quoted = false;
  if (field.length || row.length) { row.push(field); yield row; }
}

function normalizedHeader(value) {
  return String(value || '').replace(/^\uFEFF/, '').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function getValue(record, ...names) {
  for (const name of names) {
    const value = record[name];
    if (value != null && String(value).trim() !== '') return String(value).trim();
  }
  return '';
}

function addGroup(map, key, values) {
  if (!key) return;
  const existing = map.get(key);
  if (existing) {
    existing.votes += values.votes;
    existing.stateVotes = { ...(existing.stateVotes || {}) };
    Object.entries(values.stateVotes || {}).forEach(([state, votes]) => {
      existing.stateVotes[state] = Number(existing.stateVotes[state] || 0) + Number(votes || 0);
    });
    if (Object.keys(existing.stateVotes).length > 1) existing.uf = '';
  } else map.set(key, { ...values, stateVotes: values.stateVotes || {} });
}

function asArray(map) { return [...map.values()]; }

async function fetchZip(year, scope, kind) {
  const filename = kind === 'votacao_candidato_munzona'
    ? `${kind}_${year}.zip`
    : `${kind}_${year}_${scope}.zip`;
  const url = `${DATASET_BASE}/${kind}/${filename}`;
  const cacheKey = `${kind}/${year}/${scope}`;
  const cached = archiveLoads.get(cacheKey);
  if (cached?.promise) return cached.promise;

  const promise = (async () => {
    const file = admin.storage().bucket(CACHE_BUCKET).file(`tse-open-data/${kind}/${year}/${filename}`);
    const [exists] = await file.exists();
    if (exists) {
      const [metadata] = await file.getMetadata();
      const age = Date.now() - new Date(metadata.updated || 0).getTime();
      if (age < CACHE_MAX_AGE_MS) {
        const [contents] = await file.download();
        return contents;
      }
    }

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Arquivo oficial de votação do TSE indisponível para ${year}/${scope} (HTTP ${response.status}).`);
    const buffer = Buffer.from(await response.arrayBuffer());
    await file.save(buffer, { resumable: false, metadata: { contentType: 'application/zip', cacheControl: 'public, max-age=2592000' } });
    return buffer;
  })();
  archiveLoads.set(cacheKey, { promise });
  try { return await promise; }
  finally { archiveLoads.delete(cacheKey); }
}

function stableSerialize(value) {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function getResultsCacheFile(params) {
  const key = createHash('sha256').update(stableSerialize(params)).digest('hex');
  return admin.storage().bucket(CACHE_BUCKET).file(`tse-open-data/results/${RESULT_CACHE_VERSION}/${key}.json`);
}

async function readCachedResults(params) {
  try {
    const file = getResultsCacheFile(params);
    const [exists] = await file.exists();
    if (!exists) return null;
    const [metadata] = await file.getMetadata();
    const expiresAt = Date.parse(metadata.metadata?.expiresAt || '');
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      await file.delete({ ignoreNotFound: true });
      return null;
    }
    const [contents] = await file.download();
    return JSON.parse(contents.toString('utf8'));
  } catch (error) {
    console.warn('Não foi possível ler o cache persistente dos resultados do TSE:', error.message);
    return null;
  }
}

async function writeCachedResults(params, data) {
  try {
    const year = Number(params.year);
    const maxAge = year >= new Date().getFullYear()
      ? CURRENT_ELECTION_CACHE_MAX_AGE_MS
      : RESULT_CACHE_MAX_AGE_MS;
    const cachedAt = new Date();
    const expiresAt = new Date(cachedAt.getTime() + maxAge);
    const file = getResultsCacheFile(params);
    await file.save(JSON.stringify(data), {
      resumable: false,
      metadata: {
        contentType: 'application/json; charset=utf-8',
        cacheControl: `public, max-age=${Math.floor(maxAge / 1000)}`,
        metadata: {
          source: 'TSE Dados Abertos',
          cachedAt: cachedAt.toISOString(),
          expiresAt: expiresAt.toISOString(),
          electionYear: String(year),
        },
      },
    });
  } catch (error) {
    // A indisponibilidade do Storage não deve impedir a consulta oficial.
    console.warn('Não foi possível gravar o cache persistente dos resultados do TSE:', error.message);
  }
}

async function buildResults(params) {
  const year = Number(params.year);
  const turn = Number(params.turn || 1);
  const uf = String(params.uf || '').toUpperCase();
  const cargo = String(params.cargo || '');
  const cargoCode = CARGO_CODES[cargo];
  const municipalityCode = String(params.municipalityCode || '').replace(/\D/g, '');
  const zoneCode = String(params.zoneCode || '').replace(/\D/g, '');
  const locationCode = String(params.locationCode || '').replace(/\D/g, '');
  const sectionCode = String(params.sectionCode || '').replace(/\D/g, '');
  const granularity = String(params.granularity || 'municipality');
  const includeMunicipalities = Boolean(params.includeMunicipalities);
  if (!Number.isInteger(year) || year < 1994 || year > new Date().getFullYear()) throw new Error('Ano eleitoral inválido.');
  if ((uf && !/^[A-Z]{2}$/.test(uf)) || !cargoCode) throw new Error('Informe um estado e um cargo eleitoral válidos.');
  if (!uf && granularity !== 'municipality') throw new Error('Selecione um estado antes de detalhar o resultado por território.');
  if (granularity === 'section' && sectionCode && (!municipalityCode || !zoneCode || !locationCode)) throw new Error('Selecione município, zona e local para consultar a seção.');
  if (granularity === 'location' && locationCode && (!municipalityCode || !zoneCode)) throw new Error('Selecione município e zona para consultar o local.');

  const sectionData = ['location','section'].includes(granularity);
  const localOffice = ['Prefeito', 'Vereador'].includes(cargo);
  const kind = sectionData ? 'votacao_secao' : 'votacao_candidato_munzona';
  const nationalLocalElection = !uf && localOffice && !municipalityCode;
  if (!uf && (zoneCode || locationCode || sectionCode)) throw new Error('Selecione um estado antes de detalhar zona, local ou seção.');
  const archive = await fetchZip(year, uf || 'BR', kind);
  const states = uf ? [uf] : UFS;
  const maps = { candidates: new Map(), municipalities: new Map(), zones: new Map(), locations: new Map(), sections: new Map() };
  const stateTotals = new Map();

  for (const state of states) {
    let csv;
    try { csv = findZipCsv(archive, year, state); }
    catch (error) {
      if (uf) throw error;
      continue;
    }
    const iterator = parseSemicolonCsv(csv);
    const first = await iterator.next();
    if (first.done) continue;
    const headers = first.value.map(normalizedHeader);
    for await (const values of iterator) {
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
    if (Number(getValue(row, 'ANO_ELEICAO')) !== year || Number(getValue(row, 'NR_TURNO')) !== turn) continue;
    if (getValue(row, 'SG_UF').toUpperCase() !== state || getValue(row, 'CD_CARGO').padStart(2, '0') !== cargoCode.padStart(2, '0')) continue;
    const municipality = getValue(row, 'CD_MUNICIPIO');
    const municipalityName = getValue(row, 'NM_MUNICIPIO');
    const zone = getValue(row, 'NR_ZONA');
    const location = getValue(row, 'NR_LOCAL_VOTACAO');
    const locationName = getValue(row, 'NM_LOCAL_VOTACAO');
    const section = getValue(row, 'NR_SECAO');
    if (includeMunicipalities && municipality && municipalityName) maps.municipalities.set(municipality, { code: municipality, name: municipalityName });
    if (municipalityCode && municipality !== municipalityCode) continue;
    if (zone) maps.zones.set(zone, { code: zone, name: `Zona ${zone}` });
    if (zoneCode && zone !== zoneCode) continue;
    if (sectionData && granularity !== 'zone' && location) maps.locations.set(location, { code: location, name: locationName || `Local ${location}` });
    if (locationCode && location !== locationCode) continue;
    if (sectionCode && section !== sectionCode) continue;

    // As seções são atributos do local, não das candidaturas; registre-as
    // antes de descartar linhas de votos nulos/brancos sem SQ_CANDIDATO.
    if (granularity === 'section' && !sectionCode && zoneCode && locationCode && section) {
      maps.sections.set(section, { code: section, name: `Seção ${section}` });
    }

    const candidateId = getValue(row, 'SQ_CANDIDATO');
    const candidateNumber = getValue(row, 'NR_CANDIDATO', 'NR_VOTAVEL');
    const name = getValue(row, 'NM_URNA_CANDIDATO', 'NM_CANDIDATO', 'NM_VOTAVEL');
    if (!name || !candidateId || candidateId === '-1') continue;
    const voteValue = getValue(row, 'QT_VOTOS', 'QT_VOTOS_NOMINAIS');
    const votes = Number(voteValue.replace(/\./g, '').replace(',', '.')) || 0;
    if (nationalLocalElection && votes > 0) {
      const stateTotal = stateTotals.get(state) || { uf: state, votes: 0, candidacies: new Set() };
      stateTotal.votes += votes;
      stateTotal.candidacies.add(candidateId);
      stateTotals.set(state, stateTotal);
      continue;
    }
    const candidateKey = !uf && cargo !== 'Presidente' ? `${state}:${candidateId}` : candidateId;
    const candidateMetadata = {
      id: candidateKey || candidateNumber, name, number: candidateNumber,
      party: getValue(row, 'SG_PARTIDO'), votes,
      stateVotes: { [state]: votes }, uf: state,
      ...(municipalityName && (municipalityCode || localOffice) ? { municipality: municipalityName } : {}),
    };
    if (sectionData) {
      if ((granularity === 'location' && locationCode) || (granularity === 'section' && sectionCode)) addGroup(maps.candidates, `${candidateId}`, {
        ...candidateMetadata,
      });
    } else {
      addGroup(maps.candidates, `${candidateKey || candidateNumber}`, {
        ...candidateMetadata,
        elected: getValue(row, 'DS_SIT_TOT_TURNO'),
      });
    }
  }
  }

  if (nationalLocalElection) {
    const byState = UFS.map(state => {
      const item = stateTotals.get(state);
      return item ? { uf: state, votes: item.votes, candidacies: item.candidacies.size } : { uf: state, votes: null, candidacies: null };
    });
    return {
      candidates: [], summary: {
        vv: byState.reduce((total, item) => total + Number(item.votes || 0), 0),
        candidacies: byState.reduce((total, item) => total + Number(item.candidacies || 0), 0),
        states: byState.filter(item => item.votes != null).length,
      },
      stateResults: byState,
      municipalities: [], zones: [], locations: [], sections: [],
    };
  }

  const candidates = asArray(maps.candidates).sort((left, right) => right.votes - left.votes);
  const validVotes = candidates.reduce((total, item) => total + item.votes, 0);
  candidates.forEach(item => { item.percent = validVotes ? Number((item.votes * 100 / validVotes).toFixed(2)) : 0; });
  return {
    candidates,
    summary: { vv: validVotes },
    municipalities: asArray(maps.municipalities).sort((left, right) => left.name.localeCompare(right.name, 'pt-BR')),
    zones: asArray(maps.zones).sort((left, right) => Number(left.code) - Number(right.code)),
    locations: asArray(maps.locations).sort((left, right) => Number(left.code) - Number(right.code)),
    sections: asArray(maps.sections).sort((left, right) => Number(left.code) - Number(right.code)),
  };
}

exports.tseOpenDataResults = onRequest({ cors: true, invoker: 'public', memory: '4GiB', timeoutSeconds: 540 }, async (req, res) => {
  if (req.method !== 'POST') { res.set('Allow', 'POST').status(405).json({ error: 'Método não permitido.' }); return; }
  try {
    const params = req.body || {};
    const cacheKey = stableSerialize(params);
    const cached = requestCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) { res.set('Cache-Control', 'public, max-age=300').json(cached.data); return; }
    for (const [key, value] of requestCache) if (value.expiresAt <= Date.now()) requestCache.delete(key);
    if (requestCache.size >= 100) requestCache.delete(requestCache.keys().next().value);
    const persisted = await readCachedResults(params);
    if (persisted) {
      requestCache.set(cacheKey, { data: persisted, expiresAt: Date.now() + 5 * 60 * 1000 });
      res.set('Cache-Control', 'public, max-age=300').set('X-Results-Cache', 'cloud-storage').json(persisted);
      return;
    }
    const data = await buildResults(params);
    await writeCachedResults(params, data);
    requestCache.set(cacheKey, { data, expiresAt: Date.now() + 5 * 60 * 1000 });
    res.set('Cache-Control', 'public, max-age=300').set('X-Results-Cache', 'miss').json(data);
  } catch (error) {
    console.error('Erro ao consultar os dados abertos do TSE:', error);
    res.status(400).json({ error: error.message || 'Não foi possível consultar os dados oficiais do TSE.' });
  }
});
