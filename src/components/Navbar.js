import React from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../assets/logomarca-vertical.png';

export default function Navbar() {
    const navigate = useNavigate();

    return (
        <nav className="main-nav">
            <div className="nav-brand">
                <img src={Logo} alt="Logo" className='logo-header' />
            </div>
            <ul className="nav-list">
                <li><a href="#home">Início</a></li>
                <li><a href="#plans">Planos</a></li>
                <li><a href="#about">Sobre</a></li>
                <li><a href="#contact">Contato</a></li>
                <button className="nav-btn" onClick={() => navigate('/login')}>Entrar</button>
            </ul>
        </nav>
    );
}