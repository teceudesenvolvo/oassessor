import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, Clock3, Plus, Save, ClipboardList, Trash2, X } from 'lucide-react';
import { equalTo, get, onValue, orderByChild, query, ref, set, update } from '../../services/firestoreDatabase';
import { database } from '../../firebaseConfig';
import { useAuth } from '../../useAuth';
import InsightPanel from '../../components/dashboard/InsightPanel';
import MetricCard from '../../components/dashboard/MetricCard';
import { cancelPublicAppointment } from '../../services/publicAppointmentsService';

const WEEKDAYS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const newId = () => `service-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const DEFAULT_SETTINGS = {
  enabled: true, slotIntervalMinutes: 30, defaultCapacity: 1, dailyCapacity: 30, advanceDays: 60,
  weeklySchedule: Object.fromEntries(WEEKDAYS.map((_, day) => [day, { enabled: day > 0 && day < 6, startTime: '09:00', endTime: '17:00' }])),
  services: [], holidays: []
};
const SERVICE_TEMPLATES = [
  { name: 'Atendimento no gabinete', durationMinutes: 30 },
  { name: 'Atendimento jurídico', durationMinutes: 45 },
  { name: 'Orientação contábil', durationMinutes: 45 },
  { name: 'Consultoria', durationMinutes: 60 }
];
const STATUS_LABELS = { requested: 'Solicitado', confirmed: 'Confirmado', completed: 'Concluído', cancelled: 'Cancelado', declined: 'Recusado' };
const appointmentHasPassed = (appointment) => new Date(`${appointment.appointmentDate}T${appointment.appointmentTime}:00`).getTime() <= Date.now();

export default function AppointmentCenter() {
  const { user } = useAuth();
  const [adminId, setAdminId] = useState('');
  const [profileSlug, setProfileSlug] = useState('');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [appointments, setAppointments] = useState([]);
  const [holidayDraft, setHolidayDraft] = useState({ date: '', name: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [activeSettingsModal, setActiveSettingsModal] = useState('');

  useEffect(() => {
    if (!user) return undefined;
    let active = true;
    let unsubscribe = null;
    (async () => {
      try {
        const directUserSnapshot = await get(ref(database, `users/${user.uid}`));
        const queriedUserSnapshot = directUserSnapshot.exists() ? null : await get(query(ref(database, 'users'), orderByChild('userId'), equalTo(user.uid)));
        const currentUser = directUserSnapshot.val() || (queriedUserSnapshot?.exists() ? Object.values(queriedUserSnapshot.val())[0] : {});
        const resolvedAdminId = currentUser.adminId || user.uid;
        const ownerDirectSnapshot = resolvedAdminId === user.uid ? null : await get(ref(database, `users/${resolvedAdminId}`));
        const ownerQuerySnapshot = resolvedAdminId === user.uid || ownerDirectSnapshot?.exists() ? null : await get(query(ref(database, 'users'), orderByChild('userId'), equalTo(resolvedAdminId)));
        const ownerData = ownerDirectSnapshot?.val() || (ownerQuerySnapshot?.exists() ? Object.values(ownerQuerySnapshot.val())[0] : currentUser);
        let slug = ownerData?.publicProfileSlug || currentUser.publicProfileSlug || '';
        if (!slug) {
          const profileSnapshot = await get(query(ref(database, 'publicProfiles'), orderByChild('userId'), equalTo(resolvedAdminId)));
          if (profileSnapshot.exists()) slug = Object.keys(profileSnapshot.val())[0];
        }
        const settingsSnapshot = await get(ref(database, `publicAppointmentSettings/${resolvedAdminId}`));
        if (!active) return;
        const savedSettings = settingsSnapshot.val() || {};
        setAdminId(resolvedAdminId);
        setProfileSlug(slug);
        setSettings({
          ...DEFAULT_SETTINGS, ...savedSettings,
          defaultCapacity: Math.min(10, Number(savedSettings.defaultCapacity) || 1),
          dailyCapacity: Math.min(100, Number(savedSettings.dailyCapacity) || 30),
          services: (savedSettings.services || []).map((service) => ({ ...service, capacityPerSlot: Math.min(10, Number(service.capacityPerSlot) || 1) })),
          weeklySchedule: { ...DEFAULT_SETTINGS.weeklySchedule, ...(savedSettings.weeklySchedule || {}) }
        });
        unsubscribe = onValue(query(ref(database, 'publicAppointments'), orderByChild('adminId'), equalTo(resolvedAdminId)), (snapshot) => {
          if (!active) return;
          const list = Object.entries(snapshot.val() || {}).map(([id, item]) => ({ id, ...item })).sort((a, b) => `${a.appointmentDate}${a.appointmentTime}`.localeCompare(`${b.appointmentDate}${b.appointmentTime}`));
          setAppointments(list);
          setLoading(false);
        }, () => { if (active) setLoading(false); });
      } catch (error) {
        console.error('Erro ao carregar agendamentos:', error);
        if (active) { setNotice('Não foi possível carregar as configurações.'); setLoading(false); }
      }
    })();
    return () => { active = false; if (unsubscribe) unsubscribe(); };
  }, [user]);

  const upcoming = useMemo(() => appointments.filter((item) => ['requested', 'confirmed'].includes(item.status)), [appointments]);
  const change = (key, value) => setSettings((current) => ({ ...current, [key]: value }));
  const saveSettings = async (event) => {
    event?.preventDefault();
    if (!adminId || !profileSlug) { setNotice('Publique primeiro o perfil público do vereador.'); return; }
    const invalidDay = WEEKDAYS.some((_, day) => {
      const schedule = settings.weeklySchedule[day];
      return schedule?.enabled && schedule.startTime >= schedule.endTime;
    });
    if (invalidDay) { setNotice('Em cada dia ativo, o horário de abertura precisa ser anterior ao fechamento.'); return; }
    if (settings.services.some((service) => service.active && (!service.name.trim() || Number(service.durationMinutes) < 15 || Number(service.capacityPerSlot) < 1))) {
      setNotice('Preencha o nome, a duração e a capacidade dos serviços ativos.'); return;
    }
    setSaving(true); setNotice('');
    try {
      const serviceCapacities = Object.fromEntries(settings.services.filter((service) => service.active).map((service) => [service.id, Math.min(10, Math.max(1, Number(service.capacityPerSlot) || Number(settings.defaultCapacity) || 1))]));
      await set(ref(database, `publicAppointmentSettings/${adminId}`), { ...settings, serviceCapacities, adminId, profileSlug, updatedAt: new Date().toISOString() });
      setNotice('Configurações de agendamento salvas.');
      setActiveSettingsModal('');
    } catch (error) {
      console.error('Erro ao salvar agendamentos:', error); setNotice('Não foi possível salvar. Verifique seu acesso e tente novamente.');
    } finally { setSaving(false); }
  };
  const addService = (service = { name: '', durationMinutes: 30 }) => change('services', [...settings.services, { ...service, id: newId(), description: '', capacityPerSlot: settings.defaultCapacity, active: true }]);
  const updateService = (id, patch) => change('services', settings.services.map((service) => service.id === id ? { ...service, ...patch } : service));
  const addHoliday = () => {
    if (!holidayDraft.date) return;
    change('holidays', [...settings.holidays, { ...holidayDraft, id: newId() }].sort((a, b) => a.date.localeCompare(b.date)));
    setHolidayDraft({ date: '', name: '' });
  };
  const updateStatus = async (appointment, status) => {
    try {
      if (status === 'cancelled' || status === 'declined') await cancelPublicAppointment(appointment.id);
      else await update(ref(database, `publicAppointments/${appointment.id}`), { status, updatedAt: new Date().toISOString() });
    } catch (error) { console.error('Erro ao atualizar agendamento:', error); alert('Não foi possível atualizar o agendamento.'); }
  };

  if (loading) return <div className="campaign-empty-state">Carregando agenda de atendimentos...</div>;
  return <div className="campaign-dashboard appointment-center">
    <section className="campaign-filters-card appointment-center-header"><div className="campaign-filters-header"><div><p className="campaign-kicker"><CalendarDays size={16} />Atendimento público</p><h3>Agendamentos</h3></div><div className="appointment-settings-trigger-group"><button className="btn-secondary" type="button" onClick={() => { setNotice(''); setActiveSettingsModal('availability'); }}><Clock3 size={16} /> Disponibilidade</button><button className="btn-secondary" type="button" onClick={() => { setNotice(''); setActiveSettingsModal('services'); }}><ClipboardList size={16} /> Serviços</button><button className="btn-secondary" type="button" onClick={() => { setNotice(''); setActiveSettingsModal('holidays'); }}><CalendarDays size={16} /> Feriados</button></div></div><p style={{ margin: 0, color: '#64748b', lineHeight: 1.6 }}>Gerencie os atendimentos e abra as configurações pelos botões acima.</p></section>
    <div className="campaign-metrics-grid"><MetricCard title="Solicitações pendentes" value={appointments.filter((item) => item.status === 'requested').length} helper="Aguardando confirmação" tone="highlight" /><MetricCard title="Confirmados" value={appointments.filter((item) => item.status === 'confirmed').length} helper="Atendimentos marcados" tone="success" /><MetricCard title="Serviços ativos" value={settings.services.filter((item) => item.active).length} helper="Disponíveis no perfil" /></div>

    {notice ? <div className="appointment-page-notice" role="status">{notice}</div> : null}
    <InsightPanel title="Solicitações de atendimento" subtitle="Confirme, conclua ou cancele os horários solicitados">
      <div className="appointment-booking-list">{!upcoming.length ? <div className="campaign-empty-state">Nenhum atendimento futuro solicitado.</div> : upcoming.map((appointment) => <article key={appointment.id} className="appointment-booking-card"><div className="appointment-booking-date"><strong>{new Date(`${appointment.appointmentDate}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', weekday: 'short' })}</strong><span><Clock3 size={14} /> {appointment.appointmentTime}</span></div><div className="appointment-booking-person"><strong>{appointment.citizenName}</strong><span>{appointment.serviceName} · {appointment.citizenPhone}</span>{appointment.citizenEmail ? <span>{appointment.citizenEmail}</span> : null}{appointment.notes ? <p>{appointment.notes}</p> : null}</div><div className="appointment-booking-actions"><span className={`appointment-status status-${appointment.status}`}>{STATUS_LABELS[appointment.status] || appointment.status}</span>{appointment.status === 'requested' ? <button type="button" className="btn-secondary" onClick={() => updateStatus(appointment, 'confirmed')}><Check size={15} /> Confirmar</button> : null}{appointment.status === 'confirmed' && appointmentHasPassed(appointment) ? <button type="button" className="btn-secondary" onClick={() => updateStatus(appointment, 'completed')}><Check size={15} /> Concluir</button> : null}<button type="button" className="funnel-link-btn" onClick={() => updateStatus(appointment, 'cancelled')}><X size={15} /> Cancelar</button></div></article>)}</div>
    </InsightPanel>

    {activeSettingsModal ? <div className="funnel-modal-backdrop appointment-settings-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveSettingsModal(''); }}><section className="funnel-modal appointment-settings-modal" role="dialog" aria-modal="true" aria-labelledby="appointment-settings-title"><header className="funnel-modal-header"><div><h3 id="appointment-settings-title">{activeSettingsModal === 'availability' ? 'Disponibilidade' : activeSettingsModal === 'services' ? 'Serviços de atendimento' : 'Feriados e exceções'}</h3><p>{activeSettingsModal === 'availability' ? 'Dias, horários e capacidade de atendimento.' : activeSettingsModal === 'services' ? 'Defina quais atendimentos estarão disponíveis.' : 'Bloqueie dias sem atendimento.'}</p></div><button type="button" className="funnel-link-btn" onClick={() => setActiveSettingsModal('')} aria-label="Fechar configurações"><X size={18} /></button></header>
      <form onSubmit={saveSettings} className="appointment-settings-modal-form">
        {activeSettingsModal === 'availability' ? <><label className="public-profile-enabled"><input type="checkbox" checked={!!settings.enabled} onChange={(event) => change('enabled', event.target.checked)} /> Receber agendamentos pelo perfil público</label><div className="appointment-global-settings"><label className="funnel-filter-field"><span>Intervalo entre horários</span><select className="campaign-filter-select" value={settings.slotIntervalMinutes} onChange={(event) => change('slotIntervalMinutes', Number(event.target.value))}><option value={15}>15 minutos</option><option value={30}>30 minutos</option><option value={60}>60 minutos</option></select></label><label className="funnel-filter-field"><span>Vagas por horário</span><input className="campaign-filter-select" type="number" min="1" max="10" value={settings.defaultCapacity} onChange={(event) => change('defaultCapacity', Math.min(10, Number(event.target.value)))} /></label><label className="funnel-filter-field"><span>Vagas por dia</span><input className="campaign-filter-select" type="number" min="1" max="100" value={settings.dailyCapacity} onChange={(event) => change('dailyCapacity', Math.min(100, Number(event.target.value)))} /></label><label className="funnel-filter-field"><span>Antecedência máxima (dias)</span><input className="campaign-filter-select" type="number" min="1" max="365" value={settings.advanceDays} onChange={(event) => change('advanceDays', Math.min(365, Number(event.target.value)))} /></label></div><div className="appointment-weekly-grid">{WEEKDAYS.map((weekday, day) => { const schedule = settings.weeklySchedule[day] || { enabled: false, startTime: '09:00', endTime: '17:00' }; return <div className={`appointment-weekday ${schedule.enabled ? 'active' : ''}`} key={weekday}><label><input type="checkbox" checked={!!schedule.enabled} onChange={(event) => change('weeklySchedule', { ...settings.weeklySchedule, [day]: { ...schedule, enabled: event.target.checked } })} /><strong>{weekday}</strong></label><input aria-label={`${weekday} abre às`} type="time" value={schedule.startTime} disabled={!schedule.enabled} onChange={(event) => change('weeklySchedule', { ...settings.weeklySchedule, [day]: { ...schedule, startTime: event.target.value } })} /><span>até</span><input aria-label={`${weekday} fecha às`} type="time" value={schedule.endTime} disabled={!schedule.enabled} onChange={(event) => change('weeklySchedule', { ...settings.weeklySchedule, [day]: { ...schedule, endTime: event.target.value } })} /></div>; })}</div></> : null}
        {activeSettingsModal === 'services' ? <><div className="appointment-service-list">{settings.services.map((service) => <article className="appointment-service-card" key={service.id}><div className="appointment-service-fields"><label className="funnel-filter-field"><span>Nome do serviço</span><input className="campaign-filter-select" value={service.name} onChange={(event) => updateService(service.id, { name: event.target.value })} placeholder="Atendimento jurídico" /></label><label className="funnel-filter-field"><span>Duração (minutos)</span><input className="campaign-filter-select" type="number" min="15" step="15" max="240" value={service.durationMinutes} onChange={(event) => updateService(service.id, { durationMinutes: Number(event.target.value) })} /></label><label className="funnel-filter-field"><span>Vagas por horário</span><input className="campaign-filter-select" type="number" min="1" max="10" value={service.capacityPerSlot} onChange={(event) => updateService(service.id, { capacityPerSlot: Math.min(10, Number(event.target.value)) })} /></label><label className="funnel-filter-field appointment-service-description"><span>Descrição</span><input className="campaign-filter-select" value={service.description || ''} onChange={(event) => updateService(service.id, { description: event.target.value })} /></label></div><div className="appointment-service-actions"><label><input type="checkbox" checked={!!service.active} onChange={(event) => updateService(service.id, { active: event.target.checked })} /> Disponível</label><button type="button" className="funnel-link-btn" onClick={() => change('services', settings.services.filter((item) => item.id !== service.id))}><Trash2 size={15} /> Remover</button></div></article>)}{!settings.services.length ? <div className="campaign-empty-state">Adicione serviços para abrir a agenda ao público.</div> : null}</div><div className="appointment-service-add"><button type="button" className="btn-secondary" onClick={() => addService()}><Plus size={16} /> Criar serviço</button>{SERVICE_TEMPLATES.map((template) => <button type="button" className="appointment-template-btn" key={template.name} onClick={() => addService(template)}>+ {template.name}</button>)}</div></> : null}
        {activeSettingsModal === 'holidays' ? <><div className="appointment-holiday-add"><input className="campaign-filter-select" type="date" value={holidayDraft.date} onChange={(event) => setHolidayDraft({ ...holidayDraft, date: event.target.value })} /><input className="campaign-filter-select" placeholder="Nome do feriado ou motivo" value={holidayDraft.name} onChange={(event) => setHolidayDraft({ ...holidayDraft, name: event.target.value })} /><button type="button" className="btn-secondary" onClick={addHoliday}><Plus size={15} /> Bloquear data</button></div><div className="appointment-holiday-list">{settings.holidays.map((holiday) => <div key={holiday.id || holiday.date}><span><strong>{new Date(`${holiday.date}T12:00:00`).toLocaleDateString('pt-BR')}</strong>{holiday.name || 'Sem atendimento'}</span><button type="button" aria-label="Remover feriado" onClick={() => change('holidays', settings.holidays.filter((item) => (item.id || item.date) !== (holiday.id || holiday.date)))}><X size={15} /></button></div>)}{!settings.holidays.length ? <p className="campaign-empty-state">Nenhuma data bloqueada.</p> : null}</div></> : null}
        {notice && activeSettingsModal ? <span className="appointment-modal-notice" role="status">{notice}</span> : null}<footer className="funnel-modal-actions"><button className="btn-primary" type="submit" disabled={saving}><Save size={16} />{saving ? 'Salvando...' : 'Salvar alterações'}</button></footer>
      </form>
      {!profileSlug ? <p className="appointment-modal-help">Publique primeiro o perfil público do vereador para habilitar o agendamento.</p> : <a className="appointment-modal-link" href={`/${profileSlug}/agendar`} target="_blank" rel="noreferrer">Abrir formulário público de agendamento</a>}
    </section></div> : null}
  </div>;
}
