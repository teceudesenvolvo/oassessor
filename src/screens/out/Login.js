import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, Mail } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import PublicPageShell from '../../components/PublicPageShell';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (loginError) {
      console.error('Erro no login:', loginError);
      let msg = 'Erro ao entrar. Verifique suas credenciais.';
      if (
        loginError.code === 'auth/invalid-credential' ||
        loginError.code === 'auth/user-not-found' ||
        loginError.code === 'auth/wrong-password'
      ) {
        msg = 'E-mail ou senha incorretos.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicPageShell
      activeKey="login"
      kicker="Acesso seguro à operação"
      title="Entre na plataforma e retome o pulso da campanha."
      subtitle="Acesse sua central com visão de equipe, base eleitoral, território e prioridades do dia em um só ambiente."
      contentClassName="public-auth-shell"
      compactHero
      actions={
        <>
          <button type="button" className="public-glass-btn" onClick={() => navigate('/plans')}>Ver planos</button>
          <button type="button" className="public-glass-btn" onClick={() => navigate('/contact')}>Preciso de ajuda</button>
        </>
      }
    >
      <div className="public-grid-2">
        <article className="public-panel">
          <h2>Por que entrar pelo oAssessor</h2>
          <p>Comece o dia com leitura clara da base, tarefas críticas, agenda, equipes em campo e sinais operacionais que exigem decisão.</p>
          <p>O produto foi desenhado para coordenação real, não apenas para cadastro isolado.</p>
        </article>

        <article className="public-form-card">
          <h3>Entrar na plataforma</h3>
          {error ? <div className="public-alert">{error}</div> : null}

          <form onSubmit={handleLogin} className="public-form-grid" style={{ marginTop: error ? '14px' : 0 }}>
            <label className="public-form-field full">
              <span className="public-form-label">E-mail</span>
              <div className="public-inline-icon-field">
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="voce@campanha.com"
                  className="public-form-input"
                  required
                />
                <span className="public-inline-action" aria-hidden="true">
                  <Mail size={18} />
                </span>
              </div>
            </label>

            <label className="public-form-field full">
              <span className="public-form-label">Senha</span>
              <div className="public-inline-icon-field">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Sua senha"
                  className="public-form-input"
                  required
                />
                <button
                  type="button"
                  className="public-inline-action"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            <button type="submit" className="btn-primary public-primary-cta" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar agora'}
              {!loading ? <ArrowRight size={18} /> : null}
            </button>
          </form>
        </article>
      </div>
    </PublicPageShell>
  );
}
