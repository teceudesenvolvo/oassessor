import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import PublicPageShell from '../../components/PublicPageShell';

const COMPLETE_REGISTRATION_URL = 'https://us-central1-oassessor-blu.cloudfunctions.net/completeTeamMemberRegistration';

export default function TeamMemberRegistration() {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [location]);

  const handleRegister = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      setLoading(false);
      return;
    }

    try {
      if (!email) {
        setError('O e-mail não foi fornecido no link de convite.');
        setLoading(false);
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();

      const response = await fetch(COMPLETE_REGISTRATION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao finalizar seu cadastro.');
      }

      navigate('/dashboard');
    } catch (registrationError) {
      console.error(registrationError);
      let msg = 'Erro ao realizar cadastro.';
      if (registrationError.code === 'auth/email-already-in-use') {
        msg = 'Este e-mail já possui uma conta. Tente entrar na plataforma.';
      } else if (registrationError.code === 'auth/weak-password') {
        msg = 'A senha deve ter pelo menos 6 caracteres.';
      } else {
        msg = registrationError.message;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicPageShell
      activeKey="login"
      kicker="Convite para equipe"
      title="Finalize seu cadastro e entre na operação."
      subtitle="Defina sua senha para ativar o acesso ao ambiente da campanha e receber o contexto já configurado pela coordenação."
      compactHero
    >
      <div className="public-grid-2">
        <article className="public-panel">
          <h2>Entrada orientada</h2>
          <p>Seu acesso foi preparado por um administrador. Ao concluir o cadastro, você entra diretamente na estrutura de trabalho da equipe.</p>
        </article>

        <article className="public-form-card">
          <h3>Finalizar cadastro</h3>
          {error ? <div className="public-alert">{error}</div> : null}

          <form onSubmit={handleRegister} className="public-form-grid" style={{ marginTop: error ? '14px' : 0 }}>
            <label className="public-form-field full">
              <span className="public-form-label">E-mail do convite</span>
              <input type="email" value={email} disabled className="public-form-input" />
            </label>

            <label className="public-form-field full">
              <span className="public-form-label">Senha</span>
              <div className="public-inline-icon-field">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Crie uma senha"
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

            <label className="public-form-field full">
              <span className="public-form-label">Confirmar senha</span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repita a senha"
                className="public-form-input"
                required
              />
            </label>

            <button type="submit" className="btn-primary public-primary-cta" disabled={loading}>
              {loading ? 'Processando...' : 'Entrar na equipe'}
              {!loading ? <ArrowRight size={18} /> : null}
            </button>
          </form>
        </article>
      </div>
    </PublicPageShell>
  );
}
