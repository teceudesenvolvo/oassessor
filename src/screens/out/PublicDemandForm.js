import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle, Paperclip, Send, X } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { get, push, ref, set } from '../../services/firestoreDatabase';
import { database, storage } from '../../firebaseConfig';
import { deleteObject, getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import PublicPageShell from '../../components/PublicPageShell';

const EMPTY_FORM = { name: '', phone: '', email: '', title: '', description: '', neighborhood: '' };

export default function PublicDemandForm() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [protocol, setProtocol] = useState('');
  const [files, setFiles] = useState([]);

  useEffect(() => {
    let active = true;
    get(ref(database, `publicProfiles/${slug}`)).then((snapshot) => {
      const value = snapshot.val();
      if (active) setProfile(snapshot.exists() && value.enabled !== false ? value : null);
    }).catch((error) => console.error('Erro ao carregar perfil público:', error))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug]);

  const submit = async (event) => {
    event.preventDefault();
    if (!profile || saving) return;
    if (files.length > 5 || files.some((file) => file.size > 10 * 1024 * 1024 || !/^(image\/|application\/pdf$|application\/msword$|application\/vnd\.(openxmlformats-officedocument\..+|ms-excel)$|text\/plain$)/i.test(file.type))) { alert('Anexe até 5 fotos ou documentos permitidos (PDF, Word, Excel ou texto), com no máximo 10 MB cada.'); return; }
    setSaving(true);
    const uploadedFiles = [];
    try {
      const demandRef = push(ref(database, 'demandas'));
      const now = new Date().toISOString();
      const attachments = await Promise.all(files.map(async (file) => {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `demandAttachments/${profile.userId}/${slug}/${demandRef.key}/${Date.now()}-${safeName}`;
        const target = storageRef(storage, path);
        await uploadBytes(target, file, { contentType: file.type || 'application/octet-stream' });
        uploadedFiles.push(target);
        return { name: file.name, type: file.type, size: file.size, path, url: await getDownloadURL(target) };
      }));
      await set(demandRef, {
        title: form.title.trim(), description: form.description.trim(), contactName: form.name.trim(),
        phone: form.phone.trim(), email: form.email.trim(), bairro: form.neighborhood.trim().toUpperCase(),
        priority: 'medium', status: 'received', voterId: '', voterName: form.name.trim(), assessorId: '',
        assessorResponsavel: '', visitId: '', visitTitle: '', response: '', dueDate: '', timeline: {
          [demandRef.key]: { status: 'received', title: 'Demanda recebida', description: 'Enviada pelo perfil público.', createdAt: now, actorName: 'Comunidade' }
        }, attachments, adminId: profile.userId, profileSlug: slug, createdAt: now, updatedAt: now, origin: 'public_profile'
      });
      setProtocol(`DEM-${demandRef.key.slice(0, 6).toUpperCase()}`);
    } catch (error) {
      await Promise.allSettled(uploadedFiles.map((target) => deleteObject(target)));
      console.error('Erro ao enviar demanda:', error);
      alert('Não foi possível enviar sua demanda. Tente novamente.');
    } finally { setSaving(false); }
  };

  if (loading) return <PublicPageShell hideNav kicker="Fale com o gabinete" title="Carregando" subtitle=""><div className="public-empty">Aguarde um instante...</div></PublicPageShell>;
  if (!profile) return <PublicPageShell hideNav kicker="Perfil público" title="Perfil não encontrado" subtitle="Este endereço pode estar incorreto ou o perfil não está publicado."><div className="public-empty">Confira o link e tente novamente.</div></PublicPageShell>;
  return (
    <PublicPageShell profile={profile} hideNav kicker={`Demanda para ${profile.name}`} title={protocol ? 'Demanda enviada' : 'Como podemos ajudar?'} subtitle={protocol ? 'Sua mensagem foi registrada para a equipe do gabinete.' : 'Descreva sua solicitação. Os campos com * são obrigatórios.'} compactHero>
      {protocol ? <div className="public-demand-success"><CheckCircle size={42} /><h2>Protocolo {protocol}</h2><p>Guarde este número para consultar sobre o atendimento.</p><button className="btn-primary public-primary-cta" onClick={() => navigate(`/${slug}`)}>Voltar ao perfil</button></div> :
        <form className="public-form-grid public-demand-form" onSubmit={submit}>
          <label className="public-form-field"><span className="public-form-label">Seu nome *</span><input className="public-form-input" required maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label className="public-form-field"><span className="public-form-label">Telefone *</span><input className="public-form-input" required type="tel" maxLength={30} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
          <label className="public-form-field"><span className="public-form-label">E-mail para receber atualizações *</span><input className="public-form-input" required type="email" maxLength={160} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label className="public-form-field"><span className="public-form-label">Bairro</span><input className="public-form-input" maxLength={100} value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} /></label>
          <label className="public-form-field full"><span className="public-form-label">Assunto *</span><input className="public-form-input" required maxLength={140} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
          <label className="public-form-field full"><span className="public-form-label">Conte sua solicitação *</span><textarea className="public-form-textarea" required rows={6} maxLength={3000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          <div className="public-form-field full public-upload-field"><span className="public-form-label">Fotos e documentos (até 5 arquivos, 10 MB cada)</span><label className="public-upload-button"><Paperclip size={17} /> Adicionar arquivos<input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" onChange={(event) => setFiles(Array.from(event.target.files || []).slice(0, 5))} /></label>{files.map((file) => <span className="public-upload-file" key={`${file.name}-${file.lastModified}`}>{file.name}<button type="button" aria-label={`Remover ${file.name}`} onClick={() => setFiles((current) => current.filter((item) => item !== file))}><X size={14} /></button></span>)}</div>
          <div className="public-form-field full public-demand-actions"><Link to={`/${slug}`} className="public-glass-btn"><ArrowLeft size={16} /> Voltar</Link><button className="btn-primary public-primary-cta" type="submit" disabled={saving}><Send size={16} /> {saving ? 'Enviando...' : 'Enviar demanda'}</button></div>
        </form>}
    </PublicPageShell>
  );
}
