import React, { useEffect, useState } from 'react';
import { Shield, FileText, Download, Barcode, CreditCard } from 'lucide-react';

const GET_SUBSCRIPTION_URL = 'https://us-central1-oassessor-blu.cloudfunctions.net/getSubscriptionDetails';

export default function ProfileSubscription({ profileData, user }) {
  const [subscription, setSubscription] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const planName = profileData?.planId ? profileData.planId.charAt(0).toUpperCase() + profileData.planId.slice(1) : 'Gratuito';

  useEffect(() => {
    if (!user) return;

    const fetchSubscription = async () => {
        try {
            const response = await fetch(`${GET_SUBSCRIPTION_URL}?userId=${user.uid}`);
            const data = await response.json();
            
            if (data.subscription) {
                setSubscription(data.subscription);
                setInvoices(data.invoices || []);
            }
        } catch (error) {
            console.error("Erro ao carregar assinatura:", error);
        } finally {
            setLoading(false);
        }
    };

    fetchSubscription();
  }, [user]);

  if (loading) return <div style={{ textAlign: 'center', padding: '20px' }}>Carregando assinatura...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      {/* Detalhes do Plano */}
      <div style={{ 
        backgroundColor: '#f8fafc', 
        padding: '20px', 
        borderRadius: '12px', 
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ 
            width: '50px', height: '50px', 
            backgroundColor: '#dbeafe', 
            borderRadius: '10px', 
            display: 'flex', alignItems: 'center', justifyContent: 'center' 
          }}>
            <Shield size={24} color="#2563eb" />
          </div>
          <div>
            <h4 style={{ margin: '0 0 5px 0', color: '#0f172a' }}>Plano {planName}</h4>
            <span style={{ 
              fontSize: '0.8rem', 
              backgroundColor: subscription?.status === 'paid' ? '#dcfce7' : '#fee2e2', 
              color: subscription?.status === 'paid' ? '#166534' : '#991b1b', 
              padding: '2px 8px', 
              borderRadius: '12px',
              fontWeight: '600'
            }}>
              {subscription?.status === 'paid' ? 'Ativo' : (subscription?.status || 'Inativo')}
            </span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: '0 0 5px 0', fontSize: '0.9rem', color: '#64748b' }}>Próxima cobrança</p>
          <strong style={{ color: '#0f172a' }}>
            {subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString('pt-BR') : '-'}
          </strong>
        </div>
      </div>

      {/* Faturas */}
      <div>
        <h4 style={{ margin: '0 0 15px 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FileText size={20} /> Histórico de Faturas
        </h4>
        
        {invoices.length === 0 && (
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Nenhuma fatura encontrada.</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {invoices.map(invoice => (
            <div key={invoice.id} style={{ 
              padding: '15px', 
              border: '1px solid #e2e8f0', 
              borderRadius: '8px', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              backgroundColor: 'white'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontWeight: '600', color: '#334155' }}>{invoice.date}</span>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{invoice.amount}</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span style={{ 
                  fontSize: '0.8rem', 
                  fontWeight: '600',
                  color: invoice.status === 'paid' ? '#16a34a' : '#ca8a04'
                }}>
                  {invoice.status === 'paid' ? 'Pago' : 'Pendente'}
                </span>
                
                {invoice.status === 'pending' ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="btn-primary" 
                      style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: '#0f172a' }}
                      onClick={() => alert('Pagando com cartão...')}
                    >
                      <CreditCard size={16} /> Pagar com Cartão
                    </button>
                    <button 
                      className="btn-primary" 
                      style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                      onClick={() => alert('Gerando boleto...')}
                    >
                      <Barcode size={16} /> Boleto
                    </button>
                  </div>
                ) : (invoice.boleto_url && (
                    <a href={invoice.boleto_url} target="_blank" rel="noopener noreferrer" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }} title="Baixar Boleto/Recibo">
                        <Download size={18} />
                    </a>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}