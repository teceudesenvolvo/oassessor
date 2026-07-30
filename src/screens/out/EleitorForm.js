import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  ShieldCheck,
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

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const uid = searchParams.get('userId');
    const email = searchParams.get('email');

    if (uid) setCreatorId(uid);
    if (email) setCreatorEmail(email);
  }, [location]);

  const activeStep = useMemo(
    () => FORM_STEPS.find((item) => item.id === step) || FORM_STEPS[0],
    [step]
  );

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
    if (step === 1 && !formData.nome.trim()) {
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
      await persistDraft(step === FORM_STEPS.length ? 'completed' : 'draft');
      if (step < FORM_STEPS.length) {
        setStep((prev) => prev + 1);
      }
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
    if (step === 1) {
      return (
        <>
          {renderField('Nome completo', 'nome', { required: true, full: true, placeholder: 'Nome do eleitor' })}
          {renderField('Apelido', 'apelido', { placeholder: 'Como gosta de ser chamado(a)' })}

          <label className="public-form-field">
            <span className="public-form-label">Sexo</span>
            <select name="sexo" value={formData.sexo} onChange={handleChange} className="public-form-select eleitor-form-input eleitor-form-select">
              <option value="">Selecione</option>
              <option value="Masculino">Masculino</option>
              <option value="Feminino">Feminino</option>
              <option value="Outro">Outro</option>
            </select>
          </label>

          {renderField('Data de nascimento', 'nascimento', { type: 'date' })}
        </>
      );
    }

    if (step === 2) {
      return (
        <>
          {renderField('E-mail', 'email', { type: 'email', placeholder: 'voce@email.com', full: true })}
          {renderField('Telefone', 'telefone', { masked: true, placeholder: '(00) 00000-0000', full: true })}
        </>
      );
    }

    if (step === 3) {
      return (
        <>
          {renderField('CPF', 'cpf', { masked: true, placeholder: '000.000.000-00', full: true })}
          {renderField('Título de eleitor', 'titulo', { masked: true, onBlur: checkTitulo, placeholder: 'Apenas números', full: true })}
          <div className="eleitor-form-inline-two full">
            {renderField('Zona', 'zona', { masked: true, onBlur: checkLocalVotacao, placeholder: '000' })}
            {renderField('Seção', 'secao', { masked: true, placeholder: '0000' })}
          </div>
          <label className="public-form-field full">
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
          </label>
        </>
      );
    }

    if (step === 4) {
      return (
        <>
          {renderField('CEP', 'cep', { masked: true, onBlur: checkCep, placeholder: cepLoading ? 'Buscando...' : '00000-000' })}
          {renderField('Endereço', 'endereco')}
          {renderField('Número', 'numero')}
          {renderField('Bairro', 'bairro')}
          {renderField('Cidade', 'cidade')}
          {renderField('Estado', 'estado')}
        </>
      );
    }

    if (step === 5) {
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

    return (
      <>{renderField('Instagram', 'instagram', { placeholder: '@usuario', full: true })}</>
    );
  };

  if (success) {
    return (
      <PublicPageShell
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
          <button type="button" className="btn-primary public-primary-cta" onClick={() => setSuccess(false)}>
            Cadastrar novo eleitor
          </button>
        </div>
      </PublicPageShell>
    );
  }

  return (
    <PublicPageShell
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
              Passo {step} de {FORM_STEPS.length}
            </span>
            <h3 className="eleitor-form-step-title">{activeStep.title}</h3>
            <p>{activeStep.subtitle}</p>
          </div>

          <div className="eleitor-form-progress-line" aria-label="Progresso do formulário">
            {FORM_STEPS.map((item) => (
              <div key={item.id} className={`eleitor-form-progress-item ${step >= item.id ? 'active' : ''}`}>
                <span>{item.title}</span>
              </div>
            ))}
          </div>

          <form onSubmit={step === FORM_STEPS.length ? handleSave : handleNext} className="public-form-grid eleitor-form-grid">
            {renderStepFields()}

            <div className="public-form-field full eleitor-form-submit eleitor-form-actions">
              {step > 1 ? (
                <button type="button" className="btn-secondary" onClick={() => setStep((prev) => prev - 1)} disabled={saving}>
                  <ArrowLeft size={18} />
                  Voltar
                </button>
              ) : (
                <span />
              )}

              <button type="submit" className="btn-primary public-primary-cta" disabled={saving}>
                {saving ? 'Salvando...' : step === FORM_STEPS.length ? 'Finalizar cadastro' : 'Próximo passo'}
                {!saving ? (step === FORM_STEPS.length ? <CheckCircle size={18} /> : <ArrowRight size={18} />) : null}
              </button>
            </div>
          </form>
        </article>

        <aside className="public-info-card eleitor-form-side-card">
          <div className="eleitor-form-section-head">
            <span className="public-kicker">
              <ShieldCheck size={16} />
              Orientação
            </span>
            <p>O painel lateral foi reorganizado para guiar o cadastro sem poluir a leitura nem estourar o layout.</p>
          </div>

          <div className="campaign-notes-list eleitor-form-note-list">
            <div className="campaign-note-item eleitor-form-tip-card">
              <strong>Priorize telefone e zona</strong>
              <p>Esses campos aceleram a ativação de campo, o funil e a organização territorial.</p>
            </div>
            <div className="campaign-note-item eleitor-form-tip-card">
              <strong>Use endereço completo</strong>
              <p>CEP, bairro e cidade fortalecem mapas, visitas e filtros estratégicos.</p>
            </div>
            <div className="campaign-note-item eleitor-form-tip-card">
              <strong>Evite duplicidade</strong>
              <p>Se já existir cadastro prévio, prefira complementar as informações com o responsável pela base.</p>
            </div>
          </div>
        </aside>
      </div>
    </PublicPageShell>
  );
}
