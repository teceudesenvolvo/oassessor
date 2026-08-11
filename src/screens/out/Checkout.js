import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  CheckCircle2,
  CreditCard,
  Database,
  Eye,
  EyeOff,
  Lock,
  MapPin,
  User
} from 'lucide-react';
import { auth, database } from '../../firebaseConfig';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { ref, set, push, update, get, remove } from '../../services/firestoreDatabase';
import PublicPageShell from '../../components/PublicPageShell';
import { fetchManagedPlans } from '../../services/appPlansService';

const CREATE_SUBSCRIPTION_URL = 'https://us-central1-oassessor-blu.cloudfunctions.net/createSubscription';

const PLAN_LIMIT_LABELS = [
  { key: 'leaderships', label: 'Lideranças' },
  { key: 'volunteers', label: 'Voluntários' },
  { key: 'visits', label: 'Visitas' },
  { key: 'demands', label: 'Demandas' },
  { key: 'events', label: 'Eventos' },
  { key: 'communication', label: 'Comunicação' },
  { key: 'territory', label: 'Território' },
  { key: 'research', label: 'Pesquisas' },
  { key: 'team', label: 'Minha equipe' },
  { key: 'agenda', label: 'Agenda' }
];

const INCLUDED_CORE_FEATURES = [
  'Dashboard estratégico',
  'Cadastro e gestão de eleitores',
  'Funil eleitoral',
  'Caminho para a vitória',
  'Relatórios gerenciais',
  'Perfis de acesso e segurança'
];

const formatPlanLimit = (value) => {
  if (value === '' || value === null || value === undefined) return 'Conforme o plano';
  const normalized = String(value).trim().toLowerCase();
  if (['-1', 'ilimitado', 'ilimitada', 'sem limite'].includes(normalized)) return 'Ilimitado';
  const numericValue = Number(value);
  if (Number.isFinite(numericValue)) return numericValue > 0 ? `Até ${numericValue.toLocaleString('pt-BR')}` : 'Não incluído';
  return String(value);
};

export default function Checkout() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [plan, setPlan] = useState(location.state?.plan || { id: planId, title: planId, amount: null, price: 'Carregando...' });
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [tempId, setTempId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    cpf: '',
    phone: '',
    street: '',
    neighborhood: '',
    number: '',
    city: '',
    state: '',
    zip: '',
    cardNumber: '',
    cardName: '',
    cardExpiry: '',
    cardCvc: '',
    paymentMethod: 'credit_card'
  });

  const isFreePlan = Boolean(plan.isFree || (plan.amount !== null && Number(plan.amount) === 0));

  useEffect(() => {
    if (location.state?.plan) return;

    let active = true;
    fetchManagedPlans({ includeHidden: false })
      .then((managedPlans) => {
        const selectedPlan = managedPlans.find((item) => item.id === planId);
        if (active && selectedPlan) setPlan(selectedPlan);
      })
      .catch((error) => console.error('Erro ao carregar o resumo do plano:', error));

    return () => {
      active = false;
    };
  }, [location.state, planId]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleMaskedChange = (event) => {
    const { name, value } = event.target;
    let nextValue = value;

    if (name === 'cpf') {
      nextValue = nextValue.replace(/\D/g, '').slice(0, 11)
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2');
    } else if (name === 'phone') {
      nextValue = nextValue.replace(/\D/g, '').slice(0, 11);
      nextValue = nextValue.replace(/^(\d{2})(\d)/g, '($1) $2');
      nextValue = nextValue.replace(/(\d)(\d{4})$/, '$1-$2');
    } else if (name === 'zip') {
      nextValue = nextValue.replace(/\D/g, '').slice(0, 8);
      nextValue = nextValue.replace(/^(\d{5})(\d)/, '$1-$2');
    } else if (name === 'cardNumber') {
      nextValue = nextValue.replace(/\D/g, '').slice(0, 16);
      nextValue = nextValue.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
    } else if (name === 'cardExpiry') {
      nextValue = nextValue.replace(/\D/g, '').slice(0, 4);
      if (nextValue.length > 2) {
        nextValue = `${nextValue.slice(0, 2)}/${nextValue.slice(2)}`;
      }
    } else if (name === 'cardCvc') {
      nextValue = nextValue.replace(/\D/g, '').slice(0, 4);
    } else if (name === 'cardName') {
      nextValue = nextValue.toUpperCase();
    }

    setFormData((prev) => ({ ...prev, [name]: nextValue }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const checkCep = async (event) => {
    const cep = event.target.value.replace(/\D/g, '');
    if (cep.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setFormData((prev) => ({
            ...prev,
            street: data.logradouro,
            neighborhood: data.bairro,
            city: data.localidade,
            state: data.uf
          }));
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
      }
    }
  };

  const isValidCPF = (cpf) => {
    if (!cpf) return false;
    const cleanCPF = cpf.replace(/[^\d]+/g, '');
    if (cleanCPF.length !== 11) return false;
    if (/^(\d)\1+$/.test(cleanCPF)) return false;

    let sum = 0;
    let remainder;

    for (let i = 1; i <= 9; i += 1) {
      sum += parseInt(cleanCPF.substring(i - 1, i), 10) * (11 - i);
    }

    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCPF.substring(9, 10), 10)) return false;

    sum = 0;
    for (let i = 1; i <= 10; i += 1) {
      sum += parseInt(cleanCPF.substring(i - 1, i), 10) * (12 - i);
    }

    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    return remainder === parseInt(cleanCPF.substring(10, 11), 10);
  };

  const validateCurrentStep = () => {
    const newErrors = {};

    if (step === 1) {
      if (!formData.name) newErrors.name = 'Nome completo é obrigatório.';
      if (!formData.email) newErrors.email = 'E-mail é obrigatório.';
      if (!formData.phone) newErrors.phone = 'Telefone é obrigatório.';
      if (!formData.cpf) {
        newErrors.cpf = 'CPF é obrigatório.';
      } else if (!isValidCPF(formData.cpf)) {
        newErrors.cpf = 'CPF inválido.';
      }
      if (!formData.password) {
        newErrors.password = 'Senha é obrigatória.';
      } else if (formData.password.length < 6) {
        newErrors.password = 'A senha deve ter pelo menos 6 caracteres.';
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'As senhas não coincidem.';
      }
    }

    if (step === 2) {
      if (!formData.zip) newErrors.zip = 'CEP é obrigatório.';
      if (!formData.city) newErrors.city = 'Cidade é obrigatória.';
      if (!formData.street) newErrors.street = 'Rua é obrigatória.';
      if (!formData.neighborhood) newErrors.neighborhood = 'Bairro é obrigatório.';
      if (!formData.number) newErrors.number = 'Número é obrigatório.';
      if (!formData.state) newErrors.state = 'Estado é obrigatório.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const persistPartialProgress = async () => {
    try {
      const dataToSave = { ...formData };
      delete dataToSave.password;
      delete dataToSave.confirmPassword;
      delete dataToSave.cardNumber;
      delete dataToSave.cardCvc;
      delete dataToSave.cardExpiry;

      let currentId = tempId;
      if (!currentId) {
        const newRef = push(ref(database, 'registros_temporarios'));
        currentId = newRef.key;
        setTempId(currentId);
      }

      await update(ref(database, `registros_temporarios/${currentId}`), {
        ...dataToSave,
        etapa: String(step),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erro ao salvar progresso:', error);
    }
  };

  const handleNext = async (event) => {
    event.preventDefault();
    if (!validateCurrentStep()) return;
    await persistPartialProgress();
    setStep((prev) => prev + 1);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    const newErrors = {};
    if (!isFreePlan && formData.paymentMethod === 'credit_card') {
      if (!formData.cardNumber) newErrors.cardNumber = 'Número do cartão é obrigatório.';
      if (!formData.cardName) newErrors.cardName = 'Nome no cartão é obrigatório.';
      if (!formData.cardExpiry) newErrors.cardExpiry = 'Validade é obrigatória.';
      if (!formData.cardCvc) newErrors.cardCvc = 'CVC é obrigatório.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLoading(false);
      return;
    }

    try {
      if (tempId) {
        await update(ref(database, `registros_temporarios/${tempId}`), { etapa: '3' });
      }

      let cardData = null;
      if (!isFreePlan && formData.paymentMethod === 'credit_card') {
        const cleanExpiry = formData.cardExpiry.replace(/\D/g, '');
        cardData = {
          number: formData.cardNumber.replace(/\D/g, ''),
          holder_name: formData.cardName,
          exp_month: parseInt(cleanExpiry.substring(0, 2), 10),
          exp_year: parseInt(cleanExpiry.substring(2), 10) + 2000,
          cvv: formData.cardCvc
        };
      }

      const transactionUserId = tempId || `temp_${Date.now()}`;
      let result = { success: true, subscriptionId: null };

      if (!isFreePlan) {
        const subscriptionData = {
          planId: plan.id,
          payment_method: formData.paymentMethod,
          userId: transactionUserId,
          card: cardData,
          customer: {
            name: formData.name,
            email: formData.email,
            cpf: formData.cpf,
            phone: formData.phone,
            address: {
              street: formData.street,
              street_number: formData.number,
              neighborhood: formData.neighborhood,
              city: formData.city,
              state: formData.state,
              zipcode: formData.zip
            }
          }
        };

        const response = await fetch(CREATE_SUBSCRIPTION_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscriptionData)
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Falha na requisição (${response.status}): ${errorText}`);
        }

        result = await response.json();
        if (!result.success) throw new Error(result.message || 'Falha na transação');
      }

      let userUid;
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        userUid = userCredential.user.uid;
      } catch (authError) {
        if (authError.code === 'auth/email-already-in-use') {
          throw new Error(isFreePlan ? 'Este e-mail já possui uma conta. Entre pela página de login.' : 'Pagamento aprovado, mas o e-mail já está em uso. Entre em contato com o suporte.');
        }
        throw authError;
      }

      let pagarmeCustomerId = null;
      if (!isFreePlan) try {
        const tempUserSnap = await get(ref(database, `users/${transactionUserId}`));
        if (tempUserSnap.exists()) {
          pagarmeCustomerId = tempUserSnap.val().pagarmeCustomerId;
          await remove(ref(database, `users/${transactionUserId}`));
        }
      } catch (tempError) {
        console.warn('Erro ao recuperar dados do usuário temporário:', tempError);
      }

      await set(ref(database, `users/${userUid}`), {
        name: formData.name,
        email: formData.email,
        cpf: formData.cpf,
        phone: formData.phone,
        address: {
          street: formData.street,
          number: formData.number,
          neighborhood: formData.neighborhood,
          city: formData.city,
          state: formData.state,
          zip: formData.zip
        },
        planId,
        nomePlano: plan.title,
        limiteEleitores: plan.team,
        subscriptionId: result.subscriptionId,
        pagarmeCustomerId,
        subscriptionStatus: isFreePlan ? 'free' : 'active',
        isFreePlan,
        tipoUser: 'admin',
        cargo: 'Administrador',
        createdAt: new Date()
      });

      if (tempId) {
        await remove(ref(database, `registros_temporarios/${tempId}`));
      }

      navigate(isFreePlan ? '/dashboard' : '/login');
    } catch (checkoutError) {
      console.error('Erro no checkout:', checkoutError);
      setErrors({ submit: `Erro ao processar: ${checkoutError.message}` });
    } finally {
      setLoading(false);
    }
  };

  const renderTextField = (name, label, placeholder, type = 'text', full = false, masked = false, onBlur) => (
    <label className={`public-form-field ${full ? 'full' : ''}`}>
      <span className="public-form-label">{label}</span>
      {errors[name] ? <div className="public-alert">{errors[name]}</div> : null}
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        value={formData[name]}
        onChange={masked ? handleMaskedChange : handleChange}
        onBlur={onBlur}
        className="public-form-input"
        required
      />
    </label>
  );

  return (
    <PublicPageShell
      activeKey="plans"
      kicker="Assinatura e ativação"
      title={isFreePlan ? 'Crie sua conta gratuita e comece agora.' : 'Feche sua contratação sem sair do fluxo.'}
      subtitle={isFreePlan ? 'Sem cartão e sem compromisso. Informe seus dados e sua central de campanha ficará pronta para uso.' : 'Uma jornada simples para ativar a conta, registrar os dados da operação e concluir o pagamento com clareza.'}
      compactHero
      contentClassName="public-checkout-shell"
      actions={<button type="button" className="public-glass-btn" onClick={() => navigate('/plans')}>Trocar plano</button>}
    >
      <div className="public-grid-2">
        <article className="public-panel checkout-plan-summary">
          <div className="checkout-plan-summary-head">
            <div>
              <span>Plano escolhido</span>
              <h2>{plan.title || planId}</h2>
              <p>{plan.subtitle || 'Estrutura pronta para começar sua operação eleitoral.'}</p>
            </div>
            {plan.recommended ? <span className="checkout-plan-recommended">Recomendado</span> : null}
          </div>

          <div className="checkout-plan-price-row">
            <div>
              <span>Investimento</span>
              <strong>{plan.price || 'Sob consulta'}{!isFreePlan ? <small>/mês</small> : null}</strong>
            </div>
            {Number(plan.trialDays) > 0 ? (
              <div><span>Teste gratuito</span><strong>{Number(plan.trialDays)} dias</strong></div>
            ) : null}
          </div>

          <div className="checkout-plan-scroll">
            <section className="checkout-plan-section">
              <h3>Recursos essenciais incluídos</h3>
              <div className="checkout-core-features">
                {INCLUDED_CORE_FEATURES.map((feature) => (
                  <div key={feature}><CheckCircle2 size={17} /><span>{feature}</span></div>
                ))}
              </div>
            </section>

            <section className="checkout-plan-section">
              <h3>Limites da operação</h3>
              <div className="checkout-plan-limits">
                <div className="checkout-plan-limit is-primary">
                  <Database size={18} />
                  <span>Base de eleitores</span>
                  <strong>{plan.database || plan.team || 'Conforme o plano'}</strong>
                </div>
                {PLAN_LIMIT_LABELS.map((item) => {
                  const limit = plan.featureLimits?.[item.key];
                  const formattedLimit = formatPlanLimit(limit);
                  return (
                    <div key={item.key} className={`checkout-plan-limit ${formattedLimit === 'Não incluído' ? 'is-disabled' : ''}`}>
                      <CheckCircle2 size={17} />
                      <span>{item.label}</span>
                      <strong>{formattedLimit}</strong>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="checkout-plan-section checkout-plan-conditions">
              <div><span>Equipe</span><strong>{plan.team || 'Conforme o plano'}</strong></div>
              <div><span>Carência após vencimento</span><strong>{Number(plan.graceDays || 5)} dias</strong></div>
              <div><span>Cancelamento</span><strong>A qualquer momento</strong></div>
            </section>
          </div>

          <p className="checkout-plan-ready">Ao concluir, sua conta administrativa estará pronta para iniciar a base, convidar a equipe e organizar os primeiros fluxos.</p>
        </article>

        <article className="public-form-card">
          <h3>{isFreePlan ? 'Criar conta gratuita' : 'Finalizar contratação'}</h3>
          <div className="public-steps">
            <div className={`public-step-pill ${step >= 1 ? 'active' : ''}`}>
              <strong>1. Conta</strong>
              <span className="public-step-copy"><User size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />Dados pessoais</span>
            </div>
            <div className={`public-step-pill ${step >= 2 ? 'active' : ''}`}>
              <strong>2. Endereço</strong>
              <span className="public-step-copy"><MapPin size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />Entrega e faturamento</span>
            </div>
            {!isFreePlan ? (
              <div className={`public-step-pill ${step >= 3 ? 'active' : ''}`}>
                <strong>3. Pagamento</strong>
                <span className="public-step-copy"><CreditCard size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />Cartão ou boleto</span>
              </div>
            ) : null}
          </div>

          {errors.submit ? <div className="public-alert" style={{ marginBottom: '14px' }}>{errors.submit}</div> : null}

          <form onSubmit={isFreePlan ? (step === 2 ? handleSubmit : handleNext) : (step === 3 ? handleSubmit : handleNext)} className="public-form-grid">
            {step === 1 ? (
              <>
                {renderTextField('name', 'Nome completo', 'Seu nome', 'text', true)}
                {renderTextField('email', 'E-mail', 'voce@campanha.com', 'email', true)}
                <label className="public-form-field full">
                  <span className="public-form-label">Senha</span>
                  {errors.password ? <div className="public-alert">{errors.password}</div> : null}
                  <div className="public-inline-icon-field">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      placeholder="Crie uma senha"
                      value={formData.password}
                      onChange={handleChange}
                      className="public-form-input"
                      required
                    />
                    <button
                      type="button"
                      className="public-inline-action"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </label>
                {renderTextField('confirmPassword', 'Confirmar senha', 'Repita a senha', showPassword ? 'text' : 'password', true)}
                {renderTextField('cpf', 'CPF', '000.000.000-00', 'text', false, true)}
                {renderTextField('phone', 'Telefone', '(00) 00000-0000', 'text', false, true)}
              </>
            ) : null}

            {step === 2 ? (
              <>
                {renderTextField('zip', 'CEP', '00000-000', 'text', false, true, checkCep)}
                {renderTextField('city', 'Cidade', 'Sua cidade')}
                {renderTextField('street', 'Rua', 'Rua e avenida', 'text', true)}
                {renderTextField('neighborhood', 'Bairro', 'Seu bairro')}
                {renderTextField('number', 'Número', '123')}
                {renderTextField('state', 'Estado', 'UF')}
              </>
            ) : null}

            {step === 3 ? (
              <>
                <label className="public-form-field full">
                  <span className="public-form-label">Método de pagamento</span>
                  <select
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleChange}
                    className="public-form-select"
                  >
                    <option value="credit_card">Cartão de crédito</option>
                    <option value="boleto">Boleto</option>
                  </select>
                </label>

                {formData.paymentMethod === 'credit_card' ? (
                  <>
                    {renderTextField('cardNumber', 'Número do cartão', '0000 0000 0000 0000', 'text', true, true)}
                    {renderTextField('cardName', 'Nome no cartão', 'NOME IMPRESSO', 'text', true, true)}
                    {renderTextField('cardExpiry', 'Validade', 'MM/AA', 'text', false, true)}
                    {renderTextField('cardCvc', 'CVC', '000', 'text', false, true)}
                  </>
                ) : (
                  <div className="public-success">
                    O boleto será gerado e enviado para o e-mail informado após a confirmação da contratação.
                  </div>
                )}

                <div className="public-success full">
                  <Lock size={14} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                  Pagamento processado via Pagar.me
                </div>
              </>
            ) : null}

            <div className="public-form-field full" style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: '8px', gap: '12px', flexWrap: 'wrap' }}>
              {step > 1 ? (
                <button type="button" className="public-glass-btn" onClick={() => setStep((prev) => prev - 1)}>
                  <ArrowLeft size={18} />
                  Voltar
                </button>
              ) : <span />}

              <button type="submit" className="btn-primary public-primary-cta" disabled={loading}>
                {loading ? 'Criando sua conta...' : isFreePlan && step === 2 ? 'Criar conta grátis' : step === 3 ? 'Finalizar contratação' : 'Próximo passo'}
                {!loading ? ((isFreePlan && step === 2) || step === 3 ? <CheckCircle size={18} /> : <ArrowRight size={18} />) : null}
              </button>
            </div>
          </form>
        </article>
      </div>
    </PublicPageShell>
  );
}
