import React from 'react';
import PublicPageShell from '../../components/PublicPageShell';

export default function About() {
  return (
    <PublicPageShell
      activeKey="about"
      kicker="Tecnologia, estratégia e operação"
      title="Construímos software para campanhas que precisam de ritmo."
      subtitle="O oAssessor nasceu para transformar caos operacional em coordenação, leitura de campo e decisão com contexto."
    >
      <div className="public-grid-2">
        <article className="public-panel">
          <h2>Nossa missão</h2>
          <p>
            Entregar uma plataforma eleitoral realmente útil no dia a dia da campanha, conectando base de eleitores, equipe,
            lideranças, tarefas, visitas, território e relatórios em um fluxo único.
          </p>
        </article>

        <article className="public-panel">
          <h2>Quem somos</h2>
          <p>
            Somos uma equipe de tecnologia e operação digital focada em produtos que ajudam campanhas a sair do improviso e
            operar com mais previsibilidade, inteligência e velocidade de resposta.
          </p>
        </article>
      </div>
    </PublicPageShell>
  );
}
