import React from 'react';
import Navbar from '../../components/Navbar';
import { Mail } from 'lucide-react';

export default function Contact() {
  return (
    <>
      <header className="hero-section" style={{ minHeight: '40vh' }}>
        <Navbar />
        <div className="hero-content">
          <h1>Contato</h1>
          <p className="subtitle">Estamos prontos para atender você</p>
        </div>
      </header>
      <main className="content" style={{ marginTop: '40px', paddingBottom: '80px' }}>
        <div className="container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 20px' }}>
            <div className="services-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                <div className="dashboard-card">
                    <h3>Fale Conosco</h3>
                    <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', color: '#64748b' }}>
                            <Mail size={24} color="#2563eb" />
                            <span>contato@oassessor.com.br</span>
                        </div>
                        
                    </div>
                </div>

                <div className="dashboard-card">
                    <h3>Envie uma Mensagem</h3>
                    <form style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
                        <input type="text" placeholder="Seu Nome" className="custom-input" style={{ width: '85%' }} />
                        <input type="email" placeholder="Seu E-mail" className="custom-input" style={{ width: '85%' }} />
                        <textarea placeholder="Sua Mensagem" className="custom-input" style={{ width: '85%', minHeight: '120px', resize: 'vertical' }}></textarea>
                        <button className="btn-primary" style={{ justifyContent: 'center' }}>Enviar</button>
                    </form>
                </div>
            </div>
        </div>
      </main>
    </>
  );
}