import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, MessageCircle, Mail, ExternalLink } from 'lucide-react';

export default function ProfileHelp() {
  const [openFaq, setOpenFaq] = useState(null);

  const faqs = [
    {
      question: "Como adiciono um novo eleitor?",
      answer: "Vá para a aba 'Eleitores' no menu lateral e clique no botão 'Novo Eleitor'. Preencha os dados obrigatórios e salve."
    },
    {
      question: "Como convidar membros para minha equipe?",
      answer: "Na aba 'Minha Equipe', clique em 'Novo Membro'. Insira o nome e e-mail do assessor. Ele receberá um convite por e-mail para definir a senha."
    },
    {
      question: "Posso exportar meus dados?",
      answer: "Sim, na lista de eleitores você pode clicar no ícone de PDF para exportar a lista atual filtrada."
    },
    {
      question: "Como funciona a cobrança?",
      answer: "A cobrança é feita mensalmente no cartão de crédito cadastrado. Você pode alterar o cartão na aba 'Dados de Pagamento' do seu perfil."
    }
  ];

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handleWhatsAppSupport = () => {
    window.open('https://wa.me/5585997363433', '_blank');
  };

  const handleEmailSupport = () => {
    window.location.href = 'mailto:contatos@blutecnologias.com.br';
  };

  return (
    <div className="profile-help-shell">
      <div className="profile-section-heading">
        <h3>Como podemos ajudar?</h3>
        <p>Encontre respostas rápidas ou fale com nosso time comercial e de atendimento.</p>
      </div>

      <div className="profile-help-grid">
        <button
          type="button"
          onClick={handleWhatsAppSupport}
          className="profile-help-card whatsapp"
        >
          <div className="profile-help-card-icon">
            <MessageCircle size={24} />
          </div>
          <div className="profile-help-card-copy">
            <strong>WhatsApp</strong>
            <span>85 99736-3433</span>
            <small>Atendimento consultivo com um toque.</small>
          </div>
          <ExternalLink size={18} />
        </button>

        <button
          type="button"
          onClick={handleEmailSupport}
          className="profile-help-card email"
        >
          <div className="profile-help-card-icon">
            <Mail size={24} />
          </div>
          <div className="profile-help-card-copy">
            <strong>E-mail</strong>
            <span>contatos@blutecnologias.com.br</span>
            <small>Fale com nosso time sobre operação, planos e implantação.</small>
          </div>
          <ExternalLink size={18} />
        </button>
      </div>

      <div className="profile-help-faq">
        <h4 className="profile-help-title">
          <HelpCircle size={20} /> Perguntas Frequentes
        </h4>

        <div className="profile-help-faq-list">
          {faqs.map((faq, index) => (
            <div key={index} className="profile-faq-item">
              <button 
                onClick={() => toggleFaq(index)}
                className="profile-faq-question"
              >
                {faq.question}
                {openFaq === index ? <ChevronUp size={18} color="#64748b" /> : <ChevronDown size={18} color="#64748b" />}
              </button>
              
              {openFaq === index && (
                <div className="profile-faq-answer">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
