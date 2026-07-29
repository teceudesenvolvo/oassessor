import { AI_PROVIDER_POLICY } from '../contracts/aiContracts';

const NOT_IMPLEMENTED_ERROR = 'A integração de IA precisa ser executada por backend seguro. Nenhuma chave é usada no frontend.';

const createNotImplementedResponse = (featureId, payload = {}) => ({
  featureId,
  status: 'pending_backend',
  policy: AI_PROVIDER_POLICY,
  message: NOT_IMPLEMENTED_ERROR,
  payload
});

export const aiService = {
  async getStrategicSummary(context) {
    return createNotImplementedResponse('strategic-summary', context);
  },

  async getVoterInsights(context) {
    return createNotImplementedResponse('voter-insights', context);
  },

  async getMessageDraft(context) {
    return createNotImplementedResponse('message-drafts', context);
  },

  async getDemandTriage(context) {
    return createNotImplementedResponse('demand-triage', context);
  }
};
