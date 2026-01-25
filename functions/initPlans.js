// Este script cria os planos no Pagar.me chamando a sua Cloud Function.
// Para rodar: node scripts/initPlans.js

// Se estiver usando Node.js < 18, descomente a linha abaixo e instale: npm install node-fetch
// const fetch = require('node-fetch');

const CREATE_PLAN_URL = 'https://us-central1-oassessor-blu.cloudfunctions.net/createPagarmePlan';

const plans = [
    {
        name: "PLANO BRONZE",
        amount: 49990, // R$ 499,90
        metadata: {
            app_id: "bronze",
            subtitle: "(Inicial)",
            ideal: "Pequenas campanhas e lideranças locais.",
            team: "Até 500 Cadastros.",
            database: "Base de Eleitores Ilimitada."
        }
    },
    {
        name: "PLANO PRATA",
        amount: 79990, // R$ 799,90
        metadata: {
            app_id: "prata",
            subtitle: "(Intermediário)",
            ideal: "Campanhas que precisam de mais estrutura.",
            team: "Até 1000 Cadastros.",
            database: "Base de Eleitores Ilimitada."
        }
    },
    {
        name: "PLANO OURO",
        amount: 99990, // R$ 999,90
        metadata: {
            app_id: "ouro",
            subtitle: "(Crescimento)",
            ideal: "Campanhas em crescimento que precisam de inteligência.",
            team: "Até 1500 Cadastros.",
            database: "Base de Eleitores Ilimitada.",
            recommended: "true"
        }
    },
    {
        name: "PLANO DIAMANTE",
        amount: 129990, // R$ 1299,90
        metadata: {
            app_id: "diamante",
            subtitle: "(Expansão)",
            ideal: "Campanhas competitivas com grande volume de dados.",
            team: "Até 2000 Cadastros.",
            database: "Base de Eleitores Ilimitada."
        }
    },
    {
        name: "PLANO SEM LIMITES",
        amount: 199990, // R$ 1999,90
        metadata: {
            app_id: "livre",
            subtitle: "(Majoritária)",
            ideal: "Grandes campanhas que precisam altos números",
            team: "Cadastros Ilimitados.",
            database: "Base de Eleitores Ilimitada."
        }
    }
];

async function createPlans() {
    console.log("Iniciando criação dos planos...");
    
    for (const plan of plans) {
        console.log(`Criando ${plan.name}...`);
        try {
            const response = await fetch(CREATE_PLAN_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: plan.name,
                    description: `Assinatura mensal do ${plan.name}`,
                    amount: plan.amount,
                    interval: "month",
                    interval_count: 1,
                    metadata: plan.metadata
                })
            });
            const data = await response.json();
            if (data.success) {
                console.log(`✅ ${plan.name} criado com sucesso! ID Pagar.me: ${data.plan.id}`);
            } else {
                console.error(`❌ Erro ao criar ${plan.name}:`, data.error);
            }
        } catch (error) {
            console.error(`❌ Falha na requisição para ${plan.name}:`, error.message);
        }
    }
    console.log("Processo finalizado.");
}

createPlans();