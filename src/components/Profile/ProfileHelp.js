import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, MessageCircle, Mail } from 'lucide-react';

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
    // Substitua pelo número real de suporte
    window.open('https://wa.me/5511999999999', '_blank'); 
  };

  const handleEmailSupport = () => {
    window.location.href = 'mailto:suporte@oassessor.com.br';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <h3 style={{ color: '#0f172a', marginBottom: '10px' }}>Como podemos ajudar?</h3>
        <p style={{ color: '#64748b' }}>Encontre respostas rápidas ou entre em contato com nosso time.</p>
      </div>

      {/* Contact Options */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <div 
          onClick={handleWhatsAppSupport}
          style={{ 
            backgroundColor: '#dcfce7', 
            padding: '20px', 
            borderRadius: '12px', 
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
            border: '1px solid #bbf7d0',
            transition: 'transform 0.2s'
          }}
        >
          <MessageCircle size={32} color="#16a34a" />
          <span style={{ fontWeight: '600', color: '#166534' }}>Suporte via WhatsApp</span>
        </div>

        <div 
          onClick={handleEmailSupport}
          style={{ 
            backgroundColor: '#e0f2fe', 
            padding: '20px', 
            borderRadius: '12px', 
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
            border: '1px solid #bae6fd',
            transition: 'transform 0.2s'
          }}
        >
          <Mail size={32} color="#0284c7" />
          <span style={{ fontWeight: '600', color: '#075985' }}>Suporte via E-mail</span>
        </div>
      </div>

      {/* FAQ Section */}
      <div>
        <h4 style={{ color: '#0f172a', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <HelpCircle size={20} /> Perguntas Frequentes
        </h4>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {faqs.map((faq, index) => (
            <div key={index} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
              <button 
                onClick={() => toggleFaq(index)}
                style={{ 
                  width: '100%', 
                  padding: '15px', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  background: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontWeight: '500',
                  color: '#334155'
                }}
              >
                {faq.question}
                {openFaq === index ? <ChevronUp size={18} color="#64748b" /> : <ChevronDown size={18} color="#64748b" />}
              </button>
              
              {openFaq === index && (
                <div style={{ padding: '15px', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#64748b', fontSize: '0.9rem', lineHeight: '1.5' }}>
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
