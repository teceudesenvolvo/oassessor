import axios from 'axios';

// ATENÇÃO: Em produção, a Chave Secreta deve ficar protegida no Backend.
const API_KEY = 'sk_test_9c8d4e53ccab40089b562c837724f04e';

export const createSubscription = async (userData, cardData, planId) => {
  try {
    // 1. Mapeamento dos Planos para valores em centavos
    const plans = {
      bronze: {
        name: 'Plano Bronze',
        amount: 49999,
        id: 'bronze', // R$ 499,99
        description: 'Até 500 usuários'
      },
      prata: {
        name: 'Plano Prata',
        amount: 79999,
        id: 'prata', // R$ 799,99
        description: 'Até 1000 usuários'
      },
      ouro: {
        name: 'Plano Ouro',
        amount: 99999,
        id: 'ouro', // R$ 999,99
        description: 'Até 1500 usuários'
      },
      diamante: {
        name: 'Plano Diamante',
        amount: 129999,
        id: 'diamante', // R$ 1299,99
        description: 'Até 2000 usuários'
      },
      livre: {
        name: 'Plano Sem Limites',
        amount: 199999,
        id: 'livre', // R$ 1999,99
        description: 'Plano livre'
      }
    };

    const selectedPlan = plans[planId];

    if (!selectedPlan) throw new Error(`Plano não encontrado: ${planId}`);
    if (selectedPlan.amount === 0) throw new Error("Este plano requer contato comercial.");

    // 2. Tratamento de Dados (Telefone e Ano)
    const phoneClean = userData.phone ? userData.phone.replace(/\D/g, '') : '';
    // Fallback simples para DDD se o formato não for perfeito
    const areaCode = phoneClean.length >= 2 ? phoneClean.substring(0, 2) : '11';
    const phoneNumber = phoneClean.length > 2 ? phoneClean.substring(2) : '999999999';

    let expYear = parseInt(cardData.exp_year);
    if (expYear < 100) expYear += 2000; // Converte AA para AAAA

    // 3. Construção do Payload para API V5
    const body = {
      payment_method: 'credit_card',
      currency: 'BRL',
      interval: 'month',
      interval_count: 1,
      billing_type: 'prepaid',
      customer: {
        name: userData.name,
        email: userData.email,
        document: userData.cpf.replace(/\D/g, ''),
        type: 'individual',
        phones: {
          mobile_phone: {
            country_code: '55',
            area_code: areaCode,
            number: phoneNumber
          }
        }
      },
      card: {
        number: cardData.number.replace(/\s/g, ''),
        holder_name: cardData.holder_name,
        exp_month: parseInt(cardData.exp_month),
        exp_year: expYear,
        cvv: cardData.cvv
      },
      items: [
        {
          description: selectedPlan.name,
          quantity: 1,
          pricing_scheme: {
            scheme_type: 'unit',
            price: selectedPlan.amount
          }
        }
      ]
    };

    // 4. Chamada à API
    const response = await axios.post('https://api.pagar.me/core/v5/subscriptions', body, {
      auth: { username: API_KEY, password: '' }
    });

    return { success: true, id: response.data.id };

  } catch (error) {
    console.error("Erro Pagar.me:", error.response?.data || error.message);
    // Repassa a mensagem de erro da API se existir
    const apiError = error.response?.data?.message || "Falha ao processar pagamento.";
    throw new Error(apiError);
  }
};