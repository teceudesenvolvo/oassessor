const ENDPOINT = 'https://us-central1-oassessor-blu.cloudfunctions.net/tseOpenDataResults';

export async function fetchTseOpenDataResults(params) {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const body = await response.text();
  let result;
  try {
    result = JSON.parse(body);
  } catch {
    throw new Error(`Resposta inválida da base oficial do TSE (HTTP ${response.status}).`);
  }
  if (!response.ok) throw new Error(result.error || `Falha ao consultar a base oficial do TSE (HTTP ${response.status}).`);
  return result;
}
