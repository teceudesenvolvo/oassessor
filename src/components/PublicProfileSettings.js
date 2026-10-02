import React, { useCallback, useEffect, useState } from 'react';
import { ChevronDown, Copy, ExternalLink, ImagePlus, Save, Share2, Users, ArrowRight, X } from 'lucide-react';
import { equalTo, get, orderByChild, query, ref, remove, set, update } from '../services/firestoreDatabase';
import { database, storage } from '../firebaseConfig';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { useAuth } from '../useAuth';
import PublicPageBuilder from './PublicPageBuilder';

const slugify = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
const RESERVED_PROFILE_SLUGS = new Set(['plan', 'plans', 'about', 'contact', 'checkout', 'eleitor-form', 'download-app', 'convert-csv', 'login', 'cadastro-assessor-equipe', 'dashboard', 'p', 'favicon-ico', 'logo192-png', 'logo512-png', 'manifest-json', 'robots-txt']);

const VOTER_FORM_FIELDS = [
  { id: 'nome', label: 'Nome completo', group: 'Identificação', required: true },
  { id: 'apelido', label: 'Apelido', group: 'Identificação' },
  { id: 'sexo', label: 'Sexo', group: 'Identificação' },
  { id: 'nascimento', label: 'Data de nascimento', group: 'Identificação' },
  { id: 'email', label: 'E-mail', group: 'Contato' },
  { id: 'telefone', label: 'Telefone', group: 'Contato' },
  { id: 'cpf', label: 'CPF', group: 'Dados eleitorais' },
  { id: 'titulo', label: 'Título de eleitor', group: 'Dados eleitorais' },
  { id: 'zona', label: 'Zona eleitoral', group: 'Dados eleitorais' },
  { id: 'secao', label: 'Seção eleitoral', group: 'Dados eleitorais' },
  { id: 'localVotacao', label: 'Local de votação', group: 'Dados eleitorais' },
  { id: 'cep', label: 'CEP', group: 'Endereço' },
  { id: 'endereco', label: 'Endereço', group: 'Endereço' },
  { id: 'numero', label: 'Número', group: 'Endereço' },
  { id: 'bairro', label: 'Bairro', group: 'Endereço' },
  { id: 'cidade', label: 'Cidade', group: 'Endereço' },
  { id: 'estado', label: 'Estado', group: 'Endereço' },
  { id: 'observacoes', label: 'Observações', group: 'Outros' },
  { id: 'instagram', label: 'Instagram', group: 'Outros' }
];

const DEFAULT_VOTER_FORM_FIELDS = VOTER_FORM_FIELDS.filter(({ id }) => ['nome', 'email', 'telefone'].includes(id)).map(({ id }) => id);
const DEFAULT_PAGE_COLORS = { background: '#071326', card: '#16243a', text: '#f7fafc', mutedText: '#b9c5d3', button: '#50d59a', buttonText: '#09203a' };
const LIGHT_PAGE_COLORS = { background: '#f1f5f9', card: '#ffffff', text: '#0f172a', mutedText: '#475569', button: '#0f9f6e', buttonText: '#ffffff' };
const DEFAULT_HERO_BUTTON_COLORS = { community: { background: '#50d59a', text: '#09203a' }, demand: { background: '#16243a', text: '#ffffff' } };
const LIGHT_HERO_BUTTON_COLORS = { community: { background: '#0f9f6e', text: '#ffffff' }, demand: { background: '#ffffff', text: '#0f172a' } };
const PAGE_COLOR_FIELDS = [
  { id: 'background', label: 'Fundo da página' },
  { id: 'card', label: 'Fundo dos cards' },
  { id: 'text', label: 'Títulos e textos' },
  { id: 'mutedText', label: 'Textos secundários' },
  { id: 'button', label: 'Botões e destaques' },
  { id: 'buttonText', label: 'Texto dos botões' }
];
const validHex = (value, fallback) => /^#[0-9a-f]{6}$/i.test(value || '') ? value : fallback;
const getPageStyle = (profile) => {
  const colors = profile.pageColors || (profile.pageTheme === 'light' ? LIGHT_PAGE_COLORS : DEFAULT_PAGE_COLORS);
  const heroDefaults = profile.pageTheme === 'light' ? LIGHT_HERO_BUTTON_COLORS : DEFAULT_HERO_BUTTON_COLORS;
  const heroColors = profile.heroButtonColors || {};
  return {
    '--page-background': colors.background,
    '--page-card': colors.card,
    '--page-text': colors.text,
    '--page-muted-text': colors.mutedText,
    '--page-button': colors.button,
    '--page-button-text': colors.buttonText,
    '--community-button': heroColors.community?.background || heroDefaults.community.background,
    '--community-button-text': heroColors.community?.text || heroDefaults.community.text,
    '--demand-button': heroColors.demand?.background || heroDefaults.demand.background,
    '--demand-button-text': heroColors.demand?.text || heroDefaults.demand.text
  };
};

function SettingsAccordion({ title, summary, open, onToggle, children }) {
  return <section className={`public-settings-accordion ${open ? 'is-open' : ''}`}>
    <button type="button" className="public-settings-accordion-toggle" aria-expanded={open} onClick={() => onToggle(!open)}>
      <span><strong>{title}</strong>{summary ? <small>{summary}</small> : null}</span>
      <ChevronDown size={19} />
    </button>
    {open ? <div className="public-settings-accordion-content">{children}</div> : null}
  </section>;
}

export default function PublicProfileSettings() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({ name: '', slug: '', headline: '', bio: '', city: '', state: '', photoUrl: '', logoUrl: '', instagram: '', completionButtonLabel: 'Entrar no grupo de apoio', completionButtonUrl: '', voterFormFields: DEFAULT_VOTER_FORM_FIELDS, pageTheme: 'dark', pageColors: DEFAULT_PAGE_COLORS, heroButtonColors: DEFAULT_HERO_BUTTON_COLORS, enabled: true, blocks: [] });
  const [originalSlug, setOriginalSlug] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [openSections, setOpenSections] = useState({ profile: true });
  const [slugAvailability, setSlugAvailability] = useState({ status: 'idle', message: '' });

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      try {
        const userSnapshot = await get(ref(database, `users/${user.uid}`));
        const userData = userSnapshot.val() || {};
        const candidateSlug = userData.publicProfileSlug || slugify(userData.name || userData.nome || user.displayName || `vereador-${user.uid.slice(0, 6)}`);
        const publicSnapshot = await get(ref(database, `publicProfiles/${candidateSlug}`));
        const saved = publicSnapshot.val() || {};
        if (!active) return;
        setOriginalSlug(publicSnapshot.exists() ? candidateSlug : '');
        setProfile({
          name: saved.name || userData.name || userData.nome || user.displayName || '',
          slug: candidateSlug,
          headline: saved.headline || userData.cargo || 'Vereador(a)',
          bio: saved.bio || '', city: saved.city || userData.cidade || '', state: saved.state || userData.estado || '',
          photoUrl: saved.photoUrl || userData.photoUrl || '', instagram: saved.instagram || '',
          logoUrl: saved.logoUrl || '',
          completionButtonLabel: saved.completionButtonLabel || 'Entrar no grupo de apoio',
          completionButtonUrl: saved.completionButtonUrl || '',
          voterFormFields: Array.isArray(saved.voterFormFields) ? [...new Set(['nome', ...saved.voterFormFields.filter((field) => VOTER_FORM_FIELDS.some((item) => item.id === field))])] : DEFAULT_VOTER_FORM_FIELDS,
          pageTheme: saved.pageTheme === 'light' ? 'light' : 'dark',
          pageColors: Object.fromEntries(Object.entries(DEFAULT_PAGE_COLORS).map(([key, fallback]) => [key, validHex(saved.pageColors?.[key], fallback)])),
          heroButtonColors: Object.fromEntries(['community', 'demand'].map((key) => [key, {
            background: /^#[0-9a-f]{6}$/i.test(saved.heroButtonColors?.[key]?.background || '') ? saved.heroButtonColors[key].background : '',
            text: /^#[0-9a-f]{6}$/i.test(saved.heroButtonColors?.[key]?.text || '') ? saved.heroButtonColors[key].text : ''
          }])),
          enabled: saved.enabled !== false, blocks: Array.isArray(saved.blocks) ? saved.blocks : []
        });
        if (publicSnapshot.exists()) {
          const responsesSnapshot = await get(query(ref(database, 'publicSubmissions'), orderByChild('adminId'), equalTo(user.uid)));
          const responses = responsesSnapshot.val() || {};
          setSubmissions(Object.entries(responses).map(([id, value]) => ({ id, ...value }))
            .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))).slice(0, 10));
        }
      } catch (error) {
        console.error('Erro ao carregar perfil público:', error);
        if (active) setMessage('Não foi possível carregar o perfil público.');
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [user]);

  const normalizedSlug = slugify(profile.slug);
  const checkSlugAvailability = useCallback(async (slug) => {
    if (!slug) return { available: false, message: 'Informe um nome de usuário.' };
    if (RESERVED_PROFILE_SLUGS.has(slug)) return { available: false, message: 'Esse endereço é reservado pelo portal. Escolha outro.' };
    const [directSnapshot, matchingSlugs] = await Promise.all([
      get(ref(database, `publicProfiles/${slug}`)),
      get(query(ref(database, 'publicProfiles'), orderByChild('slug'), equalTo(slug)))
    ]);
    const directProfile = directSnapshot.val();
    if (directSnapshot.exists() && directProfile?.userId !== user.uid) return { available: false, message: 'Esse nome de usuário já está em uso.' };
    const duplicate = Object.entries(matchingSlugs.val() || {}).some(([, item]) => item?.userId !== user.uid);
    return duplicate
      ? { available: false, message: 'Esse nome de usuário já está em uso.' }
      : { available: true, message: 'Nome de usuário disponível.' };
  }, [user]);

  useEffect(() => {
    if (!user || !normalizedSlug) { setSlugAvailability({ status: 'idle', message: '' }); return undefined; }
    let active = true;
    const timer = window.setTimeout(async () => {
      setSlugAvailability({ status: 'checking', message: 'Verificando disponibilidade...' });
      try {
        const result = await checkSlugAvailability(normalizedSlug);
        if (active) setSlugAvailability({ status: result.available ? 'available' : 'unavailable', message: result.message });
      } catch (error) {
        console.error('Erro ao verificar endereço público:', error);
        if (active) setSlugAvailability({ status: 'error', message: 'Não foi possível verificar agora.' });
      }
    }, 300);
    return () => { active = false; window.clearTimeout(timer); };
  }, [checkSlugAvailability, normalizedSlug, user, originalSlug]);

  const publicUrl = profile.slug ? `${window.location.origin}/${profile.slug}` : '';
  const save = async (event) => {
    event.preventDefault();
    if (!user || !profile.name.trim()) { setMessage('Informe o nome público.'); return; }
    const slug = slugify(profile.slug);
    if (!slug) { setMessage('Escolha um endereço público válido.'); return; }
    if (profile.photoFile && (!profile.photoFile.type.startsWith('image/') || profile.photoFile.size > 8 * 1024 * 1024)) { setMessage('Escolha uma imagem de até 8 MB.'); return; }
    if (profile.logoFile && (!profile.logoFile.type.startsWith('image/') || profile.logoFile.size > 8 * 1024 * 1024)) { setMessage('Escolha uma logomarca de até 8 MB.'); return; }
    if (profile.blocks.some((block) => block.imageFile && (!block.imageFile.type.startsWith('image/') || block.imageFile.size > 8 * 1024 * 1024))) { setMessage('As imagens dos blocos devem ter até 8 MB.'); return; }
    setSaving(true); setMessage('');
    try {
      const availability = await checkSlugAvailability(slug);
      if (!availability.available) { setMessage(availability.message); setSlugAvailability({ status: 'unavailable', message: availability.message }); setSaving(false); return; }
      const { email: _email, ...publicFields } = profile;
      if (publicFields.blocks.some((block) => block.imageFile)) {
        publicFields.blocks = await Promise.all(publicFields.blocks.map(async (block) => {
          if (!block.imageFile) return block;
          const imagePath = `publicProfiles/${user.uid}/blocks/${Date.now()}-${block.imageFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
          const imageRef = storageRef(storage, imagePath);
          await uploadBytes(imageRef, block.imageFile, { contentType: block.imageFile.type });
          return { ...block, imageUrl: await getDownloadURL(imageRef), imagePath, imageFile: undefined };
        }));
      }
      if (profile.photoFile) {
        const imagePath = `publicProfiles/${user.uid}/portrait-${Date.now()}-${profile.photoFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const imageRef = storageRef(storage, imagePath);
        await uploadBytes(imageRef, profile.photoFile, { contentType: profile.photoFile.type });
        publicFields.photoUrl = await getDownloadURL(imageRef);
        publicFields.photoPath = imagePath;
        delete publicFields.photoFile;
      }
      if (profile.logoFile) {
        const logoPath = `publicProfiles/${user.uid}/logo-${Date.now()}-${profile.logoFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const logoRef = storageRef(storage, logoPath);
        await uploadBytes(logoRef, profile.logoFile, { contentType: profile.logoFile.type });
        publicFields.logoUrl = await getDownloadURL(logoRef);
        publicFields.logoPath = logoPath;
        delete publicFields.logoFile;
      }
      const data = { ...publicFields, name: profile.name.trim(), slug, userId: user.uid, enabled: !!profile.enabled, updatedAt: new Date().toISOString() };
      await set(ref(database, `publicProfiles/${slug}`), data);
      const userRef = ref(database, `users/${user.uid}`);
      const userSnapshot = await get(userRef);
      await set(userRef, { ...(userSnapshot.val() || {}), publicProfileSlug: slug });
      if (originalSlug && originalSlug !== slug) {
        const responseSnapshot = await get(query(ref(database, 'publicSubmissions'), orderByChild('adminId'), equalTo(user.uid)));
        for (const [id, response] of Object.entries(responseSnapshot.val() || {})) {
          await update(ref(database, `publicSubmissions/${id}`), { ...response, profileSlug: slug });
        }
        await remove(ref(database, `publicProfiles/${originalSlug}`));
      }
      setOriginalSlug(slug); setProfile((prev) => ({ ...prev, ...publicFields, slug, photoFile: null, logoFile: null })); setMessage('Perfil público salvo.');
    } catch (error) {
      console.error('Erro ao salvar perfil público:', error);
      setMessage(error?.code === 'storage/unauthorized'
        ? 'O Firebase Storage bloqueou o upload. Publique as regras atualizadas de storage.rules e tente novamente.'
        : 'Não foi possível salvar. Tente novamente.');
    } finally { setSaving(false); }
  };

  const copyLink = async () => {
    if (!originalSlug) { setMessage('Salve o perfil para copiar o link.'); return; }
    try { await navigator.clipboard.writeText(publicUrl); setMessage('Link copiado.'); }
    catch { setMessage(publicUrl); }
  };

  if (loading) return <div className="campaign-empty-state">Carregando perfil público...</div>;
  return (
    <div className="public-profile-editor-layout">
    <form onSubmit={save} className="public-profile-settings public-profile-editor-sidebar">
      <div className="public-profile-editor-content">
      <div className="public-editor-heading"><div><span className="public-editor-eyebrow">EDITOR DA PÁGINA</span><h2>Monte seu perfil público</h2><p>Organize a apresentação, adicione conteúdo e veja o resultado ao lado.</p></div><span className={profile.enabled ? 'public-editor-state is-live' : 'public-editor-state'}>{profile.enabled ? 'Publicado' : 'Rascunho'}</span></div>
      <SettingsAccordion title="Apresentação do perfil" summary="Nome, endereço público, redes sociais, foto e logomarca" open={!!openSections.profile} onToggle={(open) => setOpenSections((current) => ({ ...current, profile: open }))}>
      <div className="campaign-filters-grid">
        <label className="funnel-filter-field"><span>Nome público</span><input className="campaign-filter-select" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required /></label>
        <label className="funnel-filter-field"><span>Como quer ser apresentado</span><input className="campaign-filter-select" value={profile.headline} onChange={(e) => setProfile({ ...profile, headline: e.target.value })} placeholder="Vereador(a)" /></label>
        <label className="funnel-filter-field"><span>Nome de usuário do perfil</span><div className="public-profile-slug"><span>/</span><input className="campaign-filter-select" value={profile.slug} onChange={(e) => setProfile({ ...profile, slug: slugify(e.target.value) })} /></div>{slugAvailability.message ? <small className={`public-slug-status is-${slugAvailability.status}`} role="status">{slugAvailability.message}</small> : null}</label>
        <label className="funnel-filter-field"><span>Município</span><input className="campaign-filter-select" value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} /></label>
        <label className="funnel-filter-field"><span>Estado</span><input className="campaign-filter-select" maxLength={2} value={profile.state} onChange={(e) => setProfile({ ...profile, state: e.target.value.toUpperCase() })} /></label>
        <label className="funnel-filter-field"><span>Instagram</span><input className="campaign-filter-select" value={profile.instagram} onChange={(e) => setProfile({ ...profile, instagram: e.target.value })} placeholder="@seuperfil" /></label>
        <label className="funnel-filter-field public-profile-bio"><span>Apresentação</span><textarea className="campaign-filter-select" rows="4" value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} placeholder="Conte um pouco sobre seu trabalho e como atende a comunidade." /></label>
        <div className="funnel-filter-field public-profile-bio"><span>Foto do perfil</span><label className="public-photo-upload"><ImagePlus size={17} /> {profile.photoFile?.name || 'Enviar foto'}<input type="file" accept="image/*" onChange={(event) => setProfile({ ...profile, photoFile: event.target.files?.[0] || null, photoUrl: event.target.files?.[0] ? URL.createObjectURL(event.target.files[0]) : profile.photoUrl })} /></label></div>
        <div className="funnel-filter-field public-profile-bio"><span>Logomarca do cabeçalho</span><label className="public-photo-upload"><ImagePlus size={17} /> {profile.logoFile?.name || (profile.logoUrl ? 'Alterar logomarca' : 'Enviar logomarca')}<input type="file" accept="image/*" onChange={(event) => setProfile({ ...profile, logoFile: event.target.files?.[0] || null, logoUrl: event.target.files?.[0] ? URL.createObjectURL(event.target.files[0]) : profile.logoUrl })} /></label>{profile.logoUrl ? <div className="public-logo-preview"><img src={profile.logoUrl} alt="Prévia da logomarca" /><button type="button" onClick={() => setProfile((current) => ({ ...current, logoFile: null, logoUrl: '' }))}><X size={14} /> Remover</button></div> : <small>Imagem de até 8 MB. Ela aparecerá no cabeçalho público.</small>}</div>
      </div>
      </SettingsAccordion>
      <SettingsAccordion title="Botão após cadastro de eleitor" summary="Configure o convite exibido ao concluir o cadastro" open={!!openSections.completion} onToggle={(open) => setOpenSections((current) => ({ ...current, completion: open }))}>
        <div className="campaign-filters-grid"><label className="funnel-filter-field"><span>Texto do botão</span><input className="campaign-filter-select" maxLength={80} value={profile.completionButtonLabel || ''} onChange={(event) => setProfile({ ...profile, completionButtonLabel: event.target.value })} placeholder="Entrar no grupo de apoio" /></label><label className="funnel-filter-field"><span>Link do botão (opcional)</span><input className="campaign-filter-select" type="url" value={profile.completionButtonUrl || ''} onChange={(event) => setProfile({ ...profile, completionButtonUrl: event.target.value })} placeholder="https://chat.whatsapp.com/..." /></label></div>
      </SettingsAccordion>
      <SettingsAccordion title="Campos do cadastro de eleitor" summary="Escolha quais dados serão solicitados no formulário" open={!!openSections.voterFields} onToggle={(open) => setOpenSections((current) => ({ ...current, voterFields: open }))}>
        <p className="public-settings-accordion-description">Nome completo é obrigatório para identificar o cadastro.</p><div className="public-voter-fields-grid">{VOTER_FORM_FIELDS.map((field) => <label className="public-voter-field-option" key={field.id}><input type="checkbox" checked={(profile.voterFormFields || DEFAULT_VOTER_FORM_FIELDS).includes(field.id)} disabled={field.required} onChange={(event) => setProfile((current) => ({ ...current, voterFormFields: event.target.checked ? [...new Set([...(current.voterFormFields || DEFAULT_VOTER_FORM_FIELDS), field.id])] : (current.voterFormFields || DEFAULT_VOTER_FORM_FIELDS).filter((id) => id !== field.id) }))} /><span>{field.label}{field.required ? ' · obrigatório' : ''}</span><small>{field.group}</small></label>)}</div><button type="button" className="btn-secondary" onClick={() => setProfile((current) => ({ ...current, voterFormFields: [...DEFAULT_VOTER_FORM_FIELDS] }))}>Usar campos essenciais</button>
      </SettingsAccordion>
      <SettingsAccordion title="Aparência da página" summary="Tema, paleta e cores dos botões principais" open={!!openSections.appearance} onToggle={(open) => setOpenSections((current) => ({ ...current, appearance: open }))}>
        <p className="public-settings-accordion-description">Escolha o tema e personalize as cores do fundo, dos cards, dos textos e dos botões.</p><div className="public-theme-options"><label><input type="radio" name="pageTheme" value="dark" checked={(profile.pageTheme || 'dark') === 'dark'} onChange={() => setProfile((current) => ({ ...current, pageTheme: 'dark', pageColors: { ...DEFAULT_PAGE_COLORS }, heroButtonColors: { community: { background: '', text: '' }, demand: { background: '', text: '' } } }))} /> Tema escuro</label><label><input type="radio" name="pageTheme" value="light" checked={profile.pageTheme === 'light'} onChange={() => setProfile((current) => ({ ...current, pageTheme: 'light', pageColors: { ...LIGHT_PAGE_COLORS }, heroButtonColors: { community: { background: '', text: '' }, demand: { background: '', text: '' } } }))} /> Tema claro</label></div><div className="public-page-color-grid">{PAGE_COLOR_FIELDS.map(({ id, label }) => <label className="public-page-color-option" key={id}><span>{label}</span><input type="color" value={profile.pageColors?.[id] || (profile.pageTheme === 'light' ? LIGHT_PAGE_COLORS[id] : DEFAULT_PAGE_COLORS[id])} onChange={(event) => setProfile((current) => ({ ...current, pageColors: { ...DEFAULT_PAGE_COLORS, ...(current.pageColors || {}), [id]: event.target.value } }))} /></label>)}</div><button type="button" className="btn-secondary" onClick={() => setProfile((current) => ({ ...current, pageColors: { ...(current.pageTheme === 'light' ? LIGHT_PAGE_COLORS : DEFAULT_PAGE_COLORS) }, heroButtonColors: { community: { background: '', text: '' }, demand: { background: '', text: '' } }, blocks: (current.blocks || []).map((block) => ({ ...block, buttonColor: '', buttonTextColor: '' })) }))}>Restaurar cores padrão</button><div className="public-individual-buttons"><strong>Cores dos botões principais</strong>{[{ id: 'community', label: 'Fazer parte da comunidade' }, { id: 'demand', label: 'Enviar uma demanda' }].map(({ id, label }) => <div className="public-individual-button-row" key={id}><span>{label}</span><label>Fundo<input type="color" value={profile.heroButtonColors?.[id]?.background || (profile.pageTheme === 'light' ? LIGHT_HERO_BUTTON_COLORS : DEFAULT_HERO_BUTTON_COLORS)[id].background} onChange={(event) => setProfile((current) => ({ ...current, heroButtonColors: { ...(current.heroButtonColors || {}), [id]: { ...(current.heroButtonColors?.[id] || {}), background: event.target.value } } }))} /></label><label>Texto<input type="color" value={profile.heroButtonColors?.[id]?.text || (profile.pageTheme === 'light' ? LIGHT_HERO_BUTTON_COLORS : DEFAULT_HERO_BUTTON_COLORS)[id].text} onChange={(event) => setProfile((current) => ({ ...current, heroButtonColors: { ...(current.heroButtonColors || {}), [id]: { ...(current.heroButtonColors?.[id] || {}), text: event.target.value } } }))} /></label></div>)}</div>
      </SettingsAccordion>
      <SettingsAccordion title="Publicação e respostas" summary={originalSlug ? publicUrl : 'Publique o perfil para compartilhar o endereço'} open={!!openSections.publication} onToggle={(open) => setOpenSections((current) => ({ ...current, publication: open }))}>
        <label className="public-profile-enabled"><input type="checkbox" checked={profile.enabled} onChange={(e) => setProfile({ ...profile, enabled: e.target.checked })} /> Perfil publicado</label>
        {originalSlug ? <p className="public-profile-link"><Share2 size={15} /> {publicUrl}</p> : null}
        {submissions.length ? <section className="public-builder-responses"><div><strong>Respostas recebidas</strong><span>Últimos {submissions.length} envios dos seus formulários.</span></div>{submissions.map((submission) => <article key={submission.id}><header><strong>{submission.formTitle || 'Formulário'}</strong><time>{new Date(submission.createdAt).toLocaleString('pt-BR')}</time></header><dl>{Object.entries(submission.answers || {}).map(([label, value]) => <React.Fragment key={label}><dt>{label}</dt><dd>{value || '—'}</dd></React.Fragment>)}</dl></article>)}</section> : <p className="public-settings-accordion-description">As respostas dos formulários aparecerão aqui.</p>}
      </SettingsAccordion>
      <SettingsAccordion title="Conteúdo da página" summary="Adicione textos, imagens, links, formulários e atalhos" open={!!openSections.content} onToggle={(open) => setOpenSections((current) => ({ ...current, content: open }))}>
        <PublicPageBuilder blocks={profile.blocks} selectedBlockId={selectedBlockId} onSelectBlock={(blockId) => { setSelectedBlockId(blockId); setOpenSections((current) => ({ ...current, content: true })); }} onChange={(blocks) => setProfile((current) => ({ ...current, blocks }))} />
      </SettingsAccordion>
      </div>
      <div className="funnel-modal-actions">
        <span role="status">{message}</span>
        <div className="public-profile-action-row">
          <div className="public-profile-actions"><button type="button" className="btn-secondary" onClick={copyLink} disabled={!originalSlug}><Copy size={16} /> Copiar link</button><a className={`btn-secondary ${!originalSlug ? 'is-disabled' : ''}`} href={originalSlug ? publicUrl : undefined} target="_blank" rel="noreferrer" aria-disabled={!originalSlug} onClick={(event) => { if (!originalSlug) { event.preventDefault(); setMessage('Salve o perfil para abrir a página.'); } }}><ExternalLink size={16} /> Abrir página</a></div>
          <button className="btn-primary" type="submit" disabled={saving}><Save size={16} /> {saving ? 'Salvando...' : 'Salvar perfil'}</button>
        </div>
      </div>
    </form>
    <aside className="public-profile-live-preview"><div className="public-preview-toolbar"><span><i /> Prévia ao vivo</span><a href={publicUrl || '#'} target="_blank" rel="noreferrer">Abrir página <ExternalLink size={14} /></a></div><div className="public-preview-canvas"><div className={`public-preview-page theme-${profile.pageTheme || 'dark'}`} style={getPageStyle(profile)}><header className="public-preview-top"><div className="public-preview-brand">{profile.logoUrl ? <img src={profile.logoUrl} alt="Logomarca" /> : <><b>oa</b><span>{profile.name || 'oAssessor'}<small>Perfil público</small></span></>}</div><span>{[profile.city, profile.state].filter(Boolean).join(' / ') || 'Sua cidade'}</span></header><section className="public-preview-hero"><div className="public-preview-hero-copy"><span className="public-preview-chip">{profile.headline || 'Vereador(a)'}</span><h1>{profile.name || 'Seu nome público'}</h1><p>{profile.bio || 'Apresente seu trabalho e convide a comunidade para participar.'}</p><div className="public-preview-hero-actions"><span style={{ '--shortcut-button': profile.heroButtonColors?.community?.background || undefined, '--shortcut-button-text': profile.heroButtonColors?.community?.text || undefined }}><Users size={17} /> Cadastre-se</span><span style={{ '--shortcut-button': profile.heroButtonColors?.demand?.background || undefined, '--shortcut-button-text': profile.heroButtonColors?.demand?.text || undefined }}><ArrowRight size={17} /> Envie uma demanda</span></div></div>{profile.photoUrl ? <img src={profile.photoUrl} alt="Prévia do perfil" /> : <div className="public-preview-avatar">{(profile.name || 'V').slice(0, 1)}</div>}</section><h2 className="public-preview-section-title">Como podemos ajudar?</h2><div className="public-preview-blocks">{(profile.blocks || []).map((block, index) => { const blockId = block.id || `block-index-${index}`; return <button type="button" className={`public-preview-block type-${block.type} ${selectedBlockId === blockId ? 'is-selected' : ''}`} style={{ '--shortcut-button': block.buttonColor || undefined, '--shortcut-button-text': block.buttonTextColor || undefined }} key={blockId} onClick={() => { setSelectedBlockId(blockId); setOpenSections((current) => ({ ...current, content: true })); }} aria-label={`Editar ${block.title || block.type}`}>{block.type === 'image' && block.imageUrl ? <img src={block.imageUrl} alt="" /> : null}{block.type === 'text' && block.imageUrl ? <img src={block.imageUrl} alt="" /> : null}<strong>{block.title || ({ text: 'Seu texto', image: 'Imagem', link: 'Acessar link', demandForm: 'Envie uma demanda', voterForm: 'Cadastre-se como eleitor', appointment: 'Agende um atendimento', customForm: 'Formulário' }[block.type] || 'Conteúdo')}</strong>{block.content || block.description ? <p>{block.content || block.description}</p> : null}{['demandForm', 'voterForm', 'appointment', 'customForm', 'link'].includes(block.type) ? <ArrowRight size={17} /> : null}</button>; })}</div><footer className="public-preview-footer">Acompanhe o trabalho de {profile.name || 'seu vereador'}</footer></div></div></aside>
    </div>
  );
}
