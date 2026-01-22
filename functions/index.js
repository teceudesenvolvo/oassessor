const { onRequest } = require("firebase-functions/v2/https");
const functions = require("firebase-functions/v1");
// const { onValueCreated } = require("firebase-functions/v2/database");
const nodemailer = require("nodemailer");
const admin = require("firebase-admin");

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

    const { email, nome } = req.body;

    if (!email || !nome) {
      return res.status(400).send("Faltando email ou nome");
    }

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
          <a href="https://oassessor.vercel.app/cadastro-assessor-equipe?email=${email}" style="background-color: #6EE794; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Aceitar Convite</a>
          <p style="margin-top: 20px; font-size: 12px; color: #999;">Se você não esperava este convite, por favor ignore este email.</p>
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

exports.sendPushOnNotification = functions.database.ref("/notificacoes/{notificationId}").onCreate(async (snapshot, context) => {
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