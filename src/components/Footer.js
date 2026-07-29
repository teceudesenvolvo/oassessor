import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import Logo from '../assets/logomarca-vertical.png';
import AppStore from '../assets/appStore.png';
import GooglePlay from '../assets/googlePlay.png';

// Footer.js
export default function Footer() {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard');

  return (
    <footer className="main-footer">
      {!isDashboard && (
        <div className="footer-content">
          <div className="footer-brand">
            <div className="footer-brand-mark">
              <img src={Logo} alt="Logo" className='logo-img-footer' />
            </div>
            <p>Plataforma premium para gestão de campanhas, operação territorial e relacionamento eleitoral.</p>
          </div>
          
          <div className="footer-info">
            <h4>Portal</h4>
            <p>Experiência web com foco em performance, mobilização e inteligência operacional.</p>
          </div>

          <div className="footer-links">
            <h4>Acesso</h4>
            <ul>
              <li><Link className='footer-links' to="/login">Cadastrar-se</Link></li>
              <li><Link className='footer-links' to="/login">Entrar na sua conta</Link></li>
            </ul>
          </div>

          <div className="footer-apps">
            <h4>Apps</h4>
            <div className="store-buttons">
               <div className="store-badge"><img className='lojas-app-footer' src={AppStore} alt="App Store"/></div>
               <div className="store-badge"><img className='lojas-app-footer' src={GooglePlay} alt="Google Play"/></div>
            </div>
          </div>
        </div>
      )}
      <div className="footer-bottom">
        Copyright © 2025 Blu Tecnologias. Todos os direitos reservados.
      </div>
    </footer>
  );
}
