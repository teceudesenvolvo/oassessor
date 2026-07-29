import { useMemo, useState } from 'react';
import { AI_FEATURES, AI_REQUEST_STATUSES, AI_PROVIDER_POLICY } from '../contracts/aiContracts';
import { aiService } from '../services/aiService';

export function useAICenter() {
  const [selectedFeatureId, setSelectedFeatureId] = useState(AI_FEATURES[0].id);
  const [status, setStatus] = useState(AI_REQUEST_STATUSES.idle);
  const [result, setResult] = useState(null);

  const selectedFeature = useMemo(
    () => AI_FEATURES.find((item) => item.id === selectedFeatureId) || AI_FEATURES[0],
    [selectedFeatureId]
  );

  const runFeature = async (payload) => {
    try {
      setStatus(AI_REQUEST_STATUSES.loading);

      let response = null;
      if (selectedFeatureId === 'strategic-summary') response = await aiService.getStrategicSummary(payload);
      if (selectedFeatureId === 'voter-insights') response = await aiService.getVoterInsights(payload);
      if (selectedFeatureId === 'message-drafts') response = await aiService.getMessageDraft(payload);
      if (selectedFeatureId === 'demand-triage') response = await aiService.getDemandTriage(payload);

      setResult(response);
      setStatus(AI_REQUEST_STATUSES.success);
    } catch (error) {
      setResult({
        message: error.message || 'Falha ao processar requisição de IA.',
        policy: AI_PROVIDER_POLICY
      });
      setStatus(AI_REQUEST_STATUSES.error);
    }
  };

  return {
    features: AI_FEATURES,
    selectedFeatureId,
    setSelectedFeatureId,
    selectedFeature,
    status,
    result,
    policy: AI_PROVIDER_POLICY,
    runFeature
  };
}
