// Footer.js
export default function Footer() {
  return (
    <footer className="main-footer">
      <div className="footer-content">
        <div className="footer-brand">
          <div className="logo-container">
            <span className="logo-o">O</span><span>Assessor</span>
          </div>
        </div>
        
        <div className="footer-info">
          <h4>Contato</h4>
          <p>Endereço: Avenida Prefeito Maurício Brasileiro...</p>
          <p>Telefone: (85) 3315-4462</p>
        </div>

        <div className="footer-links">
          <h4>Nossos Serviços</h4>
          <ul>
            <li>Registrar Reclamação</li>
            <li>Entrar na sua conta</li>
          </ul>
        </div>

        <div className="footer-apps">
          <div className="qr-code"></div>
          <div className="store-buttons">
             <div className="store-badge">App Store</div>
             <div className="store-badge">Google Play</div>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        Copyright © 2025 Procon CMSGA. Todos os direitos reservados.
      </div>
    </footer>
  );
}