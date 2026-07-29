import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Database, HardDriveUpload, LoaderCircle } from 'lucide-react';
import { ref, get, query, orderByChild, equalTo } from '../../services/firestoreDatabase';
import InsightPanel from '../../components/dashboard/InsightPanel';
import MetricCard from '../../components/dashboard/MetricCard';
import { auth, database } from '../../firebaseConfig';
import { useAuth } from '../../useAuth';

const MIGRATION_URL = 'https://us-central1-oassessor-blu.cloudfunctions.net/migrateRtdbToFirestore';

const COLLECTIONS = [
  { key: 'users', label: 'Users', description: 'Perfis principais, permissões e vínculos administrativos.' },
  { key: 'assessores', label: 'Assessores', description: 'Equipe operacional, relações com admin e dados de apoio.' },
  { key: 'eleitores', label: 'Eleitores', description: 'Base principal, funil, histórico e mídias inline.' },
  { key: 'tarefas', label: 'Tarefas', description: 'Agenda operacional, visitas, retornos e compromissos.' },
  { key: 'notificacoes', label: 'Notificações', description: 'Mensagens internas e leitura administrativa.' },
  { key: 'eventos', label: 'Eventos', description: 'Agenda expandida, participantes e presença.' },
  { key: 'demandas', label: 'Demandas', description: 'Protocolos, status e evolução de atendimento.' },
  { key: 'voluntarios', label: 'Voluntários', description: 'Disponibilidade, habilidades e histórico operacional.' }
];

export default function DataMigration() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [activeCollection, setActiveCollection] = useState('');
  const [results, setResults] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) return;
      try {
        const directSnapshot = await get(ref(database, `users/${user.uid}`));
        if (directSnapshot.exists() && directSnapshot.val().tipoUser === 'admin') {
          setIsAdmin(true);
          return;
        }

        const indexedSnapshot = await get(query(ref(database, 'users'), orderByChild('userId'), equalTo(user.uid)));
        if (indexedSnapshot.exists()) {
          const data = indexedSnapshot.val();
          const firstKey = Object.keys(data)[0];
          setIsAdmin(data[firstKey]?.tipoUser === 'admin');
          return;
        }

        setIsAdmin(false);
      } finally {
        setCheckingAccess(false);
      }
    };

    checkAccess();
  }, [user]);

  const startMigration = async (collectionKey) => {
    setActiveCollection(collectionKey);
    setError('');

    try {
      const idToken = await auth.currentUser.getIdToken(true);
      const response = await fetch(MIGRATION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({ collection: collectionKey })
      });

      const responseText = await response.text();
      let body;
      try {
        body = responseText ? JSON.parse(responseText) : {};
      } catch {
        body = { error: responseText || `A função respondeu com HTTP ${response.status}.` };
      }
      if (!response.ok && response.status !== 207) {
        const diagnostic = [
          body.error,
          body.details,
          body.stage ? `Etapa: ${body.stage}.` : '',
          body.requestId ? `Protocolo: ${body.requestId}.` : ''
        ].filter(Boolean).join(' ');
        throw new Error(diagnostic || `Não foi possível migrar a collection ${collectionKey}.`);
      }

      setResults((prev) => ({
        ...prev,
        [collectionKey]: {
          ...body,
          completedAt: new Date().toISOString(),
          success: true
        }
      }));
    } catch (migrationError) {
      setResults((prev) => ({
        ...prev,
        [collectionKey]: {
          success: false,
          error: migrationError.message,
          completedAt: new Date().toISOString()
        }
      }));
      setError(migrationError.message);
    } finally {
      setActiveCollection('');
    }
  };

  const summary = useMemo(() => {
    const values = Object.values(results);
    return {
      completed: values.filter((item) => item?.success).length,
      documents: values.reduce((acc, item) => acc + (item?.documents || 0), 0),
      mediaFiles: values.reduce((acc, item) => acc + (item?.mediaFiles || 0), 0)
    };
  }, [results]);

  if (checkingAccess) return <div style={{ padding: 32 }}>Verificando acesso...</div>;

  if (!isAdmin) {
    return (
      <div style={{ padding: 32, color: '#991b1b' }}>
        Esta área é exclusiva para administradores.
      </div>
    );
  }

  return (
    <div className="campaign-dashboard">
      <section className="campaign-filters-card">
        <div className="campaign-filters-header">
          <div>
            <p className="campaign-kicker">
              <Database size={16} />
              Migração controlada
            </p>
            <h3>Migração por collection</h3>
          </div>
        </div>
        <p style={{ margin: 0, color: '#64748b', lineHeight: 1.6 }}>
          Agora a migração é feita collection por collection. Isso nos dá mais previsibilidade, reduz risco operacional e facilita validar cada bloco antes de avançar.
        </p>
      </section>

      <section className="campaign-hero">
        <div className="campaign-hero-copy">
          <p className="campaign-kicker">
            <HardDriveUpload size={16} />
            RTDB → Firestore + Storage
          </p>
          <h2>Migre a base em etapas menores, com visibilidade clara do que já foi processado.</h2>
          <span>
            A origem no RTDB não é apagada. Quando houver mídia inline em Base64, ela segue para o Storage e o documento passa a guardar apenas o caminho.
          </span>
        </div>
        <div className="campaign-goal-card">
          <span>Collections planejadas</span>
          <strong>{COLLECTIONS.length}</strong>
          <p>{summary.completed} concluída(s), {summary.documents} documentos e {summary.mediaFiles} mídias processadas nesta sessão.</p>
        </div>
      </section>

      <div className="campaign-metrics-grid">
        <MetricCard title="Collections concluídas" value={summary.completed} helper="Migradas nesta sessão" />
        <MetricCard title="Documentos processados" value={summary.documents} helper="Somatório da sessão" tone="highlight" />
        <MetricCard title="Mídias movidas" value={summary.mediaFiles} helper="Arquivos enviados ao Storage" tone="success" />
      </div>

      <InsightPanel title="Confirmação administrativa" subtitle="Proteção antes de iniciar qualquer collection">
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="campaign-alert-card warning">
            <AlertTriangle size={18} />
            <div>
              <strong>Operação administrativa e repetível</strong>
              <p>A migração sobrescreve documentos de mesmo ID no destino, então vamos executar por etapas e validar collection por collection.</p>
            </div>
          </div>

          <label className="settings-toggle-item" style={{ maxWidth: 540 }}>
            <div>
              <strong>Liberar ações de migração</strong>
              <p>Confirma que deseja executar migrações individualizadas.</p>
            </div>
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
          </label>

          {error ? <div style={{ color: '#dc2626' }}>{error}</div> : null}
        </div>
      </InsightPanel>

      <div className="campaign-secondary-grid settings-catalog-grid">
        {COLLECTIONS.map((item) => {
          const result = results[item.key];
          const isRunning = activeCollection === item.key;

          return (
            <InsightPanel
              key={item.key}
              title={item.label}
              subtitle={item.description}
              compact
            >
              <div style={{ display: 'grid', gap: 16 }}>
                <div className="campaign-note-list">
                  <div className="campaign-note-item">
                    <strong>Status</strong>
                    <p>
                      {isRunning
                        ? 'Migrando agora'
                        : result?.success
                          ? 'Concluída'
                          : result?.error
                            ? 'Falhou'
                            : 'Pendente'}
                    </p>
                  </div>
                  <div className="campaign-note-item">
                    <strong>Documentos</strong>
                    <p>{result?.documents || 0}</p>
                  </div>
                  <div className="campaign-note-item">
                    <strong>Mídias</strong>
                    <p>{result?.mediaFiles || 0}</p>
                  </div>
                </div>

                {result?.failuresCount ? (
                  <div className="campaign-empty-state" style={{ color: '#b45309' }}>
                    {result.failuresCount} falha(s) registrada(s) nessa collection.
                  </div>
                ) : null}

                {result?.error ? (
                  <div className="campaign-empty-state" style={{ color: '#dc2626' }}>
                    {result.error}
                  </div>
                ) : null}

                {result?.success ? (
                  <div className="campaign-alert-card success">
                    <CheckCircle2 size={18} />
                    <div>
                      <strong>Migração concluída</strong>
                      <p>{item.label} processada com sucesso.</p>
                    </div>
                  </div>
                ) : null}

                <div className="funnel-modal-actions">
                  <span />
                  <button
                    className="btn-primary"
                    disabled={!confirmed || !!activeCollection}
                    onClick={() => startMigration(item.key)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                  >
                    {isRunning ? <LoaderCircle size={16} className="spin" /> : <HardDriveUpload size={16} />}
                    {isRunning ? 'Migrando...' : `Migrar ${item.label}`}
                  </button>
                </div>
              </div>
            </InsightPanel>
          );
        })}
      </div>
    </div>
  );
}
