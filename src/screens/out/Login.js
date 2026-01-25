import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, CheckCircle2 } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import Logo from '../../assets/logomarca.png';

/**
 * Componente de Login principal utilizando React.
 * Os estilos foram movidos para uma tag <style> interna para garantir a compatibilidade do Preview.
 */
export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Estado para animação
  const [animating, setAnimating] = useState(false);
  const [clickPos, setClickPos] = useState({ x: 0, y: 0 });

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      setLoading(false);
      setAnimating(true);
      
      // Aguarda a animação terminar antes de trocar de rota
      setTimeout(() => {
        navigate('/dashboard');
      }, 800);

    } catch (error) {
      setLoading(false);
      console.error("Erro no login:", error);
      let msg = "Erro ao entrar. Verifique suas credenciais.";
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        msg = "E-mail ou senha incorretos.";
      }
      setError(msg);
    }
  };

  const captureClick = (e) => {
    setClickPos({ x: e.clientX, y: e.clientY });
  };

  return (
    <div className="login-page-wrapper">

      <div className="login-card-web">
        
        {/* Seção Superior com Gradiente e Logo */}
        <header className="login-header-section">
          <div className="header-decoration">
            <div className="blur-circle circle-1"></div>
            <div className="blur-circle circle-2"></div>
          </div>
          
          <div className="header-brand">
            <img src={Logo} alt="Logo" className='logo-img' />
            <p> ¹
            </p>
          </div>
        </header>

        {/* Formulário de Autenticação */}
        <main className="login-form-content">
          <form onSubmit={handleLogin} className="auth-form">
            
            {/* Input de Identificação */}
            <div className="form-field">
              <label className="field-label">E-mail</label>
              <div className="input-container">
                <Mail size={20} className="field-icon-left" />
                <input 
                  type="text" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@campanha.com"
                  className="custom-input"
                  required
                />
              </div>
            </div>

            {/* Input de Senha */}
            <div className="form-field">
              <div className="label-flex">
                <label className="field-label">Senha</label>
                <button type="button" className="forgot-pass-btn">Esqueceu?</button>
              </div>
              <div className="input-container">
                <Lock size={20} className="field-icon-left" />
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="custom-input pr-12"
                  required
                />
                <button 
                  type="button" 
                  className="toggle-visibility"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Mensagem de Erro */}
            {error && (
              <div style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '10px', textAlign: 'center', fontWeight: '500' }}>
                {error}
              </div>
            )}

            {/* Botão de Ação Principal */}
            <button 
              type="submit" 
              className={`submit-login-btn ${loading ? 'btn-loading' : ''}`}
              disabled={loading}
              onClick={captureClick}
            >
              {loading ? (
                <div className="spinner"></div>
              ) : (
                <>
                  <span>Entrar na Plataforma</span>
                  <ArrowRight size={20} className="btn-arrow" />
                </>
              )}
            </button>
          </form>

          {/* Rodapé de Registro */}
          {/* <footer className="register-footer">
            <p className="no-account-text">Ainda não tem acesso?</p>
            <button className="create-account-btn">
              Criar Conta
            </button>
          </footer> */}
        </main>

        {/* Selos de Segurança */}
        <div className="security-badges">
          <span className="badge-item">
            <CheckCircle2 size={12} className="check-icon" /> 
            Conexão Segura
          </span>
          <span className="badge-divider"></span>
          <span className="badge-item">Privacidade Total</span>
          <span className="badge-divider"></span>
          <span className="badge-item">LGPD Compliant</span>
        </div>
      </div>

      {/* Elemento de Animação (Círculo Verde) */}
      {animating && (
        <div style={{
          position: 'fixed',
          top: clickPos.y,
          left: clickPos.x,
          width: '20px',
          height: '20px',
          backgroundColor: '#4ADE80', // Cor do botão
          borderRadius: '50%',
          transform: 'translate(-50%, -50%) scale(0)',
          animation: 'expandCircle 0.8s forwards',
          zIndex: 9999,
          pointerEvents: 'none'
        }}>
          <style>{`
            @keyframes expandCircle {
              0% { transform: translate(-50%, -50%) scale(0); }
              100% { transform: translate(-50%, -50%) scale(250); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}