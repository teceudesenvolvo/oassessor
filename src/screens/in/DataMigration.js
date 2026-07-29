import React, { useEffect, useState } from 'react';
import { Database, HardDriveUpload, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ref, get } from 'firebase/database';
import { auth, database } from '../../firebaseConfig';
import { useAuth } from '../../useAuth';

const MIGRATION_URL = 'https://us-central1-oassessor-blu.cloudfunctions.net/migrateRtdbToFirestore';

export default function DataMigration() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) return;
      try {
        const snapshot = await get(ref(database, `users/${user.uid}`));
        setIsAdmin(snapshot.exists() && snapshot.val().tipoUser === 'admin');
      } finally {
        setCheckingAccess(false);
      }
    };
    checkAccess();
  }, [user]);

  const startMigration = async () => {
    setMigrating(true);
    setError('');
    setResult(null);

    try {
      const idToken = await auth.currentUser.getIdToken(true);
      const response = await fetch(MIGRATION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        }
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Não foi possível concluir a migração.');
      setResult(body);
    } catch (migrationError) {
      setError(migrationError.message);
    } finally {
      setMigrating(false);
    }
  };

  if (checkingAccess) return <div style={{ padding: 32 }}>Verificando acesso...</div>;
  if (!isAdmin) {
    return (
      <div style={{ padding: 32, color: '#991b1b' }}>
        Esta área é exclusiva para administradores.
      </div>
    );
  }

  return (
    <section style={{ maxWidth: 760, margin: '0 auto', padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <Database size={30} color="#0f172a" />
        <h1 style={{ margin: 0 }}>Migração de dados</h1>
      </div>
      <p style={{ color: '#475569', lineHeight: 1.6 }}>
        Copia todos os nós do Realtime Database para coleções equivalentes no Firestore.
        Imagens, PDFs e outras mídias em Base64 são enviadas ao Storage; o documento
        recebe somente o caminho do arquivo.
      </p>

      <div style={{ background: '#fffbeb', border: '1px solid #fbbf24', borderRadius: 10, padding: 16, display: 'flex', gap: 12, margin: '24px 0' }}>
        <AlertTriangle color="#b45309" style={{ flexShrink: 0 }} />
        <div>
          <strong>Operação administrativa</strong>
          <div style={{ color: '#78350f', marginTop: 4 }}>
            A origem no RTDB não será apagada. A operação pode ser repetida com segurança:
            documentos e arquivos com o mesmo caminho serão atualizados.
          </div>
        </div>
      </div>

      <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 18 }}>
        <input
          type="checkbox"
          checked={confirmed}
          disabled={migrating}
          onChange={(event) => setConfirmed(event.target.checked)}
        />
        Confirmo que desejo copiar toda a base para o Firestore e Storage.
      </label>

      <button
        onClick={startMigration}
        disabled={!confirmed || migrating}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, border: 0, borderRadius: 8,
          padding: '12px 18px', color: 'white',
          background: !confirmed || migrating ? '#94a3b8' : '#0f766e',
          cursor: !confirmed || migrating ? 'not-allowed' : 'pointer'
        }}
      >
        <HardDriveUpload size={20} />
        {migrating ? 'Migrando... não feche esta página' : 'Iniciar migração completa'}
      </button>

      {error && <p style={{ color: '#b91c1c', marginTop: 18 }}>{error}</p>}
      {result && (
        <div style={{ marginTop: 22, padding: 16, borderRadius: 10, background: '#ecfdf5', color: '#065f46' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <CheckCircle2 size={21} />
            <strong>Migração concluída</strong>
          </div>
          <div style={{ marginTop: 8 }}>
            {result.collections} coleções, {result.documents} documentos e {result.mediaFiles} mídias processadas.
          </div>
        </div>
      )}
    </section>
  );
}
