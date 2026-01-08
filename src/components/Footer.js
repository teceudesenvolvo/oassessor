import React from 'react';
import Logo from '../assets/logomarca.png';
import AppStore from '../assets/appStore.png';
import GooglePlay from '../assets/googlePlay.png';

// Footer.js
export default function Footer() {
  return (
    <footer className="main-footer">
      <div className="footer-content">
        <div className="footer-brand">
          <div className="logo-container">
            <span><img src={Logo} alt="Logo" className='logo-img-footer' /></span>
          </div>
        </div>
        
        <div className="footer-info">
          <h4>Contato</h4>
          <p>Email: </p>
          <p>Telefone: </p>
        </div>

        <div className="footer-links">
          <h4>Links</h4>
          <ul>
            <li><a className='footer-links' href="/">Cadastrar-se</a></li>
            <li><a className='footer-links' href="/">Entrar na sua conta</a></li>
          </ul>
        </div>

        <div className="footer-apps">
          <div className="store-buttons">
             <div className="store-badge"><img className='lojas-app-footer' src={AppStore} alt="App Store"/></div>
             <div className="store-badge"><img className='lojas-app-footer' src={GooglePlay} alt="Google Play"/></div>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        Copyright © 2025 Blu Tecnologias. Todos os direitos reservados.
      </div>
    </footer>
  );
}