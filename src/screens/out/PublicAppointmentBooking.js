import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, CheckCircle, Clock3, Send } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { equalTo, get, orderByChild, query, ref } from '../../services/firestoreDatabase';
import { database } from '../../firebaseConfig';
import PublicPageShell from '../../components/PublicPageShell';
import { getAppointmentTimes, reservePublicAppointment } from '../../services/publicAppointmentsService';

const localDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const blankCitizen = { name: '', phone: '', email: '', notes: '' };

export default function PublicAppointmentBooking() {
  const { slug } = useParams();
  const [profile, setProfile] = useState(null);
  const [settings, setSettings] = useState(null);
  const [slots, setSlots] = useState([]);
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState(() => localDate(new Date()));
  const [time, setTime] = useState('');
  const [citizen, setCitizen] = useState(blankCitizen);
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const profileSnapshot = await get(ref(database, `publicProfiles/${slug}`));
        if (!profileSnapshot.exists() || profileSnapshot.val().enabled === false) return;
        const profileData = profileSnapshot.val();
        const settingsSnapshot = await get(ref(database, `publicAppointmentSettings/${profileData.userId}`));
        if (!active) return;
        const bookingSettings = settingsSnapshot.val();
        setProfile(profileData);
        setSettings(bookingSettings);
        const firstService = (bookingSettings?.services || []).find((service) => service.active);
        setServiceId(firstService?.id || '');
      } catch (loadError) {
        console.error('Erro ao carregar agenda pública:', loadError);
        if (active) setError('Não foi possível carregar os horários. Tente novamente mais tarde.');
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [slug]);

  const services = useMemo(() => (settings?.services || []).filter((service) => service.active), [settings]);
  const selectedService = services.find((service) => service.id === serviceId);
  const maxDate = useMemo(() => {
    const value = new Date();
    value.setDate(value.getDate() + (Number(settings?.advanceDays) || 60));
    return localDate(value);
  }, [settings]);

  useEffect(() => {
    if (!settings || !date || !selectedService) { setSlots([]); return undefined; }
    let active = true;
    setLoadingSlots(true);
    setTime('');
    get(query(ref(database, 'publicAppointmentSlots'), orderByChild('slotDate'), equalTo(date)))
      .then((snapshot) => {
        if (!active) return;
        const held = Object.values(snapshot.val() || {});
        setSlots(getAppointmentTimes(settings, selectedService, date, held));
      })
      .catch((loadError) => { console.error('Erro ao buscar disponibilidade:', loadError); if (active) setSlots([]); })
      .finally(() => { if (active) setLoadingSlots(false); });
    return () => { active = false; };
  }, [date, selectedService, settings]);

  const submit = async (event) => {
    event.preventDefault();
    if (!profile || !settings || !selectedService || !time) return;
    setSaving(true); setError('');
    try {
      const result = await reservePublicAppointment({ profileSlug: slug, adminId: profile.userId, serviceId, date, time, citizen });
      setConfirmation(result.confirmationCode);
    } catch (bookingError) {
      console.error('Erro ao reservar atendimento:', bookingError);
      setError(bookingError.message || 'Não foi possível concluir o agendamento. Escolha outro horário.');
      setTime('');
    } finally { setSaving(false); }
  };

  if (loading) return <PublicPageShell hideNav kicker="Agendamento" title="Carregando horários" subtitle=""><div className="public-empty">Aguarde um instante...</div></PublicPageShell>;
  if (!profile || !settings?.enabled || !services.length) return <PublicPageShell profile={profile} hideNav kicker="Agendamento" title="Agenda indisponível" subtitle="O gabinete ainda não abriu horários para agendamento."><div className="public-empty"><Link to={`/p/${slug}`} className="public-glass-btn"><ArrowLeft size={16} /> Voltar ao perfil</Link></div></PublicPageShell>;

  return <PublicPageShell profile={profile} hideNav kicker={`Atendimento · ${profile.name}`} title={confirmation ? 'Solicitação enviada' : 'Agende seu atendimento'} subtitle={confirmation ? 'O gabinete recebeu sua solicitação e poderá confirmar o horário.' : 'Escolha o serviço, o dia e um horário disponível.'} compactHero>
    {confirmation ? <section className="public-demand-success"><CheckCircle size={42} /><h2>Código {confirmation}</h2><p>{selectedService?.name} · {new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR')} às {time}</p><p>O gabinete entrará em contato pelo telefone informado.</p><Link to={`/p/${slug}`} className="public-glass-btn"><ArrowLeft size={16} /> Voltar ao perfil</Link></section> :
      <form className="public-form-grid public-appointment-form" onSubmit={submit}>
        {error ? <div className="public-alert public-form-field full">{error}</div> : null}
        <label className="public-form-field full"><span className="public-form-label">Serviço *</span><select className="public-form-select" value={serviceId} onChange={(event) => setServiceId(event.target.value)} required>{services.map((service) => <option value={service.id} key={service.id}>{service.name} · {service.durationMinutes} min</option>)}</select>{selectedService?.description ? <small>{selectedService.description}</small> : null}</label>
        <label className="public-form-field"><span className="public-form-label">Dia *</span><input className="public-form-input" type="date" min={localDate(new Date())} max={maxDate} value={date} onChange={(event) => setDate(event.target.value)} required /></label>
        <div className="public-form-field"><span className="public-form-label">Horário *</span><div className="public-appointment-slots">{loadingSlots ? <small>Buscando horários...</small> : slots.length ? slots.map((slot) => <button type="button" className={time === slot ? 'selected' : ''} key={slot} onClick={() => setTime(slot)}><Clock3 size={14} />{slot}</button>) : <small>Sem horários disponíveis para esta data.</small>}</div></div>
        <label className="public-form-field"><span className="public-form-label">Seu nome *</span><input className="public-form-input" required maxLength={120} value={citizen.name} onChange={(event) => setCitizen({ ...citizen, name: event.target.value })} /></label>
        <label className="public-form-field"><span className="public-form-label">Telefone *</span><input className="public-form-input" type="tel" required maxLength={30} value={citizen.phone} onChange={(event) => setCitizen({ ...citizen, phone: event.target.value })} /></label>
        <label className="public-form-field"><span className="public-form-label">E-mail</span><input className="public-form-input" type="email" maxLength={160} value={citizen.email} onChange={(event) => setCitizen({ ...citizen, email: event.target.value })} /></label>
        <label className="public-form-field full"><span className="public-form-label">Observação</span><textarea className="public-form-textarea" rows={3} maxLength={1000} value={citizen.notes} onChange={(event) => setCitizen({ ...citizen, notes: event.target.value })} /></label>
        <div className="public-form-field full public-demand-actions"><Link to={`/p/${slug}`} className="public-glass-btn"><ArrowLeft size={16} /> Voltar</Link><button className="btn-primary public-primary-cta" type="submit" disabled={saving || !time || loadingSlots}><CalendarDays size={16} /> {saving ? 'Reservando...' : <><Send size={15} /> Solicitar horário</>}</button></div>
      </form>}
  </PublicPageShell>;
}
