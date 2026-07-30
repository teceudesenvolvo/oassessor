const { onRequest } = require("firebase-functions/v2/https");
const functionsV1 = require("firebase-functions/v1");
// const { onValueCreated } = require("firebase-functions/v2/database");
const nodemailer = require("nodemailer");
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");
// const { defineSecret } = require('firebase-functions/v2/params');
const DEFAULT_STORAGE_BUCKET = 'oassessor-blu.firebasestorage.app';
const DEFAULT_DATABASE_URL = 'https://oassessor-blu-default-rtdb.firebaseio.com';
const FIRESTORE_DATABASE_ID = '(default)';
const MIGRATABLE_COLLECTIONS = new Set([
    'users',
    'assessores',
    'eleitores',
    'tarefas',
    'notificacoes',
    'eventos',
    'demandas',
    'voluntarios'
]);

// Defina sua chave de API do Pagar.me
// const pagarmeApiKey = 'sk_6f45fa07486f49068bde5f4aef9f951e';
const pagarmeApiKey = 'sk_test_9fd7fc9c963641fba4b39c9c97b15af5';
const PAGARME_URL = 'https://api.pagar.me/core/v5';
const DATA_URI_PATTERN = /^data:([^;,]+);base64,([\s\S]+)$/;

const getPagarmeHeaders = () => {
    const auth = Buffer.from(`${pagarmeApiKey}:`).toString('base64');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
    };
};

admin.initializeApp({
    databaseURL: DEFAULT_DATABASE_URL,
    storageBucket: DEFAULT_STORAGE_BUCKET
});

const appFirestore = () => getFirestore(admin.app(), FIRESTORE_DATABASE_ID);

const findDocumentByField = async (collectionName, field, value) => {
    const snapshot = await appFirestore()
        .collection(collectionName)
        .where(field, '==', value)
        .limit(1)
        .get();
    return snapshot.empty ? null : snapshot.docs[0];
};

const findUserProfileByUid = async (uid) => {
    const directSnapshot = await appFirestore().collection('users').doc(uid).get();
    if (directSnapshot.exists) return directSnapshot.data();

    const indexedUser = await findDocumentByField('users', 'userId', uid);
    if (indexedUser) return indexedUser.data();

    const assessor = await findDocumentByField('assessores', 'userId', uid);
    return assessor?.data() || null;
};

const extensionForMimeType = (mimeType) => {
    const extensions = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
        'image/svg+xml': 'svg',
        'application/pdf': 'pdf',
        'audio/mpeg': 'mp3',
        'audio/mp4': 'm4a',
        'video/mp4': 'mp4'
    };

    return extensions[mimeType] || mimeType.split('/').pop().replace(/[^a-z0-9]/gi, '') || 'bin';
};

const safeStorageSegment = (value) =>
    String(value).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'media';

const safeFirestoreId = (value, prefix) => {
    const normalized = String(value || '').trim();
    if (!normalized) return `${prefix}_empty`;
    if (/^__.*__$/.test(normalized)) {
        return `${prefix}_${Buffer.from(normalized).toString('hex')}`;
    }
    return normalized;
};

const migrationErrorPayload = (error, stage, requestId) => {
    const rawCode = error?.code;
    const code = rawCode === 5 || rawCode === '5' ? 'FIRESTORE_NOT_FOUND' : String(rawCode || 'INTERNAL');
    const rawMessage = error?.message || 'Falha interna durante a migração.';

    if (code === 'FIRESTORE_NOT_FOUND' || /\bNOT_FOUND\b/i.test(rawMessage)) {
        return {
            status: 503,
            body: {
                error: 'O banco Firestore padrão do projeto não foi encontrado.',
                code: 'FIRESTORE_NOT_FOUND',
                stage,
                requestId,
                details: `O database ID configurado é “${FIRESTORE_DATABASE_ID}”. Confirme se ele está ativo no projeto oassessor-blu.`
            }
        };
    }

    if (/bucket.*(not found|does not exist)/i.test(rawMessage)) {
        return {
            status: 503,
            body: {
                error: 'O bucket do Firebase Storage não foi encontrado.',
                code: 'STORAGE_BUCKET_NOT_FOUND',
                stage,
                requestId,
                details: `Confirme se o bucket ${DEFAULT_STORAGE_BUCKET} está ativo no projeto oassessor-blu.`
            }
        };
    }

    return {
        status: 500,
        body: {
            error: rawMessage,
            code,
            stage,
            requestId
        }
    };
};

const moveInlineMediaToStorage = async (value, context, fieldPath = []) => {
    if (typeof value === 'string') {
        const match = value.match(DATA_URI_PATTERN);
        if (!match) return value;

        const [, mimeType, base64Data] = match;
        const extension = extensionForMimeType(mimeType);
        const fieldName = fieldPath.map(safeStorageSegment).join('__') || 'media';
        const storagePath = [
            'rtdb-migration',
            safeStorageSegment(context.collection),
            safeStorageSegment(context.documentId),
            `${fieldName}.${extension}`
        ].join('/');

        await admin.storage().bucket(DEFAULT_STORAGE_BUCKET).file(storagePath).save(
            Buffer.from(base64Data, 'base64'),
            {
                resumable: false,
                metadata: {
                    contentType: mimeType,
                    metadata: {
                        migratedFrom: `rtdb/${context.collection}/${context.documentId}`,
                        migratedAt: new Date().toISOString()
                    }
                }
            }
        );

        context.mediaCount += 1;
        return storagePath;
    }

    if (Array.isArray(value)) {
        return Promise.all(value.map((item, index) =>
            moveInlineMediaToStorage(item, context, [...fieldPath, String(index)])
        ));
    }

    if (value && typeof value === 'object') {
        const entries = await Promise.all(Object.entries(value).map(async ([key, item]) => [
            key,
            await moveInlineMediaToStorage(item, context, [...fieldPath, key])
        ]));
        return Object.fromEntries(entries);
    }

    return value;
};

exports.migrateRtdbToFirestore = onRequest(
  { cors: true, invoker: 'public', timeoutSeconds: 3600, memory: '1GiB' },
  async (req, res) => {
    const requestId = req.get('X-Request-Id') || `migration-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let stage = 'request-validation';

    if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Método não permitido.', code: 'METHOD_NOT_ALLOWED', requestId });
    }

    try {
        const authorization = req.get('Authorization') || '';
        if (!authorization.startsWith('Bearer ')) {
            return res.status(401).send({ error: 'Autenticação obrigatória.', code: 'UNAUTHENTICATED', requestId });
        }

        stage = 'authentication';
        const decodedToken = await admin.auth().verifyIdToken(authorization.slice(7));
        stage = 'authorization';
        const userProfile = await findUserProfileByUid(decodedToken.uid);
        if (!userProfile || userProfile.tipoUser !== 'admin') {
            return res.status(403).send({
                error: 'Somente administradores podem executar a migração.',
                code: 'PERMISSION_DENIED',
                requestId
            });
        }

        const requestedCollection = String(req.body?.collection || req.query?.collection || '').trim();
        if (!requestedCollection) {
            return res.status(400).send({
                error: 'Informe a collection que deve ser migrada.',
                code: 'COLLECTION_REQUIRED',
                requestId
            });
        }
        if (!MIGRATABLE_COLLECTIONS.has(requestedCollection)) {
            return res.status(400).send({
                error: `A collection “${requestedCollection}” não está liberada para migração.`,
                code: 'COLLECTION_NOT_ALLOWED',
                requestId
            });
        }

        stage = 'rtdb-read';
        const sourceSnapshot = await admin.database().ref(requestedCollection).once('value');
        if (!sourceSnapshot.exists()) {
            return res.status(404).send({
                error: `A collection “${requestedCollection}” não foi encontrada no RTDB.`,
                code: 'SOURCE_COLLECTION_NOT_FOUND',
                requestId
            });
        }
        const sourceData = { [requestedCollection]: sourceSnapshot.val() };

        stage = 'firestore-connection';
        const firestore = getFirestore(admin.app(), FIRESTORE_DATABASE_ID);
        await firestore.listCollections();

        let batch = firestore.batch();
        let pendingWrites = [];
        let documents = 0;
        let migratedDocuments = 0;
        let mediaFiles = 0;
        let collections = 0;
        const failures = [];
        const processedCollections = [];

        const commitBatch = async () => {
            if (!pendingWrites.length) return;

            try {
                await batch.commit();
                migratedDocuments += pendingWrites.length;
            } catch (batchError) {
                console.error('Falha ao gravar lote da migração. Tentando isolar documentos.', {
                    pendingWrites: pendingWrites.map(({ path }) => path),
                    error: batchError.message
                });

                for (const pendingWrite of pendingWrites) {
                    try {
                        await pendingWrite.ref.set(pendingWrite.data);
                        migratedDocuments += 1;
                    } catch (writeError) {
                        failures.push({
                            path: pendingWrite.path,
                            sourceCollection: pendingWrite.sourceCollection,
                            sourceDocumentId: pendingWrite.sourceDocumentId,
                            error: writeError.message || 'Falha ao gravar documento no Firestore.'
                        });
                        console.error('Documento ignorado durante migração RTDB -> Firestore.', {
                            path: pendingWrite.path,
                            sourceCollection: pendingWrite.sourceCollection,
                            sourceDocumentId: pendingWrite.sourceDocumentId,
                            error: writeError.message
                        });
                    }
                }
            }

            batch = firestore.batch();
            pendingWrites = [];
        };

        for (const [sourceCollectionName, collectionValue] of Object.entries(sourceData)) {
            if (collectionValue === null || typeof collectionValue !== 'object') continue;
            collections += 1;
            processedCollections.push(sourceCollectionName);
            const collectionName = safeFirestoreId(sourceCollectionName, 'rtdb_collection');

            for (const [sourceDocumentId, sourceDocument] of Object.entries(collectionValue)) {
                const documentId = safeFirestoreId(sourceDocumentId, 'rtdb_doc');
                const mediaContext = {
                    collection: sourceCollectionName,
                    documentId: sourceDocumentId,
                    mediaCount: 0
                };
                stage = `media:${sourceCollectionName}/${sourceDocumentId}`;
                const transformed = await moveInlineMediaToStorage(sourceDocument, mediaContext);
                const documentData = transformed && typeof transformed === 'object' && !Array.isArray(transformed)
                    ? transformed
                    : { value: transformed };
                const documentRef = firestore.collection(collectionName).doc(documentId);

                batch.set(documentRef, documentData);
                pendingWrites.push({
                    ref: documentRef,
                    data: documentData,
                    path: `${collectionName}/${documentId}`,
                    sourceCollection: sourceCollectionName,
                    sourceDocumentId
                });
                documents += 1;
                mediaFiles += mediaContext.mediaCount;

                if (pendingWrites.length === 400) await commitBatch();
            }
        }

        stage = 'firestore-write';
        await commitBatch();

        let auditWarning = null;
        try {
            stage = 'migration-audit';
            await firestore.collection('_system_migrations').doc(`rtdb-to-firestore-${requestedCollection}`).set({
                completedAt: admin.firestore.FieldValue.serverTimestamp(),
                executedBy: decodedToken.uid,
                requestedCollection,
                processedCollections,
                collections,
                documents,
                migratedDocuments,
                mediaFiles,
                failuresCount: failures.length,
                failures: failures.slice(0, 20)
            }, { merge: true });
        } catch (auditError) {
            auditWarning = auditError.message || 'Não foi possível salvar o registro de auditoria.';
            console.error('A migração terminou, mas o registro de auditoria falhou.', {
                requestId,
                requestedCollection,
                error: auditWarning
            });
        }

        const responsePayload = {
            success: true,
            requestId,
            requestedCollection: requestedCollection || null,
            processedCollections,
            collections,
            documents,
            migratedDocuments,
            mediaFiles,
            failuresCount: failures.length,
            failures: failures.slice(0, 20),
            auditWarning
        };

        if (documents > 0 && migratedDocuments === 0) {
            return res.status(503).send({
                ...responsePayload,
                success: false,
                error: 'Nenhum documento pôde ser gravado no Firestore.',
                code: 'FIRESTORE_WRITE_FAILED'
            });
        }

        return res.status(failures.length || auditWarning ? 207 : 200).send(responsePayload);
    } catch (error) {
        const diagnostic = migrationErrorPayload(error, stage, requestId);
        console.error('Erro ao migrar RTDB para Firestore:', {
            requestId,
            stage,
            code: error?.code,
            message: error?.message,
            stack: error?.stack
        });
        return res.status(diagnostic.status).send(diagnostic.body);
    }
  }
);

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

exports.sendPushOnFirestoreNotification = functionsV1.firestore
  .document("notificacoes/{notificationId}")
  .onCreate(async (snapshot, context) => {
    const notification = snapshot.data();
    const notificationId = context.params.notificationId;
    console.log("Nova notificação detectada:", notificationId);
    
    if (!notification) return;

    // Verifica se a notificação tem um destinatário (userId)
    const userId = notification.userId;
    if (!userId) {
        console.log("Notificação sem userId, push ignorado.");
        return;
    }

    try {
        const directUserSnapshot = await appFirestore().collection('users').doc(userId).get();
        const indexedUserSnapshot = directUserSnapshot.exists
            ? null
            : await findDocumentByField('users', 'userId', userId);
        const userSnapshot = directUserSnapshot.exists ? directUserSnapshot : indexedUserSnapshot;
        const userData = userSnapshot?.data() || null;

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
                notificationId,
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
                    await userSnapshot.ref.update({
                        pushToken: admin.firestore.FieldValue.delete()
                    });
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

        // 2. Encontra o convite em `assessores` pelo e-mail
        const invitationSnapshot = await findDocumentByField('assessores', 'email', email);

        if (!invitationSnapshot) {
            return res.status(404).send({ success: false, error: 'Convite não encontrado para este e-mail.' });
        }

        const userKey = invitationSnapshot.id;
        const assessorData = invitationSnapshot.data();

        // Verifica se o convite já foi usado
        if (assessorData.status !== 'invited') {
            return res.status(409).send({ success: false, error: 'Este convite já foi utilizado.' });
        }

        const firestore = appFirestore();
        const batch = firestore.batch();
        batch.set(invitationSnapshot.ref, {
            userId: uid,
            uid,
            status: 'Ativo'
        }, { merge: true });

        batch.set(firestore.collection('users').doc(uid), {
            ...assessorData,
            userId: uid,
            uid: uid,
            email: email,
            tipoUser: 'assessor',
            status: 'Ativo',
            name: assessorData.nome || assessorData.name || '',
            nome: assessorData.nome || assessorData.name || '',
            phone: assessorData.telefone || assessorData.phone || '',
            telefone: assessorData.telefone || assessorData.phone || '',
            updatedAt: new Date().toISOString()
        });

        if (userKey !== uid) {
            batch.delete(firestore.collection('users').doc(userKey));
        }

        await batch.commit();

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
        const userRef = appFirestore().collection('users').doc(userId);
        await userRef.set({
          subscriptionId: subscription.id,
          pagarmeCustomerId: subscription.customer.id,
          planId: planId, // Salva o ID do plano do nosso app
        }, { merge: true });

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
                pagarmeId: plan.id,
                itemId: plan.items?.[0]?.id || null,
                status: plan.status || 'active'
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

exports.updatePagarmePlan = onRequest({ cors: true, invoker: 'public' }, async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).send({ success: false, error: 'Method Not Allowed' });
    }

    const {
        planId,
        name,
        status = 'active',
        description = '',
        payment_methods = ['credit_card', 'boleto']
    } = req.body || {};

    if (!planId || !name) {
        return res.status(400).send({ success: false, error: 'planId e name são obrigatórios.' });
    }

    try {
        const response = await fetch(`${PAGARME_URL}/plans/${planId}`, {
            method: 'PUT',
            headers: getPagarmeHeaders(),
            body: JSON.stringify({
                name,
                status,
                description,
                payment_methods
            })
        });

        const payload = await response.json();
        if (!response.ok) {
            return res.status(400).send({
                success: false,
                error: payload.message || JSON.stringify(payload.errors || payload)
            });
        }

        return res.status(200).send({ success: true, plan: payload });
    } catch (error) {
        console.error('Erro ao atualizar plano no Pagar.me:', error);
        return res.status(500).send({ success: false, error: error.message || 'Falha ao atualizar plano.' });
    }
});

exports.updatePagarmePlanItem = onRequest({ cors: true, invoker: 'public' }, async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).send({ success: false, error: 'Method Not Allowed' });
    }

    const {
        planId,
        itemId,
        name,
        description = '',
        quantity = 1,
        amount,
        status = 'active'
    } = req.body || {};

    if (!planId || !itemId || !name || !amount) {
        return res.status(400).send({ success: false, error: 'planId, itemId, name e amount são obrigatórios.' });
    }

    try {
        const response = await fetch(`${PAGARME_URL}/plans/${planId}/items/${itemId}`, {
            method: 'PUT',
            headers: getPagarmeHeaders(),
            body: JSON.stringify({
                name,
                description,
                quantity,
                status,
                pricing_scheme: {
                    scheme_type: 'unit',
                    price: Number(amount)
                }
            })
        });

        const payload = await response.json();
        if (!response.ok) {
            return res.status(400).send({
                success: false,
                error: payload.message || JSON.stringify(payload.errors || payload)
            });
        }

        return res.status(200).send({ success: true, item: payload });
    } catch (error) {
        console.error('Erro ao atualizar item do plano no Pagar.me:', error);
        return res.status(500).send({ success: false, error: error.message || 'Falha ao atualizar item do plano.' });
    }
});

exports.saveUserCard = onRequest({ cors: true, invoker: 'public' }, async (req, res) => {
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
    const { userId, cardData, userEmail, userName, userPhone, userDocument } = req.body;

    try {
        // 1. Check/Create Customer
        const userRef = appFirestore().collection('users').doc(userId);
        const userSnap = await userRef.get();
        const userData = userSnap.data() || {};
        
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
            await userRef.set({ pagarmeCustomerId: customerId }, { merge: true });
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
        await userRef.set({ cards: currentCards }, { merge: true });

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
        const userSnap = await appFirestore().collection('users').doc(userId).get();
        const userData = userSnap.data();

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

exports.cancelCurrentSubscription = onRequest({ cors: true, invoker: 'public' }, async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).send({ success: false, error: 'Method Not Allowed' });
    }

    const userId = req.body?.userId;
    if (!userId) {
        return res.status(400).send({ success: false, error: 'userId é obrigatório.' });
    }

    try {
        const userRef = appFirestore().collection('users').doc(userId);
        const userSnapshot = await userRef.get();
        const userData = userSnapshot.data();

        if (!userData?.subscriptionId) {
            return res.status(404).send({ success: false, error: 'Usuário sem assinatura ativa vinculada.' });
        }

        const cancelResponse = await fetch(`${PAGARME_URL}/subscriptions/${userData.subscriptionId}`, {
            method: 'DELETE',
            headers: getPagarmeHeaders(),
            body: JSON.stringify({
                cancel_pending_invoices: true
            })
        });
        const cancelData = await cancelResponse.json();

        if (!cancelResponse.ok) {
            return res.status(400).send({
                success: false,
                error: cancelData.message || JSON.stringify(cancelData.errors || cancelData)
            });
        }

        await userRef.set({
            subscriptionStatus: cancelData.status || 'canceled'
        }, { merge: true });

        return res.status(200).send({
            success: true,
            subscription: cancelData
        });
    } catch (error) {
        console.error('Erro ao cancelar assinatura:', error);
        return res.status(500).send({ success: false, error: error.message || 'Falha ao cancelar assinatura.' });
    }
});

exports.changeSubscriptionPlan = onRequest({ cors: true, invoker: 'public' }, async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).send({ success: false, error: 'Method Not Allowed' });
    }

    const { userId, targetPlanId } = req.body || {};
    if (!userId || !targetPlanId) {
        return res.status(400).send({ success: false, error: 'userId e targetPlanId são obrigatórios.' });
    }

    try {
        const userRef = appFirestore().collection('users').doc(userId);
        const userSnapshot = await userRef.get();
        const userData = userSnapshot.data();

        if (!userData?.subscriptionId) {
            return res.status(404).send({ success: false, error: 'Usuário sem assinatura vinculada.' });
        }

        const plansResponse = await fetch(`${PAGARME_URL}/plans?status=active&count=100`, {
            headers: getPagarmeHeaders()
        });
        const plansData = await plansResponse.json();
        const pagarmePlan = (plansData.data || []).find((plan) =>
            (plan.metadata && plan.metadata.app_id === targetPlanId) || plan.id === targetPlanId
        );

        if (!pagarmePlan) {
            return res.status(404).send({ success: false, error: 'Plano de destino não encontrado no gateway.' });
        }

        const currentSubscriptionResponse = await fetch(`${PAGARME_URL}/subscriptions/${userData.subscriptionId}`, {
            headers: getPagarmeHeaders()
        });
        const currentSubscription = await currentSubscriptionResponse.json();

        if (!currentSubscriptionResponse.ok) {
            return res.status(400).send({
                success: false,
                error: currentSubscription.message || JSON.stringify(currentSubscription.errors || currentSubscription)
            });
        }

        const cardId =
            currentSubscription?.card?.id ||
            currentSubscription?.card_id ||
            currentSubscription?.current_transaction?.card?.id ||
            userData?.cards?.[0]?.id ||
            null;

        const paymentMethod = currentSubscription?.payment_method || 'credit_card';
        const createPayload = {
            plan_id: pagarmePlan.id,
            customer_id: userData.pagarmeCustomerId || currentSubscription?.customer?.id,
            payment_method: paymentMethod
        };

        if (!createPayload.customer_id) {
            return res.status(400).send({ success: false, error: 'Cliente do gateway não encontrado para esta conta.' });
        }

        if (paymentMethod === 'credit_card') {
            if (!cardId) {
                return res.status(400).send({ success: false, error: 'Nenhum cartão salvo foi encontrado para realizar a troca de plano.' });
            }
            createPayload.card_id = cardId;
        }

        const createResponse = await fetch(`${PAGARME_URL}/subscriptions`, {
            method: 'POST',
            headers: getPagarmeHeaders(),
            body: JSON.stringify(createPayload)
        });
        const newSubscription = await createResponse.json();

        if (!createResponse.ok) {
            return res.status(400).send({
                success: false,
                error: newSubscription.message || JSON.stringify(newSubscription.errors || newSubscription)
            });
        }

        const cancelOldResponse = await fetch(`${PAGARME_URL}/subscriptions/${userData.subscriptionId}`, {
            method: 'DELETE',
            headers: getPagarmeHeaders(),
            body: JSON.stringify({
                cancel_pending_invoices: true
            })
        });
        const cancelOldData = await cancelOldResponse.json();

        if (!cancelOldResponse.ok) {
            return res.status(400).send({
                success: false,
                error: cancelOldData.message || JSON.stringify(cancelOldData.errors || cancelOldData)
            });
        }

        await userRef.set({
            subscriptionId: newSubscription.id,
            subscriptionStatus: newSubscription.status || 'active',
            planId: targetPlanId,
            nomePlano: pagarmePlan.name,
            limiteEleitores: pagarmePlan.metadata?.team || userData.limiteEleitores || ''
        }, { merge: true });

        return res.status(200).send({
            success: true,
            subscription: newSubscription
        });
    } catch (error) {
        console.error('Erro ao trocar plano da assinatura:', error);
        return res.status(500).send({ success: false, error: error.message || 'Falha ao trocar plano.' });
    }
});

exports.getPollingPlace = onRequest({ cors: true, invoker: 'public' }, async (req, res) => {
    const { zone, section, uf } = req.query;

    if (!zone || !section) {
        return res.status(400).send({ error: "Zona e Seção são obrigatórios." });
    }

    try {
        // Estrutura migrada: collection locais_votacao, documento por UF,
        // contendo os mapas de zona e seção.
        let localData = null;
        if (uf) {
            const snapshot = await appFirestore()
                .collection('locais_votacao')
                .doc(uf.toUpperCase())
                .get();
            localData = snapshot.data()?.[zone]?.[section] || null;
        } else {
            const snapshot = await appFirestore().collection('locais_votacao').get();
            for (const stateDocument of snapshot.docs) {
                const candidate = stateDocument.data()?.[zone]?.[section];
                if (candidate) {
                    localData = candidate;
                    break;
                }
            }
        }
        
        res.status(200).send({ success: true, local: localData || null });

    } catch (error) {
        console.error("Erro ao buscar local de votação:", error);
        res.status(500).send({ error: "Falha ao buscar local de votação." });
    }
});
