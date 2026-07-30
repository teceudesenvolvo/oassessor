import { useCallback, useEffect, useState } from 'react';
import { loadAccountabilitySummary, resolveAccountabilityScope } from '../services/accountabilityService';

export function useAccountabilityCenter(user) {
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState(null);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const resolvedScope = await resolveAccountabilityScope(user);
      const loadedSummary = await loadAccountabilitySummary(resolvedScope);
      setScope(resolvedScope);
      setSummary(loadedSummary);
    } catch (err) {
      console.error('Erro ao carregar central de prestação de contas:', err);
      setError('Não foi possível carregar a central de prestação de contas.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    loading,
    error,
    scope,
    summary,
    reload
  };
}
