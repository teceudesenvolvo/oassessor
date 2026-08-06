import React, { useEffect, useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, MessageCircle, Mail, ExternalLink } from 'lucide-react';
import { get, ref } from '../../services/firestoreDatabase';
import { database } from '../../firebaseConfig';

const DEFAULT_CHANNELS = {
  whatsapp: '5585997363433',
  email: 'contatos@blutecnologias.com.br',
  whatsappLabel: 'Atendimento consultivo com um toque.',
  emailLabel: 'Fale com nosso time sobre operação, planos e implantação.'
};

export default function ProfileHelp() {
  const [openFaq, setOpenFaq] = useState(null);
  const [faqs, setFaqs] = useState([]);
  const [channels, setChannels] = useState(DEFAULT_CHANNELS);

  useEffect(() => {
    const load = async () => {
      try {
        const [faqSnapshot, channelsSnapshot] = await Promise.all([
          get(ref(database, 'supportFaqs')),
          get(ref(database, 'supportChannels/public'))
        ]);

        if (faqSnapshot.exists()) {
          const items = Object.entries(faqSnapshot.val())
            .map(([id, value]) => ({ id, ...value }))
            .filter((item) => item.active !== false)
            .sort((left, right) => Number(left.order || 0) - Number(right.order || 0));
          setFaqs(items);
        }

        if (channelsSnapshot.exists()) {
          setChannels((prev) => ({ ...prev, ...(channelsSnapshot.val() || {}) }));
        }
      } catch (error) {
        console.error('Erro ao carregar FAC/SAC:', error);
      }
    };

    load();
  }, []);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handleWhatsAppSupport = () => {
    window.open(`https://wa.me/${channels.whatsapp}`, '_blank');
  };

  const handleEmailSupport = () => {
    window.location.href = `mailto:${channels.email}`;
  };

  return (
    <div className="profile-help-shell">
      <div className="profile-section-heading">
        <h3>Como podemos ajudar?</h3>
        <p>Encontre respostas rápidas no FAC ou fale com nosso atendimento pelo SAC.</p>
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
            <span>{channels.whatsapp}</span>
            <small>{channels.whatsappLabel}</small>
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
            <span>{channels.email}</span>
            <small>{channels.emailLabel}</small>
          </div>
          <ExternalLink size={18} />
        </button>
      </div>

      <div className="profile-help-faq">
        <h4 className="profile-help-title">
          <HelpCircle size={20} /> FAC · Perguntas Frequentes
        </h4>

        <div className="profile-help-faq-list">
          {faqs.map((faq, index) => (
            <div key={faq.id || index} className="profile-faq-item">
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
