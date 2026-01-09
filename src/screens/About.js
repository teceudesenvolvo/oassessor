import React from 'react';
import Navbar from '../components/Navbar';

export default function About() {
  return (
    <>
      <header className="hero-section" style={{ minHeight: '40vh' }}>
        <Navbar />
        <div className="hero-content">
          <h1>Sobre Nós</h1>
          <p className="subtitle">Conheça a nossa história e missão</p>
        </div>
      </header>
      <main className="content" style={{ marginTop: '40px', paddingBottom: '80px' }}>
        <div className="container" style={{ maxWidth: '800px', margin: '0 auto', padding: '0 20px', textAlign: 'center' }}>
            <div className="dashboard-card">
                <h3>Nossa Missão</h3>
                <p style={{ color: '#64748b', lineHeight: '1.6', marginTop: '15px' }}>
                    Nossa missão é fornecer ferramentas tecnológicas de ponta para campanhas eleitorais, 
                    permitindo que candidatos e equipes gerenciem seus dados com eficiência, segurança e inteligência.
                    Acreditamos que a tecnologia pode transformar a política, tornando-a mais transparente e acessível.
                </p>
                
                <h3 style={{ marginTop: '40px' }}>Quem Somos</h3>
                <p style={{ color: '#64748b', lineHeight: '1.6', marginTop: '15px' }}>
                    Somos uma equipe de desenvolvedores e especialistas em marketing político apaixonados por inovação.
                    O OAssessor nasceu da necessidade de organizar e otimizar o trabalho de campo, trazendo
                    métricas precisas e controle total para o comitê central.
                </p>
            </div>
        </div>
      </main>
    </>
  );
}