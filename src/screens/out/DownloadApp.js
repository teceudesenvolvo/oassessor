import React, { useEffect } from 'react';
import Navbar from '../../components/Navbar';
import { Smartphone, Download } from 'lucide-react';

export default function DownloadApp() {
  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;

    // Detecção Android
    if (/android/i.test(userAgent)) {
        window.location.href = "https://play.google.com/store/apps/details?id=com.blutecnologias.oassessor&pcampaignid=web_share";
    }
    
    // Detecção iOS
    else if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
        window.location.href = "https://apps.apple.com/br/app/o-assessor/id6758312783";
    }
  }, []);

  return (
    <>
      <header className="hero-section" style={{ minHeight: '40vh' }}>
        <Navbar />
        <div className="hero-content">
          <h1>Baixe o App</h1>
          <p className="subtitle">Tenha o controle da sua campanha na palma da mão</p>
        </div>
      </header>
      <main className="content" style={{ marginTop: '40px', paddingBottom: '80px' }}>
        <div className="container" style={{ maxWidth: '600px', margin: '0 auto', padding: '0 20px', textAlign: 'center' }}>
            <div className="dashboard-card">
                <h3>Instalar Aplicativo</h3>
                <p style={{ color: '#64748b', lineHeight: '1.6', marginTop: '15px', marginBottom: '30px' }}>
                    Estamos identificando seu dispositivo. Se não for redirecionado automaticamente, escolha sua loja abaixo:
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' }}>
                    <a 
                        href="https://apps.apple.com/br/app/o-assessor/id6758312783" 
                        className="btn-primary"
                        style={{ width: '100%', maxWidth: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', textDecoration: 'none' }}
                    >
                        <Download size={20} />
                        Baixar para iPhone (iOS)
                    </a>

                    <a 
                        href="https://play.google.com/store/apps/details?id=com.blutecnologias.oassessor&pcampaignid=web_share" 
                        className="btn-primary"
                        style={{ width: '100%', maxWidth: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', backgroundColor: '#10b981', borderColor: '#10b981', textDecoration: 'none' }}
                    >
                        <Smartphone size={20} />
                        Baixar para Android
                    </a>
                </div>
            </div>
        </div>
      </main>
    </>
  );
}