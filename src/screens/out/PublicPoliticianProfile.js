import React, { useEffect, useState } from 'react';
import { ArrowRight, CalendarClock, CheckCircle, Instagram, MapPin, Send, UserRound, Users, X } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { equalTo, get, orderByChild, push, query, ref, set } from '../../services/firestoreDatabase';
import { database } from '../../firebaseConfig';
import PublicPageShell from '../../components/PublicPageShell';

const safeExternalUrl = (value) => /^https?:\/\//i.test(String(value || '').trim()) ? value.trim() : '';

function PublicCustomForm({ block, profile, slug }) {
  const [answers, setAnswers] = useState({});
  const [sent, setSent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const shortcutStyle = { '--shortcut-button': block.buttonColor || undefined, '--shortcut-button-text': block.buttonTextColor || undefined };
  const fields = Array.isArray(block.fields) ? block.fields : [];
  const submit = async (event) => {
    event.preventDefault();
    if (saving || sent) return;
    setSaving(true);
    try {
      const submissionRef = push(ref(database, 'publicSubmissions'));
      const labeledAnswers = Object.fromEntries(fields.map((field, index) => [field.label || `Campo ${index + 1}`, answers[field.id] || '']));
      await set(submissionRef, {
        profileSlug: slug, adminId: profile.userId, blockId: block.id || '',
        formTitle: block.title || 'Formulário', answers: labeledAnswers, createdAt: new Date().toISOString(), origin: 'public_profile'
      });
      setSent(true);
    } catch (error) {
      console.error('Erro ao enviar formulário público:', error);
      alert('Não foi possível enviar. Tente novamente.');
    } finally { setSaving(false); }
  };
  return <>
    <button type="button" className="public-action-link public-custom-form-trigger" style={shortcutStyle} onClick={() => setOpen(true)}>
      <Send size={19} /><span><strong>{sent ? 'Formulário enviado' : 'Preencher formulário'}</strong><small>{sent ? 'Obrigado por entrar em contato.' : 'Clique para abrir e enviar sua resposta.'}</small></span><ArrowRight size={18} />
    </button>
    {open ? <div className="public-form-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="public-form-modal" role="dialog" aria-modal="true" aria-labelledby={`public-form-title-${block.id || 'custom'}`}>
        <header><div><span>FALE COM O GABINETE</span><h2 id={`public-form-title-${block.id || 'custom'}`}>{block.title || 'Formulário'}</h2>{block.description ? <p>{block.description}</p> : null}</div><button type="button" aria-label="Fechar formulário" onClick={() => setOpen(false)}><X size={19} /></button></header>
        {sent ? <div className="public-custom-form-success"><CheckCircle size={22} /> Resposta enviada. Obrigado!</div> : <form className="public-custom-form" onSubmit={submit}>
          {fields.map((field, index) => <label className="public-custom-field" key={field.id || index}><span>{field.label || 'Campo'}{field.required ? ' *' : ''}</span>
            {field.type === 'textarea' ? <textarea required={!!field.required} maxLength={2000} value={answers[field.id] || ''} onChange={(event) => setAnswers((current) => ({ ...current, [field.id]: event.target.value }))} /> :
              <input type={['email', 'tel'].includes(field.type) ? field.type : 'text'} required={!!field.required} maxLength={250} value={answers[field.id] || ''} onChange={(event) => setAnswers((current) => ({ ...current, [field.id]: event.target.value }))} />}
          </label>)}
          <button type="submit" className="btn-primary public-primary-cta" style={shortcutStyle} disabled={saving}><Send size={16} /> {saving ? 'Enviando...' : block.submitLabel || 'Enviar'}</button>
        </form>}
      </section>
    </div> : null}
  </>;
}

export default function PublicPoliticianProfile() {
  const { slug } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setProfile(null);
    setLoadError(false);
    (async () => {
      try {
        let snapshot = await get(ref(database, `publicProfiles/${slug}`));
        let publicProfile = snapshot.exists() ? snapshot.val() : null;
        // Compatibilidade com perfis antigos gravados com outro ID de documento.
        if (!publicProfile) {
          const legacySnapshot = await get(query(ref(database, 'publicProfiles'), orderByChild('slug'), equalTo(slug)));
          const matches = Object.values(legacySnapshot.val() || {});
          publicProfile = matches[0] || null;
        }
        if (active) setProfile(publicProfile && publicProfile.enabled !== false ? publicProfile : null);
      } catch (error) {
        console.error('Erro ao carregar perfil público:', error);
        if (active) setLoadError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [slug]);

  if (loading) return <PublicPageShell hideNav kicker="Perfil público" title="Carregando perfil" subtitle=""><div className="public-empty">Aguarde um instante...</div></PublicPageShell>;
  if (!profile) return <PublicPageShell hideNav kicker="Perfil público" title={loadError ? 'Não foi possível carregar a página' : 'Perfil não encontrado'} subtitle={loadError ? 'Tente novamente em instantes.' : 'Este endereço pode estar incorreto ou o perfil não está publicado.'}><div className="public-empty">{loadError ? 'Ocorreu uma falha de conexão com a página pública.' : 'Confira o link ou entre em contato com o gabinete.'}</div></PublicPageShell>;

  const voterUrl = `/eleitor-form?userId=${encodeURIComponent(profile.userId)}&profileSlug=${encodeURIComponent(slug)}`;
  const locationLabel = [profile.city, profile.state].filter(Boolean).join(' / ');
  const blocks = Array.isArray(profile.blocks) ? profile.blocks : [];
  const actionBlocks = blocks.filter((block) => ['voterForm', 'demandForm', 'appointment', 'customForm'].includes(block.type));
  const contentBlocks = blocks.filter((block) => ['text', 'image', 'link'].includes(block.type));
  const pageStyle = {
    '--page-background': profile.pageColors?.background || '#071326',
    '--page-card': profile.pageColors?.card || '#16243a',
    '--page-text': profile.pageColors?.text || '#f7fafc',
    '--page-muted-text': profile.pageColors?.mutedText || '#b9c5d3',
    '--page-button': profile.pageColors?.button || '#50d59a',
    '--page-button-text': profile.pageColors?.buttonText || '#09203a',
    '--community-button': profile.heroButtonColors?.community?.background || (profile.pageTheme === 'light' ? '#0f9f6e' : '#50d59a'),
    '--community-button-text': profile.heroButtonColors?.community?.text || (profile.pageTheme === 'light' ? '#ffffff' : '#09203a'),
    '--demand-button': profile.heroButtonColors?.demand?.background || (profile.pageTheme === 'light' ? '#ffffff' : '#16243a'),
    '--demand-button-text': profile.heroButtonColors?.demand?.text || (profile.pageTheme === 'light' ? '#0f172a' : '#ffffff')
  };
  return (
    <main className={`politician-landing theme-${profile.pageTheme === 'light' ? 'light' : 'dark'}`} style={pageStyle}>
      <header className="politician-landing-header"><Link to={`/${slug}`} className="politician-landing-brand">{safeExternalUrl(profile.logoUrl) ? <img className="politician-landing-logo" src={safeExternalUrl(profile.logoUrl)} alt={`Logomarca de ${profile.name}`} /> : <><span>oa</span><strong>{profile.name || 'oAssessor'}</strong></>}</Link><div>{locationLabel ? <span><MapPin size={15} /> {locationLabel}</span> : null}{profile.instagram ? <a href={`https://instagram.com/${profile.instagram.replace(/^@/, '')}`} target="_blank" rel="noreferrer"><Instagram size={15} /> {profile.instagram.startsWith('@') ? profile.instagram : `@${profile.instagram}`}</a> : null}</div></header>
      <section className="politician-landing-hero"><div className="politician-landing-copy"><span className="politician-landing-kicker">{profile.headline || 'Vereador(a)'}{locationLabel ? ` · ${locationLabel}` : ''}</span><h1>{profile.name}</h1><p>{profile.bio || 'Acompanhe o trabalho e fale com o gabinete.'}</p><div className="politician-landing-ctas"><Link to={voterUrl}><Users size={18} /> Faça parte da comunidade</Link><Link className="demand-cta" to={`/${slug}/demanda`}><Send size={17} /> Envie uma demanda</Link></div></div>{safeExternalUrl(profile.photoUrl) ? <img className="politician-landing-photo" src={safeExternalUrl(profile.photoUrl)} alt={`Foto de ${profile.name}`} /> : <div className="politician-landing-photo politician-landing-monogram">{(profile.name || 'V').slice(0,1)}</div>}<div className="politician-landing-glow" /></section>
      <div className="politician-landing-body"><h2>Como podemos ajudar?</h2>
      {blocks.length ? <>
      {actionBlocks.length ? <div className="public-page-form-actions">{actionBlocks.map((block, index) => {
        const shortcutStyle = { '--shortcut-button': block.buttonColor || undefined, '--shortcut-button-text': block.buttonTextColor || undefined };
        if (block.type === 'voterForm') return <Link className="public-action-link primary" style={shortcutStyle} key={block.id || index} to={voterUrl}><Users size={20} /><span><strong>{block.title || 'Cadastre-se como eleitor'}</strong><small>{block.description || 'Participe da comunidade.'}</small></span><ArrowRight size={18} /></Link>;
        if (block.type === 'demandForm') return <Link className="public-action-link" style={shortcutStyle} key={block.id || index} to={`/${slug}/demanda`}><ArrowRight size={20} /><span><strong>{block.title || 'Envie uma demanda'}</strong><small>{block.description || 'Conte como o gabinete pode ajudar.'}</small></span><ArrowRight size={18} /></Link>;
        if (block.type === 'appointment') return <Link className="public-action-link primary" style={shortcutStyle} key={block.id || index} to={`/${slug}/agendar`}><CalendarClock size={20} /><span><strong>{block.title || 'Agende um atendimento'}</strong><small>{block.description || 'Escolha um serviço e horário.'}</small></span><ArrowRight size={18} /></Link>;
        return <PublicCustomForm key={block.id || index} block={block} profile={profile} slug={slug} />;
      })}</div> : null}
      {contentBlocks.length ? <div className="public-page-content-blocks">{contentBlocks.map((block, index) => {
        const shortcutStyle = { '--shortcut-button': block.buttonColor || undefined, '--shortcut-button-text': block.buttonTextColor || undefined };
        if (block.type === 'text') return <section className={`public-content-block public-content-text layout-${block.imagePosition || 'top'}`} style={{ '--text-image-gap': `${Math.max(0, Math.min(120, Number(block.imageSpacing) || 0))}px` }} key={block.id || index}>{safeExternalUrl(block.imageUrl) ? <img className="public-content-text-image" src={safeExternalUrl(block.imageUrl)} alt={block.imageAlt || ''} /> : null}<div className="public-content-text-body">{block.title ? <h2>{block.title}</h2> : null}<p>{block.content}</p></div></section>;
        if (block.type === 'image') {
          const imageUrl = safeExternalUrl(block.imageUrl);
          return imageUrl ? <figure className="public-content-block public-content-image" key={block.id || index}><img src={imageUrl} alt={block.alt || block.title || ''} />{block.title ? <figcaption>{block.title}</figcaption> : null}</figure> : null;
        }
        if (block.type === 'link') {
          const url = safeExternalUrl(block.url);
          return url ? <section className="public-content-block public-content-link" key={block.id || index} style={shortcutStyle}>{block.description ? <p>{block.description}</p> : null}<a href={url} target="_blank" rel="noreferrer">{block.title || 'Acessar link'} <ArrowRight size={17} /></a></section> : null;
        }
        return null;
      })}</div> : null}
      </> : null}
      {!blocks.length ? <div className="public-politician-layout">
        <section className="public-politician-card">
          <div className="public-politician-avatar"><UserRound size={44} /></div>
          <div className="public-politician-details">
            {locationLabel ? <span><MapPin size={16} /> {locationLabel}</span> : null}
            {profile.instagram ? <a href={`https://instagram.com/${profile.instagram.replace(/^@/, '')}`} target="_blank" rel="noreferrer"><Instagram size={16} /> {profile.instagram.startsWith('@') ? profile.instagram : `@${profile.instagram}`}</a> : null}
          </div>
        </section>
        <section className="public-politician-actions">
          <h2>Como podemos ajudar?</h2>
          <p>Escolha uma opção para falar com o gabinete.</p>
          <Link className="public-action-link primary" to={voterUrl}><Users size={20} /><span><strong>Cadastre-se como eleitor</strong><small>Receba informações e participe da comunidade.</small></span><ArrowRight size={18} /></Link>
          <Link className="public-action-link" to={`/${slug}/demanda`}><ArrowRight size={20} /><span><strong>Envie uma demanda</strong><small>Conte o que precisa e acompanhe o atendimento.</small></span><ArrowRight size={18} /></Link>
          <Link className="public-action-link primary" to={`/${slug}/agendar`}><CalendarClock size={20} /><span><strong>Agende um atendimento</strong><small>Escolha o serviço e o melhor horário.</small></span><ArrowRight size={18} /></Link>
        </section>
      </div> : null}
      {blocks.length > 0 && (profile.city || profile.state || profile.instagram) ? <footer className="public-page-footer">
        {[profile.city, profile.state].filter(Boolean).length ? <span><MapPin size={15} /> {[profile.city, profile.state].filter(Boolean).join(' / ')}</span> : null}
        {profile.instagram ? <a href={`https://instagram.com/${profile.instagram.replace(/^@/, '')}`} target="_blank" rel="noreferrer"><Instagram size={15} /> {profile.instagram.startsWith('@') ? profile.instagram : `@${profile.instagram}`}</a> : null}
      </footer> : null}
      <footer className="politician-landing-footer">© {new Date().getFullYear()} {profile.name} · Atendimento à comunidade</footer></div>
    </main>
  );
}
