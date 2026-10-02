import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  UserRound
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { get, push, ref, set, update } from '../../services/firestoreDatabase';
import { database } from '../../firebaseConfig';
import PublicPageShell from '../../components/PublicPageShell';

const initialFormState = {
  nome: '',
  apelido: '',
  instagram: '',
  sexo: '',
  email: '',
  telefone: '',
  bairro: '',
  cidade: '',
  estado: '',
  cpf: '',
  nascimento: '',
  titulo: '',
  zona: '',
  secao: '',
  endereco: '',
  numero: '',
  cep: '',
  localVotacao: '',
  observacoes: ''
};

const FORM_STEPS = [
  {
    id: 1,
    title: 'Identificação',
    subtitle: 'Quem é a pessoa que estamos cadastrando.',
    fields: ['nome', 'apelido', 'sexo', 'nascimento']
  },
  {
    id: 2,
    title: 'Contato',
    subtitle: 'Vamos registrar os melhores canais para contato.',
    fields: ['email', 'telefone']
  },
  {
    id: 3,
    title: 'Dados Eleitorais',
    subtitle: 'Informações úteis para mobilização e operação.',
    fields: ['cpf', 'titulo', 'zona', 'secao', 'localVotacao']
  },
  {
    id: 4,
    title: 'Endereço',
    subtitle: 'Melhora mapas, visitas e filtros territoriais.',
    fields: ['cep', 'endereco', 'numero', 'bairro', 'cidade', 'estado']
  },
  {
    id: 5,
    title: 'Observações',
    subtitle: 'Contexto final para o time operacional.',
    fields: ['observacoes']
  },
  {
    id: 6,
    title: 'Redes Sociais',
    subtitle: 'Só o essencial para enriquecer o relacionamento.',
    fields: ['instagram']
  }
];

const DEFAULT_PUBLIC_FIELDS = ['nome', 'email', 'telefone'];
const PUBLIC_FIELD_IDS = FORM_STEPS.flatMap((item) => item.fields);

export default function EleitorForm() {
  const location = useLocation();
  const navigate = useNavigate();
  const [creatorId, setCreatorId] = useState('');
  const [creatorEmail, setCreatorEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [localVotacaoLoading, setLocalVotacaoLoading] = useState(false);
  const [localVotacaoOptions, setLocalVotacaoOptions] = useState([]);
  const [formData, setFormData] = useState(initialFormState);
  const [step, setStep] = useState(1);
  const [draftId, setDraftId] = useState('');
  const [completionButton, setCompletionButton] = useState({ label: '', url: '' });
  const [enabledFields, setEnabledFields] = useState(DEFAULT_PUBLIC_FIELDS);
  const [publicProfile, setPublicProfile] = useState(null);

  const activeSteps = useMemo(() => FORM_STEPS.map((item) => ({
    ...item,
    fields: item.fields.filter((field) => enabledFields.includes(field))
  })).filter((item) => item.fields.length), [enabledFields]);
  const activeStep = useMemo(() => activeSteps.find((item) => item.id === step) || activeSteps[0] || FORM_STEPS[0], [activeSteps, step]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const uid = searchParams.get('userId');
    const email = searchParams.get('email');

    if (uid) setCreatorId(uid);
    if (email) setCreatorEmail(email);
    const profileSlug = searchParams.get('profileSlug');
    if (profileSlug) {
      setEnabledFields(DEFAULT_PUBLIC_FIELDS);
      get(ref(database, `publicProfiles/${profileSlug}`)).then((snapshot) => {
        if (!snapshot.exists()) return;
        const publicProfile = snapshot.val();
        setPublicProfile(publicProfile);
        const configuredFields = Array.isArray(publicProfile.voterFormFields)
          ? [...new Set(['nome', ...publicProfile.voterFormFields.filter((field) => PUBLIC_FIELD_IDS.includes(field))])]
          : DEFAULT_PUBLIC_FIELDS;
        setEnabledFields(configuredFields);
        setCompletionButton({
          label: publicProfile.completionButtonLabel || 'Entrar no grupo de apoio',
          url: publicProfile.completionButtonUrl || ''
        });
      }).catch((error) => console.error('Erro ao carregar o botão de conclusão do perfil:', error));
    }
  }, [location]);

  const safeCompletionUrl = /^https?:\/\//i.test(completionButton.url.trim()) ? completionButton.url.trim() : '';

  useEffect(() => {
    if (activeSteps.length && !activeSteps.some((item) => item.id === step)) setStep(activeSteps[0].id);
  }, [activeSteps, step]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleMaskedChange = (event) => {
    const { name, value } = event.target;
    let val = value;

    if (name === 'cpf') {
      val = val.replace(/\D/g, '').slice(0, 11)
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2');
    } else if (name === 'telefone') {
      val = val.replace(/\D/g, '').slice(0, 11);
      val = val.replace(/^(\d{2})(\d)/g, '($1) $2');
      val = val.replace(/(\d)(\d{4})$/, '$1-$2');
    } else if (name === 'cep') {
      val = val.replace(/\D/g, '').slice(0, 8);
      val = val.replace(/^(\d{5})(\d)/, '$1-$2');
    } else if (name === 'titulo') {
      val = val.replace(/\D/g, '').slice(0, 12);
    } else if (name === 'zona') {
      val = val.replace(/\D/g, '').slice(0, 3);
      if (val === '') {
        setLocalVotacaoOptions([]);
      }
    } else if (name === 'secao') {
      val = val.replace(/\D/g, '').slice(0, 4);
    }

    setFormData((prev) => {
      const next = { ...prev, [name]: val };
      if (name === 'zona' && val === '') next.localVotacao = '';
      return next;
    });
  };

  const checkCep = async (event) => {
    const cep = event.target.value.replace(/\D/g, '');
    if (cep.length === 8) {
      setCepLoading(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setFormData((prev) => ({
            ...prev,
            endereco: data.logradouro,
            bairro: data.bairro,
            cidade: data.localidade,
            estado: data.uf
          }));
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
      }
      setCepLoading(false);
    }
  };

  const isValidTitulo = (titulo) => {
    if (!titulo) return false;
    const cleanTitulo = titulo.replace(/\D/g, '');
    if (cleanTitulo.length !== 12) return false;

    const digits = cleanTitulo.split('').map(Number);
    const uf = digits[8] * 10 + digits[9];
    if (uf < 1 || uf > 28) return false;

    let sum = 0;
    for (let i = 0; i < 8; i += 1) sum += digits[i] * (i + 2);
    let rest = sum % 11;
    let dv1 = rest;
    if (rest === 0) dv1 = uf === 1 || uf === 2 ? 1 : 0;
    else if (rest === 10) dv1 = 0;
    if (digits[10] !== dv1) return false;

    sum = 0;
    sum += digits[8] * 7 + digits[9] * 8 + dv1 * 9;
    rest = sum % 11;
    let dv2 = rest;
    if (rest === 0) dv2 = uf === 1 || uf === 2 ? 1 : 0;
    else if (rest === 10) dv2 = 0;
    return digits[11] === dv2;
  };

  const checkTitulo = async (event) => {
    const titulo = event.target.value.replace(/\D/g, '');
    if (titulo.length === 12 && !isValidTitulo(titulo)) {
      alert('Título de eleitor inválido.');
    }
  };

  const checkLocalVotacao = async () => {
    const { zona } = formData;
    setLocalVotacaoOptions([]);
    setFormData((prev) => ({ ...prev, localVotacao: '' }));

    if (zona) {
      setLocalVotacaoLoading(true);
      try {
        const placesRef = ref(database, 'localvotacao');
        const snapshot = await get(placesRef);

        if (snapshot.exists()) {
          const allData = snapshot.val();
          let matchedPlaces = [];

          Object.values(allData).forEach((cityPlaces) => {
            const places = Object.values(cityPlaces).filter((place) => place.zona === zona);
            matchedPlaces = [...matchedPlaces, ...places];
          });

          if (matchedPlaces.length > 0) {
            setLocalVotacaoOptions(matchedPlaces);
          }
        }
      } catch (error) {
        console.error('Erro ao buscar local de votação:', error);
      } finally {
        setLocalVotacaoLoading(false);
      }
    }
  };

  const persistDraft = async (status = 'draft') => {
    if (!creatorId) {
      throw new Error('Link inválido (faltando ID do responsável).');
    }

    const payload = {
      ...formData,
      creatorId,
      creatorEmail,
      updatedAt: new Date().toISOString(),
      origin: 'public_form',
      formStatus: status,
      formStep: step
    };

    if (!draftId) {
      const votersRef = ref(database, 'eleitores');
      const newVoterRef = push(votersRef);
      await set(newVoterRef, {
        ...payload,
        createdAt: new Date().toISOString()
      });
      setDraftId(newVoterRef.key);
      return newVoterRef.key;
    }

    await update(ref(database, `eleitores/${draftId}`), payload);
    return draftId;
  };

  const validateStep = () => {
    if (activeStep.fields.includes('nome') && !formData.nome.trim()) {
      alert('Preencha pelo menos o nome completo para continuar.');
      return false;
    }
    return true;
  };

  const handleNext = async (event) => {
    event.preventDefault();
    if (!validateStep()) return;

    setSaving(true);
    try {
      const currentIndex = activeSteps.findIndex((item) => item.id === step);
      const isLastStep = currentIndex === activeSteps.length - 1;
      await persistDraft(isLastStep ? 'completed' : 'draft');
      if (isLastStep) {
        setSuccess(true);
        setStep(activeSteps[0]?.id || 1);
        setDraftId('');
        setFormData(initialFormState);
      } else setStep(activeSteps[currentIndex + 1].id);
    } catch (error) {
      console.error('Erro ao salvar etapa:', error);
      alert(error.message || 'Não foi possível salvar esta etapa.');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!validateStep()) return;

    setSaving(true);
    try {
      await persistDraft('completed');
      setSuccess(true);
      setStep(1);
      setDraftId('');
      setFormData(initialFormState);
    } catch (error) {
      console.error('Erro ao cadastrar:', error);
      alert(error.message || 'Erro ao cadastrar eleitor.');
    } finally {
      setSaving(false);
    }
  };

  const renderField = (label, name, extra = {}) => (
    <label className={`public-form-field ${extra.full ? 'full' : ''}`}>
      <span className="public-form-label">{label}</span>
      <input
        type={extra.type || 'text'}
        name={name}
        value={formData[name]}
        onChange={extra.masked ? handleMaskedChange : handleChange}
        onBlur={extra.onBlur}
        className="public-form-input eleitor-form-input"
        placeholder={extra.placeholder || ''}
        required={extra.required}
      />
    </label>
  );

  const renderStepFields = () => {
    const selected = (field) => activeStep.fields.includes(field);
    if (activeStep.id === 1) {
      return (
        <>
          {selected('nome') ? renderField('Nome completo', 'nome', { required: true, full: true, placeholder: 'Nome do eleitor' }) : null}
          {selected('apelido') ? renderField('Apelido', 'apelido', { placeholder: 'Como gosta de ser chamado(a)' }) : null}

          {selected('sexo') ? <label className="public-form-field">
            <span className="public-form-label">Sexo</span>
            <select name="sexo" value={formData.sexo} onChange={handleChange} className="public-form-select eleitor-form-input eleitor-form-select">
              <option value="">Selecione</option>
              <option value="Masculino">Masculino</option>
              <option value="Feminino">Feminino</option>
              <option value="Outro">Outro</option>
            </select>
          </label> : null}

          {selected('nascimento') ? renderField('Data de nascimento', 'nascimento', { type: 'date', full: true }) : null}
        </>
      );
    }

    if (step === 2) {
      return (
        <>
          {selected('email') ? renderField('E-mail', 'email', { type: 'email', placeholder: 'voce@email.com', full: true }) : null}
          {selected('telefone') ? renderField('Telefone', 'telefone', { masked: true, placeholder: '(00) 00000-0000', full: true }) : null}
        </>
      );
    }

    if (step === 3) {
      return (
        <>
          {selected('cpf') ? renderField('CPF', 'cpf', { masked: true, placeholder: '000.000.000-00', full: true }) : null}
          {selected('titulo') ? renderField('Título de eleitor', 'titulo', { masked: true, onBlur: checkTitulo, placeholder: 'Apenas números', full: true }) : null}
          {selected('zona') || selected('secao') ? <div className="eleitor-form-inline-two full">
            {selected('zona') ? renderField('Zona', 'zona', { masked: true, onBlur: checkLocalVotacao, placeholder: '000' }) : null}
            {selected('secao') ? renderField('Seção', 'secao', { masked: true, placeholder: '0000' }) : null}
          </div> : null}
          {selected('localVotacao') ? <label className="public-form-field full">
            <span className="public-form-label">
              Local de votação {localVotacaoLoading ? '(Buscando...)' : ''}
            </span>
            <select
              name="localVotacao"
              value={formData.localVotacao}
              onChange={handleChange}
              className="public-form-select eleitor-form-input eleitor-form-select"
            >
              <option value="">Selecione um local</option>
              {formData.localVotacao && !localVotacaoOptions.some((place) => `${place.local || ''} - ${place.endereco || ''}` === formData.localVotacao) ? (
                <option value={formData.localVotacao}>{formData.localVotacao}</option>
              ) : null}
              {localVotacaoOptions.map((place, index) => (
                <option key={`${place.local}-${index}`} value={`${place.local || ''} - ${place.endereco || ''}`}>
                  {place.local}
                </option>
              ))}
            </select>
          </label> : null}
        </>
      );
    }

    if (step === 4) {
      return (
        <>
          {selected('cep') ? renderField('CEP', 'cep', { masked: true, onBlur: checkCep, placeholder: cepLoading ? 'Buscando...' : '00000-000' }) : null}
          {selected('endereco') ? renderField('Endereço', 'endereco') : null}
          {selected('numero') ? renderField('Número', 'numero') : null}
          {selected('bairro') ? renderField('Bairro', 'bairro') : null}
          {selected('cidade') ? renderField('Cidade', 'cidade') : null}
          {selected('estado') ? renderField('Estado', 'estado') : null}
        </>
      );
    }

    if (activeStep.id === 5) {
      return (
        <label className="public-form-field full">
          <span className="public-form-label">Observações</span>
          <textarea
            name="observacoes"
            value={formData.observacoes}
            onChange={handleChange}
            className="public-form-textarea eleitor-form-input eleitor-form-textarea"
            placeholder="Anotações adicionais, contexto de relacionamento ou observações úteis."
          />
        </label>
      );
    }

    return selected('instagram') ? renderField('Instagram', 'instagram', { placeholder: '@usuario', full: true }) : null;
  };

  if (success) {
    return (
      <PublicPageShell
        profile={publicProfile}
        hideNav
        activeKey="contact"
        kicker="Cadastro concluído"
        title="Eleitor cadastrado com sucesso."
        subtitle="A base foi atualizada e o responsável já pode acompanhar o novo cadastro dentro do sistema."
        actions={
          <button type="button" className="public-glass-btn" onClick={() => navigate('/')}>
            Voltar ao início
          </button>
        }
        contentClassName="public-form-success-shell"
        compactHero
      >
        <div className="public-success eleitor-form-success">
          <CheckCircle size={56} />
          <strong>Tudo certo</strong>
          <p>Os dados foram recebidos e inseridos com sucesso na base da campanha.</p>
          {safeCompletionUrl ? <a className="btn-primary public-primary-cta voter-support-cta" href={safeCompletionUrl} target="_blank" rel="noreferrer">{completionButton.label || 'Entrar no grupo de apoio'} <ArrowRight size={18} /></a> : null}
          <button type="button" className="btn-primary public-primary-cta" onClick={() => setSuccess(false)}>
            Cadastrar novo eleitor
          </button>
        </div>
      </PublicPageShell>
    );
  }

  return (
    <PublicPageShell
      profile={publicProfile}
      hideNav
      activeKey="contact"
      kicker="Ficha pública de cadastro"
      title="Seu cadastro ajuda nossa equipe a manter você por perto e bem informado."
      subtitle="Leva poucos instantes. Preencha em etapas rápidas para receber um acompanhamento mais organizado, próximo e eficiente."
      contentClassName="eleitor-form-shell"
      compactHero
    >
      <div className="eleitor-form-layout">
        <article className="public-panel eleitor-form-panel">
          <div className="eleitor-form-section-head">
            <span className="public-kicker">
              <UserRound size={16} />
              Passo {Math.max(1, activeSteps.findIndex((item) => item.id === step) + 1)} de {activeSteps.length || 1}
            </span>
            <h3 className="eleitor-form-step-title">{activeStep.title}</h3>
            <p>{activeStep.subtitle}</p>
          </div>

          <div className="eleitor-form-progress-line" aria-label="Progresso do formulário">
            {activeSteps.map((item) => (
              <div key={item.id} className={`eleitor-form-progress-item ${step >= item.id ? 'active' : ''}`}>
                <span>{item.title}</span>
              </div>
            ))}
          </div>

          <form onSubmit={activeSteps.findIndex((item) => item.id === step) === activeSteps.length - 1 ? handleSave : handleNext} className="public-form-grid eleitor-form-grid">
            {renderStepFields()}

            <div className="public-form-field full eleitor-form-submit eleitor-form-actions">
              {activeSteps.findIndex((item) => item.id === step) > 0 ? (
                <button type="button" className="btn-secondary" onClick={() => setStep(activeSteps[activeSteps.findIndex((item) => item.id === step) - 1].id)} disabled={saving}>
                  <ArrowLeft size={18} />
                  Voltar
                </button>
              ) : (
                <span />
              )}

              <button type="submit" className="btn-primary public-primary-cta" disabled={saving}>
                {saving ? 'Salvando...' : activeSteps.findIndex((item) => item.id === step) === activeSteps.length - 1 ? 'Finalizar cadastro' : 'Próximo passo'}
                {!saving ? (activeSteps.findIndex((item) => item.id === step) === activeSteps.length - 1 ? <CheckCircle size={18} /> : <ArrowRight size={18} />) : null}
              </button>
            </div>
          </form>
        </article>

      </div>
    </PublicPageShell>
  );
}
