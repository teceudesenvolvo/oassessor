import React from 'react';
import { Mail, MessageSquareMore } from 'lucide-react';
import PublicPageShell from '../../components/PublicPageShell';

export default function Contact() {
  return (
    <PublicPageShell
      activeKey="contact"
      kicker="Comercial e atendimento"
      title="Converse com a equipe e desenhe a operação ideal."
      subtitle="Se quiser avaliar plano, implantação, fluxo de equipe ou arquitetura de campanha, a gente entra com você na leitura do cenário."
    >
      <div className="public-grid-2">
        <article className="public-info-card">
          <h3>Fale conosco</h3>
          <p><Mail size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />contatos@blutecnologias.com.br</p>
          <a
            href="https://wa.me/5585997363433"
            target="_blank"
            rel="noreferrer"
            className="btn-whatsapp public-primary-cta"
            style={{ marginTop: '12px', textDecoration: 'none', width: 'fit-content' }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M19.11 4.93A9.77 9.77 0 0 0 12.18 2a9.86 9.86 0 0 0-8.5 14.89L2 22l5.29-1.62A9.86 9.86 0 0 0 22 11.85a9.76 9.76 0 0 0-2.89-6.92Zm-6.93 15.3a8.18 8.18 0 0 1-4.17-1.14l-.3-.18-3.14.96.99-3.06-.2-.31A8.19 8.19 0 1 1 12.18 20.23Zm4.49-6.15c-.25-.12-1.48-.73-1.71-.81-.23-.08-.4-.12-.56.12-.16.23-.64.8-.78.96-.14.16-.28.17-.53.06-.25-.12-1.04-.38-1.98-1.2-.73-.65-1.22-1.44-1.36-1.68-.14-.24-.02-.37.1-.49.11-.11.25-.28.37-.42.12-.14.16-.24.25-.4.08-.16.04-.3-.02-.42-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.41-.56-.41h-.48c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.58 4.09 3.61.57.25 1.02.4 1.37.51.58.18 1.11.15 1.53.09.47-.07 1.48-.6 1.69-1.18.21-.58.21-1.08.15-1.18-.06-.1-.22-.16-.47-.28Z" />
            </svg>
            WhatsApp: 85 99736-3433
          </a>
          <p><MessageSquareMore size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />Atendimento consultivo para campanhas e equipes.</p>
        </article>

        <article className="public-form-card">
          <h3>Envie uma mensagem</h3>
          <div className="public-form-grid">
            <label className="public-form-field full">
              <span className="public-form-label">Nome</span>
              <input type="text" placeholder="Seu nome" className="public-form-input" />
            </label>
            <label className="public-form-field full">
              <span className="public-form-label">E-mail</span>
              <input type="email" placeholder="voce@campanha.com" className="public-form-input" />
            </label>
            <label className="public-form-field full">
              <span className="public-form-label">Mensagem</span>
              <textarea placeholder="Conte um pouco sobre a campanha ou a necessidade." className="public-form-textarea" />
            </label>
          </div>
          <button type="button" className="btn-primary public-primary-cta" style={{ marginTop: '18px' }}>
            Enviar contato
          </button>
        </article>
      </div>
    </PublicPageShell>
  );
}
