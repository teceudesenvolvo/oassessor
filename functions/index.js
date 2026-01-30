const { onRequest } = require("firebase-functions/v2/https");
// const { onValueCreated } = require("firebase-functions/v2/database");
const nodemailer = require("nodemailer");
const admin = require("firebase-admin");
// const { defineSecret } = require('firebase-functions/v2/params');

// Defina sua chave de API do Pagar.me
// const pagarmeApiKey = 'sk_6f45fa07486f49068bde5f4aef9f951e';
const pagarmeApiKey = 'sk_test_9fd7fc9c963641fba4b39c9c97b15af5';
const PAGARME_URL = 'https://api.pagar.me/core/v5';

const getPagarmeHeaders = () => {
    const auth = Buffer.from(`${pagarmeApiKey}:`).toString('base64');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
    };
};

admin.initializeApp();

// Configure o transportador do Nodemailer (ex: Gmail)
// IMPORTANTE: Para Gmail, use uma "Senha de App" (App Password) gerada na conta Google.
// Não use sua senha de login normal se tiver 2FA ativado.
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "blutecnologiasbr@gmail.com", // << SUBSTITUA PELO SEU EMAIL
    pass: "wvge jprj encr zkhd",    // << SUBSTITUA PELA SENHA DE APP GERADA
  },
});

exports.sendInviteEmail = onRequest({ cors: true, invoker: 'public' }, async (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    const { email, nome, inviteLink } = req.body;

    if (!email || !nome) {
      return res.status(400).send("Faltando email ou nome");
    }

    const linkToUse = inviteLink || `https://oassessor.vercel.app/cadastro-assessor-equipe?email=${email}`;

    const mailOptions = {
      from: `"O Assessor" <blutecnologiasbr@gmail.com>`, // << USE O MESMO EMAIL AQUI
      to: email,
      subject: "Convite para entrar na Equipe - App O Assessor",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #6EE794;">Bem-vindo ao O Assessor!</h2>
          <p>Olá <strong>${nome}</strong>,</p>
          <p>Você foi convidado para fazer parte da nossa equipe.</p>
          <p>Para concluir seu cadastro e acessar o aplicativo, clique no botão abaixo:</p>
          <a href="${linkToUse}" style="background-color: #6EE794; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Aceitar Convite</a>
          <p style="margin-top: 20px; font-size: 12px; color: #999;">Ou copie e cole: ${linkToUse}</p>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      res.status(200).send({ success: true });
    } catch (error) {
      console.error("Erro ao enviar email:", error);
      res.status(500).send({ error: error.toString() });
    }
});

exports.sendPushOnNotification = require("firebase-functions/v1").database.ref("/notificacoes/{notificationId}").onCreate(async (snapshot, context) => {
    const notification = snapshot.val();
    console.log("Nova notificação detectada:", context.params.notificationId);
    
    if (!notification) return;

    // Verifica se a notificação tem um destinatário (userId)
    const userId = notification.userId;
    if (!userId) {
        console.log("Notificação sem userId, push ignorado.");
        return;
    }

    try {
        // Busca o token de push do usuário no banco de dados
        const userSnapshot = await admin.database().ref(`/users/${userId}`).once('value');
        const userData = userSnapshot.val();

        if (!userData || !userData.pushToken) {
            console.log(`FALHA: Usuário ${userId} encontrado? ${!!userData}. Token existe? ${!!userData?.pushToken}`);
            return;
        }
        console.log(`Enviando push para ${userId} (Token: ${userData.pushToken})`);

        // Monta a mensagem para a API da Expo
        const message = {
            to: userData.pushToken,
            sound: 'default',
            title: notification.title || 'Nova Notificação',
            body: notification.description || 'Você tem uma nova mensagem no app.',
            priority: 'high',
            channelId: 'default',
            contentAvailable: true,
            mutableContent: true,
            data: { 
                notificationId: context.params.notificationId,
                type: notification.type 
            },
        };

        // Envia para a Expo Push API
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify([message]),
        });

        const responseBody = await response.json();

        if (!response.ok) {
            console.error(`Erro na API da Expo (${response.status}):`, JSON.stringify(responseBody));
            return;
        }
        
        console.log("Resposta da Expo:", JSON.stringify(responseBody));

        // Verificação detalhada do ticket de notificação
        const ticket = responseBody.data[0];
        if (ticket.status === 'error') {
            console.error(`Erro no ticket de push: ${ticket.message}`);
            if (ticket.details && ticket.details.error) {
                console.error(`Detalhe do erro: ${ticket.details.error}`);
                // Se o erro for DeviceNotRegistered, podemos remover o token do banco
                if (ticket.details.error === 'DeviceNotRegistered') {
                    await admin.database().ref(`/users/${userId}/pushToken`).remove();
                    console.log(`Token inválido removido para o usuário ${userId}`);
                }
            }
        } else {
            console.log(`Push enviado com sucesso, ticket ID: ${ticket.id}`);
        }
    } catch (error) {
        console.error("Erro ao enviar push notification:", error);
        // Diagnóstico específico para Plano Spark vs Blaze
        if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN' || error.message.includes('network')) {
            console.error("ALERTA CRÍTICO: Erro de rede detectado. Se você estiver no plano 'Spark' (gratuito) do Firebase, chamadas para APIs externas (como a da Expo) são BLOQUEADAS. Faça upgrade para o plano 'Blaze' (Pay as you go).");
        }
    }
});

exports.generateWebAuthToken = onRequest({ cors: true, invoker: 'public' }, async (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).send("Missing idToken");
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const customToken = await admin.auth().createCustomToken(decodedToken.uid);
      res.status(200).json({ token: customToken });
    } catch (error) {
      console.error("Erro ao gerar token:", error);
      res.status(500).send({ error: error.toString() });
    }
});

exports.deleteUser = onRequest({ cors: true, invoker: 'public' }, async (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    const { email } = req.body;

    if (!email) {
      return res.status(400).send("Missing email");
    }

    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      await admin.auth().deleteUser(userRecord.uid);
      res.status(200).send({ success: true });
    } catch (error) {
      // Se o usuário não existir no Auth (ex: apenas convidado), não é um erro crítico
      console.log("Info exclusão:", error.code === 'auth/user-not-found' ? 'Usuário não encontrado no Auth' : error);
      res.status(200).send({ success: true, message: "Processado" });
    }
});

exports.completeTeamMemberRegistration = onRequest({ cors: true, invoker: 'public' }, async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    const { idToken } = req.body;
    if (!idToken) {
        return res.status(400).send({ success: false, error: 'Auth token é obrigatório.' });
    }

    try {
        // 1. Verifica o token de autenticação do usuário
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const { uid, email } = decodedToken;

        // 2. Encontra o convite em `/assessores` pelo e-mail
        const assessorsRef = admin.database().ref('assessores');
        const snapshot = await assessorsRef.orderByChild('email').equalTo(email).once('value');

        if (!snapshot.exists()) {
            return res.status(404).send({ success: false, error: 'Convite não encontrado para este e-mail.' });
        }

        const data = snapshot.val();
        const userKey = Object.keys(data)[0]; // A chave temporária do convite
        const assessorData = data[userKey];

        // Verifica se o convite já foi usado
        if (assessorData.status !== 'invited') {
            return res.status(409).send({ success: false, error: 'Este convite já foi utilizado.' });
        }

        // 3. Prepara a atualização atômica do banco de dados
        const updates = {};

        // 3.1 Atualiza o registro em /assessores
        updates[`/assessores/${userKey}/userId`] = uid;
        updates[`/assessores/${userKey}/uid`] = uid;
        updates[`/assessores/${userKey}/status`] = 'Ativo';

        // 3.2 Cria o registro final em /users com o UID real da autenticação
        updates[`/users/${uid}`] = {
            ...assessorData,
            userId: uid,
            uid: uid,
            tipoUser: 'assessor',
            status: 'Ativo',
        };

        // 3.3 Deleta o registro temporário de /users que foi criado no convite
        updates[`/users/${userKey}`] = null;

        // 4. Executa a atualização atômica
        await admin.database().ref().update(updates);

        return res.status(200).send({ success: true, message: 'Cadastro do usuário finalizado com sucesso.' });

    } catch (error) {
        console.error('Erro ao finalizar cadastro:', error);
        return res.status(500).send({ success: false, error: 'Ocorreu um erro interno.' });
    }
});

exports.createSubscription = onRequest(
  { cors: true, invoker: 'public' },
  async (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    const { planId, card, customer, payment_method, userId } = req.body;

    if (!planId || !customer || !payment_method || !userId) {
      return res.status(400).send("Dados da transação incompletos.");
    }

    if (payment_method === 'credit_card' && !card) {
      return res.status(400).send("Dados do cartão são obrigatórios.");
    }

    try {
      // Busca todos os planos ativos e filtra em memória para garantir que pegamos o correto.
      // A filtragem via query param por metadados pode falhar dependendo da API.
      const plansResponse = await fetch(`${PAGARME_URL}/plans?status=active&count=100`, {
          headers: getPagarmeHeaders()
      });
      const plansData = await plansResponse.json();
      
      const pagarmePlan = plansData.data 
        ? plansData.data.find(p => (p.metadata && p.metadata.app_id === planId) || p.id === planId) 
        : null;

      if (!pagarmePlan) {
        return res.status(400).send({ success: false, error: `Plano '${planId}' não encontrado ou inativo no Pagar.me.` });
      }

      const subscriptionPayload = {
        plan_id: pagarmePlan.id,
        customer: {
          name: customer.name,
          email: customer.email,
          code: userId, // V5 usa 'code'
          document: customer.cpf.replace(/\D/g, ''), // V5 usa 'document'
          type: 'individual',
          phones: {
            mobile_phone: {
              country_code: '55',
              area_code: customer.phone.replace(/\D/g, '').substring(0, 2),
              number: customer.phone.replace(/\D/g, '').substring(2)
            }
          },
          address: {
            country: 'BR',
            state: customer.address.state,
            city: customer.address.city,
            zip_code: customer.address.zipcode.replace(/\D/g, ''),
            line_1: `${customer.address.street}, ${customer.address.street_number}, ${customer.address.neighborhood}`,
            line_2: '' // Complemento se houver
          }
        },
        payment_method: payment_method,
        async: false
      };

      if (payment_method === 'credit_card') {
        subscriptionPayload.card = card;
      }

      // Log para debug no console do Firebase
      console.log("Enviando payload para Pagar.me:", JSON.stringify(subscriptionPayload, null, 2));

      const subResponse = await fetch(`${PAGARME_URL}/subscriptions`, {
          method: 'POST',
          headers: getPagarmeHeaders(),
          body: JSON.stringify(subscriptionPayload)
      });
      const subscription = await subResponse.json();
      
      if (subResponse.ok && (subscription.status === 'active' || subscription.status === 'paid' || subscription.status === 'pending_payment')) {
        // Salva o ID da assinatura e do cliente no perfil do usuário no Firebase
        const userRef = admin.database().ref(`users/${userId}`);
        await userRef.update({
          subscriptionId: subscription.id,
          pagarmeCustomerId: subscription.customer.id,
          planId: planId, // Salva o ID do plano do nosso app
        });

        res.status(200).send({ success: true, subscriptionId: subscription.id, status: subscription.status });
      } else {
        console.error("Erro Pagar.me:", JSON.stringify(subscription, null, 2));
        
        let errorMsg = subscription.message || (subscription.errors ? JSON.stringify(subscription.errors) : null);
        
        if (!errorMsg && subscription.status === 'failed') {
            errorMsg = "Pagamento recusado ou dados inválidos (Verifique CPF e Cartão).";
        }
        
        if (!errorMsg) {
             errorMsg = "Erro desconhecido na operadora.";
        }

        res.status(400).send({ success: false, message: `Assinatura não pôde ser criada: ${errorMsg}` });
      }
    } catch (error) {
      console.error("Erro na transação Pagar.me:", error);
      const errorMessage = error.message || "Falha ao processar pagamento.";
      res.status(500).send({ success: false, error: errorMessage });
    }
  }
);

exports.createPagarmePlan = onRequest({ cors: true, invoker: 'public' }, async (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    // Based on Pagar.me v5 API for creating plans
    const { name, description, amount, interval, interval_count, metadata } = req.body;

    if (!name || !amount || !interval || !interval_count) {
        return res.status(400).send({ success: false, error: "Dados do plano incompletos. 'name', 'amount', 'interval', 'interval_count' são obrigatórios." });
    }

    try {
        const planPayload = {
            name: name,
            description: description,
            payment_methods: ["credit_card", "boleto"],
            interval: interval, // e.g., "month"
            interval_count: interval_count, // e.g., 1
            billing_type: "prepaid",
            items: [
                {
                    name: name,
                    quantity: 1,
                    pricing_scheme: {
                        scheme_type: "unit",
                        price: amount // amount in cents
                    }
                }
            ],
            metadata: metadata || {}
        };

        const response = await fetch(`${PAGARME_URL}/plans`, {
            method: 'POST',
            headers: getPagarmeHeaders(),
            body: JSON.stringify(planPayload)
        });
        const plan = await response.json();

        if (!response.ok) {
             throw { response: { data: plan } };
        }

        res.status(200).send({ success: true, plan: plan });

    } catch (error) {
        console.error("Erro ao criar plano no Pagar.me:", error.response ? error.response.data : error);
        const errorMessage = error.response && error.response.data && error.response.data.errors
            ? JSON.stringify(error.response.data.errors)
            : "Falha ao criar plano.";
        res.status(500).send({ success: false, error: errorMessage });
    }
});

exports.getAppPlans = onRequest({ cors: true, invoker: 'public' }, async (req, res) => {
    try {
        const response = await fetch(`${PAGARME_URL}/plans?status=active`, {
            method: 'GET',
            headers: getPagarmeHeaders()
        });
        const responseData = await response.json();
        const pagarmePlans = responseData.data || [];

        // Format plans to match the structure expected by the frontend
        const appPlans = pagarmePlans.map(plan => {
            const metadata = plan.metadata || {};
            const price = plan.items[0]?.pricing_scheme?.price || 0;

            return {
                id: metadata.app_id || plan.id, // Use a custom ID from metadata if available
                title: plan.name,
                subtitle: metadata.subtitle || '',
                ideal: metadata.ideal || '',
                team: metadata.team || '',
                database: metadata.database || '',
                recommended: metadata.recommended === 'true',
                price: (price / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                amount: price,
                pagarmeId: plan.id // Keep the original Pagar.me ID
            };
        });

        // Sort plans by amount
        appPlans.sort((a, b) => b.amount - a.amount);

        res.status(200).send({ success: true, plans: appPlans });

    } catch (error) {
        console.error("Erro ao buscar planos do Pagar.me:", error);
        res.status(500).send({ success: false, error: "Falha ao buscar planos." });
    }
});

exports.saveUserCard = onRequest({ cors: true, invoker: 'public' }, async (req, res) => {
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
    const { userId, cardData, userEmail, userName, userPhone, userDocument } = req.body;

    try {
        // 1. Check/Create Customer
        const userRef = admin.database().ref(`users/${userId}`);
        const userSnap = await userRef.once('value');
        const userData = userSnap.val() || {};
        
        let customerId = userData.pagarmeCustomerId;

        if (!customerId) {
            const custResponse = await fetch(`${PAGARME_URL}/customers`, {
                method: 'POST',
                headers: getPagarmeHeaders(),
                body: JSON.stringify({
                    code: userId, // external_id in V5 is 'code'
                    name: userName,
                    email: userEmail,
                    type: 'individual',
                    document: userDocument.replace(/\D/g, ''),
                    phones: {
                        mobile_phone: {
                            country_code: '55',
                            area_code: userPhone.replace(/\D/g, '').substring(0, 2),
                            number: userPhone.replace(/\D/g, '').substring(2)
                        }
                    }
                })
            });
            const customer = await custResponse.json();
            if (!custResponse.ok) throw new Error(JSON.stringify(customer));
            customerId = customer.id;
            await userRef.update({ pagarmeCustomerId: customerId });
        }

        // 2. Create Card
        const cardResponse = await fetch(`${PAGARME_URL}/customers/${customerId}/cards`, {
            method: 'POST',
            headers: getPagarmeHeaders(),
            body: JSON.stringify(cardData)
        });
        const card = await cardResponse.json();
        if (!cardResponse.ok) throw new Error(JSON.stringify(card));

        // 3. Save Card to Firebase (Masked)
        const newCard = {
            id: card.id,
            last4: card.last_four_digits,
            brand: card.brand,
            holder_name: card.holder_name,
            exp: `${card.expiration_date.slice(0,2)}/${card.expiration_date.slice(2)}`
        };

        const currentCards = userData.cards || [];
        currentCards.push(newCard);
        await userRef.update({ cards: currentCards });

        res.status(200).send({ success: true, card: newCard });

    } catch (error) {
        console.error("Erro ao salvar cartão:", error);
        res.status(500).send({ error: error.message });
    }
});

exports.getSubscriptionDetails = onRequest({ cors: true, invoker: 'public' }, async (req, res) => {
    const userId = req.query.userId || req.body.userId;
    if (!userId) return res.status(400).send("Missing userId");

    try {
        const userSnap = await admin.database().ref(`users/${userId}`).once('value');
        const userData = userSnap.val();

        if (!userData || !userData.subscriptionId) {
            return res.status(200).send({ subscription: null, invoices: [] });
        }

        const subResponse = await fetch(`${PAGARME_URL}/subscriptions/${userData.subscriptionId}`, {
            headers: getPagarmeHeaders()
        });
        const subscription = await subResponse.json();
        
        const invoicesResponse = await fetch(`${PAGARME_URL}/invoices?subscription_id=${userData.subscriptionId}&count=10`, {
            headers: getPagarmeHeaders()
        });
        const invoicesData = await invoicesResponse.json();
        const invoicesList = invoicesData.data || [];

        const invoices = invoicesList.map(t => ({
            id: t.id,
            date: new Date(t.created_at).toLocaleDateString('pt-BR'),
            amount: (t.amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
            status: t.status,
            boleto_url: t.charge?.last_transaction?.url // V5 structure
        }));

        res.status(200).send({ subscription, invoices });

    } catch (error) {
        console.error("Erro ao buscar assinatura:", error);
        res.status(500).send({ error: error.message });
    }
});

exports.getPollingPlace = onRequest({ cors: true, invoker: 'public' }, async (req, res) => {
    const { zone, section, uf } = req.query;

    if (!zone || !section) {
        return res.status(400).send({ error: "Zona e Seção são obrigatórios." });
    }

    try {
        // Como não há API pública nacional, consultamos nossa base interna importada do TSE.
        // Estrutura esperada: locais_votacao/{UF}/{ZONA}/{SECAO}
        let dbPath = 'locais_votacao';
        
        if (uf) {
            dbPath += `/${uf.toUpperCase()}`;
        }
        
        dbPath += `/${zone}/${section}`;
        
        const snapshot = await admin.database().ref(dbPath).once('value');
        const localData = snapshot.val();
        
        res.status(200).send({ success: true, local: localData || null });

    } catch (error) {
        console.error("Erro ao buscar local de votação:", error);
        res.status(500).send({ error: "Falha ao buscar local de votação." });
    }
});