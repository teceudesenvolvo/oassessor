import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Logo from '../assets/logomarca-vertical.png';

export default function Navbar() {
    const navigate = useNavigate();

    return (
        <nav className="main-nav">
            <div className="nav-brand">
                <img src={Logo} alt="Logo" className='logo-header' />
            </div>
            <ul className="nav-list">
                <li><Link to="/">Início</Link></li>
                <li><Link to="/plans">Planos</Link></li>
                <li><Link to="/about">Sobre</Link></li>
                <li><Link to="/contact">Contato</Link></li>
                <button className="nav-btn" onClick={() => navigate('/login')}>Entrar</button>
            </ul>
        </nav>
    );
}