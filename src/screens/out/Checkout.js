import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { User, MapPin, CreditCard, CheckCircle, ArrowRight, ArrowLeft, Lock, Eye, EyeOff } from 'lucide-react';
import { auth, database } from '../../firebaseConfig';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { ref, set, push, update, get, remove } from 'firebase/database';
import Logo from '../../assets/logomarca-vertical-azul.png';

const CREATE_SUBSCRIPTION_URL = 'https://us-central1-oassessor-blu.cloudfunctions.net/createSubscription';

export default function Checkout() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [tempId, setTempId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    // Dados Pessoais
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    cpf: '',
    phone: '',
    // Endereço
    street: '',
    neighborhood: '',
    number: '',
    city: '',
    state: '',
    zip: '',
    // Cartão
    cardNumber: '',
    cardName: '',
    cardExpiry: '',
    cardCvc: '',
    paymentMethod: 'credit_card'
  });

  const plan = useMemo(() => location.state?.plan || { id: planId, title: planId, amount: 0 }, [location.state, planId]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: null });
    }
  };

  const handleMaskedChange = (e) => {
    const { name, value } = e.target;
    let val = value;

    if (name === 'cpf') {
      val = val.replace(/\D/g, '').slice(0, 11)
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2');
    } else if (name === 'phone') {
      val = val.replace(/\D/g, '').slice(0, 11);
      val = val.replace(/^(\d{2})(\d)/g, '($1) $2');
      val = val.replace(/(\d)(\d{4})$/, '$1-$2');
    } else if (name === 'zip') {
      val = val.replace(/\D/g, '').slice(0, 8);
      val = val.replace(/^(\d{5})(\d)/, '$1-$2');
    } else if (name === 'cardNumber') {
      val = val.replace(/\D/g, '').slice(0, 16);
      val = val.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
    } else if (name === 'cardExpiry') {
      val = val.replace(/\D/g, '').slice(0, 4);
      if (val.length > 2) {
        val = val.slice(0, 2) + '/' + val.slice(2);
      }
    } else if (name === 'cardCvc') {
      val = val.replace(/\D/g, '').slice(0, 4);
    } else if (name === 'cardName') {
      val = val.toUpperCase();
    }

    setFormData(prev => ({ ...prev, [name]: val }));
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  const checkCep = async (e) => {
    const cep = e.target.value.replace(/\D/g, '');
    if (cep.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            street: data.logradouro,
            neighborhood: data.bairro,
            city: data.localidade,
            state: data.uf
          }));
        }
      } catch (error) {
        console.error("Erro ao buscar CEP:", error);
      }
    }
  };

  const isValidCPF = (cpf) => {
    if (!cpf) return false;
    const cleanCPF = cpf.replace(/[^\d]+/g, '');
    if (cleanCPF.length !== 11) return false;
    if (/^(\d)\1+$/.test(cleanCPF)) return false; // Verifica se todos os dígitos são iguais

    let sum = 0;
    let remainder;

    for (let i = 1; i <= 9; i++) 
      sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
    
    remainder = (sum * 10) % 11;
    if ((remainder === 10) || (remainder === 11)) remainder = 0;
    if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false;

    sum = 0;
    for (let i = 1; i <= 10; i++) 
      sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
    
    remainder = (sum * 10) % 11;
    if ((remainder === 10) || (remainder === 11)) remainder = 0;
    if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false;

    return true;
  };

  const validateCurrentStep = () => {
    const newErrors = {};
    let isValid = true;

    if (step === 1) {
      if (!formData.name) newErrors.name = "Nome completo é obrigatório.";
      if (!formData.email) newErrors.email = "E-mail é obrigatório.";
      if (!formData.phone) newErrors.phone = "Telefone é obrigatório.";
      
      if (!formData.cpf) {
        newErrors.cpf = "CPF é obrigatório.";
      } else if (!isValidCPF(formData.cpf)) {
        newErrors.cpf = "CPF inválido.";
      }

      if (!formData.password) {
        newErrors.password = "Senha é obrigatória.";
      } else if (formData.password.length < 6) {
        newErrors.password = "A senha deve ter pelo menos 6 caracteres.";
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "As senhas não coincidem.";
      }
    }

    if (step === 2) {
      if (!formData.zip) newErrors.zip = "CEP é obrigatório.";
      if (!formData.city) newErrors.city = "Cidade é obrigatória.";
      if (!formData.street) newErrors.street = "Rua é obrigatória.";
      if (!formData.neighborhood) newErrors.neighborhood = "Bairro é obrigatório.";
      if (!formData.number) newErrors.number = "Número é obrigatório.";
      if (!formData.state) newErrors.state = "Estado é obrigatório.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      isValid = false;
    }

    return isValid;
  };

  const handleNext = async (e) => {
    e.preventDefault();
    
    if (!validateCurrentStep()) return;
    
    // Salvar dados parciais no Firebase (registros_temporarios)
    try {
      const dataToSave = { ...formData };
      // Removemos dados sensíveis ou desnecessários para o registro temporário
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
      console.error("Erro ao salvar progresso:", error);
    }

    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const newErrors = {};
    if (formData.paymentMethod === 'credit_card' && (!formData.cardNumber || !formData.cardName || !formData.cardExpiry || !formData.cardCvc)) {
      if (!formData.cardNumber) newErrors.cardNumber = "Número do cartão é obrigatório.";
      if (!formData.cardName) newErrors.cardName = "Nome no cartão é obrigatório.";
      if (!formData.cardExpiry) newErrors.cardExpiry = "Validade é obrigatória.";
      if (!formData.cardCvc) newErrors.cardCvc = "CVC é obrigatório.";
      
      setErrors(newErrors);
      setLoading(false);
      return;
    }

    try {
      // Atualiza etapa para 3 antes de processar
      if (tempId) {
        await update(ref(database, `registros_temporarios/${tempId}`), { etapa: '3' });
      }

      // 1. Processar Pagamento no Pagar.me
      let cardData = null;
      if (formData.paymentMethod === 'credit_card') {
        const cleanNumber = formData.cardNumber.replace(/\D/g, '');
        const cleanExpiry = formData.cardExpiry.replace(/\D/g, '');
        const expMonth = parseInt(cleanExpiry.substring(0, 2));
        const expYear = parseInt(cleanExpiry.substring(2));
        cardData = {
          number: cleanNumber,
          holder_name: formData.cardName,
          exp_month: expMonth,
          exp_year: expYear + (expYear < 100 ? 2000 : 0), // Garante ano com 4 dígitos
          cvv: formData.cardCvc
        };
      }

      // Usamos o tempId como ID temporário para o Pagar.me
      const transactionUserId = tempId || `temp_${Date.now()}`;

      const subscriptionData = {
        planId: plan.id,
        payment_method: formData.paymentMethod,
        userId: transactionUserId,
        card: cardData, // será null para boleto
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
        },
      };

      console.log("Enviando payload para createSubscription:", subscriptionData);

      const response = await fetch(CREATE_SUBSCRIPTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscriptionData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Falha na requisição (${response.status}): ${errorText}`);
      }

      const result = await response.json();

      if (!result.success) throw new Error(result.message || 'Falha na transação');

      // 2. Criar usuário no Firebase Auth (APÓS sucesso no pagamento)
      let userUid;
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        userUid = userCredential.user.uid;
      } catch (authError) {
        if (authError.code === 'auth/email-already-in-use') {
           throw new Error("Pagamento aprovado, mas o e-mail já está em uso. Entre em contato com o suporte.");
        }
        throw authError;
      }

      // Recuperar dados extras salvos pela Cloud Function no nó temporário (como pagarmeCustomerId)
      let pagarmeCustomerId = null;
      try {
        const tempUserSnap = await get(ref(database, `users/${transactionUserId}`));
        if (tempUserSnap.exists()) {
          pagarmeCustomerId = tempUserSnap.val().pagarmeCustomerId;
          // Remove o registro temporário criado pela Cloud Function em 'users'
          await remove(ref(database, `users/${transactionUserId}`));
        }
      } catch (err) {
        console.warn("Erro ao recuperar dados do usuário temporário:", err);
      }

      // 3. Salvar dados definitivos no Realtime Database
      await set(ref(database, 'users/' + userUid), {
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
            planId: planId,
            nomePlano: plan.title,
            limiteEleitores: plan.team,
            subscriptionId: result.subscriptionId,
            pagarmeCustomerId: pagarmeCustomerId,
            tipoUser: "admin",
            cargo: "Administrador",
            createdAt: new Date()
      });

      // Limpar registro temporário de progresso
      if (tempId) {
        await remove(ref(database, `registros_temporarios/${tempId}`));
      }

      alert("Contratação realizada com sucesso! Verifique seu e-mail para o boleto, se aplicável.");
      navigate('/login');

    } catch (error) {
      console.error("Erro no checkout:", error);
      alert(`Erro ao processar: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="checkout-container">
      <div className="checkout-card">
        <div className="checkout-header">
          <img src={Logo} alt="Logo" className="checkout-logo" />
          <h2>Finalizar Contratação</h2> 
          <p>Plano Selecionado: <span className="highlight-plan">{planId?.toUpperCase()}</span></p>
        </div>

        {/* Progress Bar */}
        <div className="progress-bar">
          <div className={`step-indicator ${step >= 1 ? 'active' : ''}`}>1</div>
          <div className="step-line"></div>
          <div className={`step-indicator ${step >= 2 ? 'active' : ''}`}>2</div>
          <div className="step-line"></div>
          <div className={`step-indicator ${step >= 3 ? 'active' : ''}`}>3</div>
        </div>

        <form onSubmit={step === 3 ? handleSubmit : handleNext} className="checkout-form">
          
          {/* ETAPA 1: Dados Pessoais */}
          {step === 1 && (
            <div className="form-step fade-in">
              <h3><User size={20} /> Dados Pessoais</h3>
              <div className="input-group">
                {errors.name && <span className="error-label" style={{color: '#ef4444', fontSize: '0.8rem', display: 'block', marginBottom: '4px'}}>{errors.name}</span>}
                <input type="text" name="name" placeholder="Nome Completo" value={formData.name} onChange={handleChange} required className="custom-input" />
              </div>
              <div className="input-group">
                {errors.email && <span className="error-label" style={{color: '#ef4444', fontSize: '0.8rem', display: 'block', marginBottom: '4px'}}>{errors.email}</span>}
                <input type="email" name="email" placeholder="E-mail" value={formData.email} onChange={handleChange} required className="custom-input" />
              </div>
              <div className="input-group" style={{ position: 'relative' }}>
                {errors.password && <span className="error-label" style={{color: '#ef4444', fontSize: '0.8rem', display: 'block', marginBottom: '4px'}}>{errors.password}</span>}
                <input 
                  type={showPassword ? "text" : "password"} 
                  name="password" 
                  placeholder="Senha" 
                  value={formData.password} 
                  onChange={handleChange} 
                  required 
                  className="custom-input" 
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <div className="input-group">
                {errors.confirmPassword && <span className="error-label" style={{color: '#ef4444', fontSize: '0.8rem', display: 'block', marginBottom: '4px'}}>{errors.confirmPassword}</span>}
                <input type={showPassword ? "text" : "password"} name="confirmPassword" placeholder="Confirmar Senha" value={formData.confirmPassword} onChange={handleChange} required className="custom-input" />
              </div>
              <div className="row-inputs">
                <div style={{flex: 1}}>
                  {errors.cpf && <span className="error-label" style={{color: '#ef4444', fontSize: '0.8rem', display: 'block', marginBottom: '4px'}}>{errors.cpf}</span>}
                  <input type="text" name="cpf" placeholder="CPF" value={formData.cpf} onChange={handleMaskedChange} required className="custom-input" style={{width: '70%'}} />
                </div>
                <div style={{flex: 1}}>
                  {errors.phone && <span className="error-label" style={{color: '#ef4444', fontSize: '0.8rem', display: 'block', marginBottom: '4px'}}>{errors.phone}</span>}
                  <input type="text" name="phone" placeholder="Telefone" value={formData.phone} onChange={handleMaskedChange} required className="custom-input" style={{width: '70%'}}/>
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 2: Endereço */}
          {step === 2 && (
            <div className="form-step fade-in">
              <h3><MapPin size={20} /> Endereço</h3>
              <div className="row-inputs">
                <div style={{flex: 1}}>
                  {errors.zip && <span className="error-label" style={{color: '#ef4444', fontSize: '0.8rem', display: 'block', marginBottom: '4px'}}>{errors.zip}</span>}
                  <input type="text" name="zip" placeholder="CEP" value={formData.zip} onChange={handleMaskedChange} onBlur={checkCep} required className="custom-input" />
                </div>
                <div style={{flex: 1}}>
                  {errors.city && <span className="error-label" style={{color: '#ef4444', fontSize: '0.8rem', display: 'block', marginBottom: '4px'}}>{errors.city}</span>}
                  <input type="text" name="city" placeholder="Cidade" value={formData.city} onChange={handleChange} required className="custom-input" />
                </div>
              </div>
              <div className="input-group">
                {errors.street && <span className="error-label" style={{color: '#ef4444', fontSize: '0.8rem', display: 'block', marginBottom: '4px'}}>{errors.street}</span>}
                <input type="text" name="street" placeholder="Rua" value={formData.street} onChange={handleChange} required className="custom-input" />
              </div>
              <div className="row-inputs">
                <div style={{flex: 1}}>
                  {errors.neighborhood && <span className="error-label" style={{color: '#ef4444', fontSize: '0.8rem', display: 'block', marginBottom: '4px'}}>{errors.neighborhood}</span>}
                  <input type="text" name="neighborhood" placeholder="Bairro" value={formData.neighborhood} onChange={handleChange} required className="custom-input" />
                </div>
                <div style={{flex: 1}}>
                  {errors.number && <span className="error-label" style={{color: '#ef4444', fontSize: '0.8rem', display: 'block', marginBottom: '4px'}}>{errors.number}</span>}
                  <input type="text" name="number" placeholder="Número" value={formData.number} onChange={handleChange} required className="custom-input" />
                </div>
                <div style={{flex: 1}}>
                  {errors.state && <span className="error-label" style={{color: '#ef4444', fontSize: '0.8rem', display: 'block', marginBottom: '4px'}}>{errors.state}</span>}
                  <input type="text" name="state" placeholder="Estado" value={formData.state} onChange={handleChange} required className="custom-input" />
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 3: Pagamento */}
          {step === 3 && (
            <div className="form-step fade-in">
              <h3><CreditCard size={20} /> Pagamento Seguro</h3>
              <div className="payment-method-selector">
                <button type="button" className={formData.paymentMethod === 'credit_card' ? 'active' : ''} onClick={() => setFormData({...formData, paymentMethod: 'credit_card'})}>Cartão de Crédito</button>
                <button type="button" className={formData.paymentMethod === 'boleto' ? 'active' : ''} onClick={() => setFormData({...formData, paymentMethod: 'boleto'})}>Boleto</button>
              </div>

              {formData.paymentMethod === 'credit_card' && (
                <div className="fade-in">
                  <div className="input-group">
                    {errors.cardNumber && <span className="error-label" style={{color: '#ef4444', fontSize: '0.8rem', display: 'block', marginBottom: '4px'}}>{errors.cardNumber}</span>}
                    <input type="text" name="cardNumber" placeholder="Número do Cartão" value={formData.cardNumber} onChange={handleMaskedChange} required className="custom-input" />
                  </div>
                  <div className="input-group">
                    {errors.cardName && <span className="error-label" style={{color: '#ef4444', fontSize: '0.8rem', display: 'block', marginBottom: '4px'}}>{errors.cardName}</span>}
                    <input type="text" name="cardName" placeholder="Nome no Cartão" value={formData.cardName} onChange={handleMaskedChange} required className="custom-input" />
                  </div>
                  <div className="row-inputs">
                    <div style={{flex: 1}}>
                      {errors.cardExpiry && <span className="error-label" style={{color: '#ef4444', fontSize: '0.8rem', display: 'block', marginBottom: '4px'}}>{errors.cardExpiry}</span>}
                      <input type="text" name="cardExpiry" placeholder="MM/AA" value={formData.cardExpiry} onChange={handleMaskedChange} required className="custom-input" />
                    </div>
                    <div style={{flex: 1}}>
                      {errors.cardCvc && <span className="error-label" style={{color: '#ef4444', fontSize: '0.8rem', display: 'block', marginBottom: '4px'}}>{errors.cardCvc}</span>}
                      <input type="text" name="cardCvc" placeholder="CVC" value={formData.cardCvc} onChange={handleMaskedChange} required className="custom-input" />
                    </div>
                  </div>
                </div>
              )}

              {formData.paymentMethod === 'boleto' && (
                <p className="boleto-info">O boleto será gerado e enviado para o seu e-mail após a finalização.</p>
              )}

              <div className="secure-badge">
                <Lock size={14} /> Pagamento processado via Pagar.me
              </div>
            </div>
          )}

          <div className="form-actions">
            {step > 1 && (
              <button type="button" onClick={handleBack} className="btn-secondary">
                <ArrowLeft size={18} /> Voltar
              </button>
            )}
            
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Processando...' : step === 3 ? 'Finalizar Contratação' : 'Próximo'}
              {!loading && step !== 3 && <ArrowRight size={18} />}
              {!loading && step === 3 && <CheckCircle size={18} />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}