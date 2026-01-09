// import axios from 'axios';

// const API_KEY = 'SUA_API_KEY_PAGARME'; // Use chaves públicas para tokenização no front

export const createSubscription = async (userData, cardData, planId) => {
  try {
    // Simulação de chamada à API
    console.log("Processando pagamento no Pagar.me...", { planId, cardData });
    return { success: true, id: 'sub_123456' };
  } catch (error) {
    console.error("Erro no pagamento", error);
    throw error;
  }
};