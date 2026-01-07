// Header.js
export default function Header() {
  return (
    <header className="hero-section">
      <div className="logo-container">
        <span className="logo-o">O</span>
        <span className="logo-text">Assessor</span>
      </div>
      <div className="hero-content">
        <p className="subtitle">Câmara Municipal de São Gonçalo do Amarante - CE</p>
        <h1>Bem vindo ao Portal de Serviços</h1>
        <p className="small-text">Seja atendido facilmente no portal online.</p>
        <div className="button-group">
          <button className="btn-primary">Entrar</button>
          <button className="btn-outline">Cadastrar</button>
        </div>
      </div>
    </header>
  );
}