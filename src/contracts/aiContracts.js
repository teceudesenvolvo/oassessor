export const AI_FEATURES = [
  { id: 'strategic-summary', title: 'Resumo estratégico', description: 'Síntese de indicadores da campanha para leitura executiva.' },
  { id: 'voter-insights', title: 'Insights de eleitorado', description: 'Leitura de padrões em base eleitoral, pesquisas e território.' },
  { id: 'message-drafts', title: 'Rascunhos de mensagem', description: 'Sugestões de texto para comunicação segmentada.' },
  { id: 'demand-triage', title: 'Triagem de demandas', description: 'Classificação inicial de prioridade e encaminhamento.' }
];

export const AI_REQUEST_STATUSES = {
  idle: 'idle',
  loading: 'loading',
  success: 'success',
  error: 'error'
};

export const AI_PROVIDER_POLICY = {
  frontendMayUseSecret: false,
  backendRequired: true,
  recommendedTransport: 'cloud-function-or-api'
};
