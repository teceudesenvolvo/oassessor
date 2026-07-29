import React, { useMemo, useState } from 'react';
import { CalendarDays, CheckCheck, MapPin, Plus, QrCode, Save, Ticket, Trash2, UserRound } from 'lucide-react';
import InsightPanel from '../../components/dashboard/InsightPanel';
import MetricCard from '../../components/dashboard/MetricCard';
import { EVENT_CONFIRMATION_STATUSES, useEvents } from '../../hooks/useEvents';
import { useAuth } from '../../useAuth';

const INITIAL_FORM = {
  title: '',
  description: '',
  local: '',
  startAt: '',
  endAt: '',
  assessorId: '',
  report: '',
  category: '',
  guests: []
};

const formatDateTime = (value) => {
  if (!value) return 'Sem data';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sem data';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const generateQrSvg = (value) => {
  const seed = Array.from(value || 'EVENTO').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const cells = [];
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const active = ((row * 11 + col * 7 + seed) % 3) === 0;
      if (active) {
        cells.push(`<rect x="${col * 12}" y="${row * 12}" width="12" height="12" fill="#0f172a" />`);
      }
    }
  }
  return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108"><rect width="108" height="108" fill="white"/>${cells.join('')}</svg>`)}`;
};

export default function Events() {
  const { user } = useAuth();
  const { loading, events, volunteers, assessors, stats, saveEvent, deleteEvent } = useEvents(user);
  const [selectedId, setSelectedId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [guestDraft, setGuestDraft] = useState({ name: '', phone: '', role: '', status: 'pending' });
  const [formData, setFormData] = useState({
    ...INITIAL_FORM,
    startAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16)
  });

  const upcomingEvents = useMemo(
    () => events.filter((event) => new Date(event.startAt || 0) >= new Date()),
    [events]
  );

  const resetForm = () => {
    setSelectedId(null);
    setGuestDraft({ name: '', phone: '', role: '', status: 'pending' });
    setFormData({
      ...INITIAL_FORM,
      startAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16)
    });
  };

  const openNew = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (event) => {
    setSelectedId(event.id);
    setGuestDraft({ name: '', phone: '', role: '', status: 'pending' });
    setFormData({
      title: event.title || '',
      description: event.description || '',
      local: event.local || '',
      startAt: event.startAt ? event.startAt.slice(0, 16) : '',
      endAt: event.endAt ? event.endAt.slice(0, 16) : '',
      assessorId: event.assessorId || '',
      report: event.report || '',
      category: event.category || '',
      guests: event.guests || []
    });
    setShowModal(true);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const addGuest = () => {
    if (!guestDraft.name.trim()) return;
    setFormData((prev) => ({
      ...prev,
      guests: [
        ...prev.guests,
        {
          id: `guest-${Date.now()}`,
          ...guestDraft
        }
      ]
    }));
    setGuestDraft({ name: '', phone: '', role: '', status: 'pending' });
  };

  const addVolunteerAsGuest = (volunteer) => {
    setFormData((prev) => ({
      ...prev,
      guests: prev.guests.some((guest) => guest.name === volunteer.nome && guest.phone === volunteer.telefone)
        ? prev.guests
        : [
            ...prev.guests,
            {
              id: `guest-${Date.now()}`,
              name: volunteer.nome,
              phone: volunteer.telefone || '',
              role: 'Voluntário',
              status: 'pending'
            }
          ]
    }));
  };

  const removeGuest = (guestId) => {
    setFormData((prev) => ({
      ...prev,
      guests: prev.guests.filter((guest) => guest.id !== guestId)
    }));
  };

  const updateGuestStatus = (guestId, status) => {
    setFormData((prev) => ({
      ...prev,
      guests: prev.guests.map((guest) => (guest.id === guestId ? { ...guest, status } : guest))
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      await saveEvent(formData, selectedId);
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar evento:', error);
      alert('Não foi possível salvar o evento.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    if (!window.confirm('Tem certeza que deseja excluir este evento?')) return;
    try {
      await deleteEvent(selectedId);
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao excluir evento:', error);
      alert('Não foi possível excluir o evento.');
    }
  };

  return (
    <div className="campaign-dashboard">
      <section className="campaign-filters-card">
        <div className="campaign-filters-header">
          <div>
            <p className="campaign-kicker">
              <CalendarDays size={16} />
              Fase 10
            </p>
            <h3>Eventos</h3>
          </div>
          <button className="btn-primary" onClick={openNew} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={16} />
            Novo evento
          </button>
        </div>
      </section>

      <div className="campaign-metrics-grid">
        <MetricCard title="Eventos" value={stats.total} helper="Agenda ativa da campanha" />
        <MetricCard title="Próximos" value={stats.next} helper="A partir de 29 de julho de 2026" tone="highlight" />
        <MetricCard title="Convidados" value={stats.totalGuests} helper="Público mapeado" />
        <MetricCard title="Confirmados" value={stats.confirmed} helper="Presença confirmada" tone="success" />
        <MetricCard title="Presentes" value={stats.attended} helper="Check-in registrado" tone="success" />
      </div>

      <div className="campaign-main-grid events-main-grid">
        <InsightPanel title="Calendário de eventos" subtitle="Visão mobile-first de agenda, convidados e presença">
          <div className="events-card-list">
            {loading ? <div className="campaign-empty-state">Carregando eventos...</div> : null}
            {!loading && events.length === 0 ? <div className="campaign-empty-state">Nenhum evento cadastrado ainda.</div> : null}

            {events.map((event) => {
              const confirmed = event.guests.filter((guest) => guest.status === 'confirmed').length;
              const attended = event.guests.filter((guest) => guest.status === 'attended').length;

              return (
                <article key={event.id} className="event-mobile-card">
                  <div className="event-mobile-header">
                    <div>
                      <strong>{event.title}</strong>
                      <p>{event.category || 'Sem categoria'} • {event.local}</p>
                    </div>
                    <button type="button" className="funnel-link-btn" onClick={() => openEdit(event)}>
                      Detalhes
                    </button>
                  </div>

                  <div className="event-mobile-meta">
                    <span><CalendarDays size={14} /> {formatDateTime(event.startAt)}</span>
                    <span><UserRound size={14} /> {event.assessorResponsavel || 'Sem responsável'}</span>
                    <span><MapPin size={14} /> {event.local || 'Sem local'}</span>
                  </div>

                  <div className="event-mobile-stats">
                    <span><Ticket size={14} /> {event.guests.length} convidado(s)</span>
                    <span><CheckCheck size={14} /> {confirmed} confirmado(s)</span>
                    <span><QrCode size={14} /> {attended} presente(s)</span>
                  </div>
                </article>
              );
            })}
          </div>
        </InsightPanel>

        <InsightPanel title="Próximos eventos e QR" subtitle="Check-in visual e operação rápida" compact>
          <div className="events-side-list">
            {upcomingEvents.slice(0, 3).map((event) => (
              <div key={event.id} className="event-side-card">
                <div className="event-side-head">
                  <strong>{event.title}</strong>
                  <small>{formatDateTime(event.startAt)}</small>
                </div>
                <img className="event-qr-preview" src={generateQrSvg(`${event.id}:${event.title}`)} alt={`QR do evento ${event.title}`} />
                <p>{event.local}</p>
              </div>
            ))}
          </div>
        </InsightPanel>
      </div>

      {showModal ? (
        <div className="funnel-modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="funnel-modal" onClick={(event) => event.stopPropagation()}>
            <div className="funnel-modal-header">
              <div>
                <h3>{selectedId ? 'Editar evento' : 'Novo evento'}</h3>
                <p>Cadastro, convidados, confirmação, presença, QR visual e relatório.</p>
              </div>
              <button type="button" className="funnel-link-btn" onClick={() => setShowModal(false)}>
                Fechar
              </button>
            </div>

            <form className="funnel-modal-form" onSubmit={handleSave}>
              <div className="campaign-filters-grid">
                <label className="funnel-filter-field">
                  <span>Título</span>
                  <input className="campaign-filter-select" name="title" value={formData.title} onChange={handleChange} required />
                </label>

                <label className="funnel-filter-field">
                  <span>Categoria</span>
                  <input className="campaign-filter-select" name="category" value={formData.category} onChange={handleChange} placeholder="Ex.: Encontro, caminhada, reunião" />
                </label>

                <label className="funnel-filter-field">
                  <span>Local</span>
                  <input className="campaign-filter-select" name="local" value={formData.local} onChange={handleChange} required />
                </label>

                <label className="funnel-filter-field">
                  <span>Responsável</span>
                  <select className="campaign-filter-select" name="assessorId" value={formData.assessorId} onChange={handleChange}>
                    <option value="">Selecionar responsável</option>
                    {assessors.map((assessor) => (
                      <option key={assessor.id} value={assessor.id}>{assessor.nome}</option>
                    ))}
                  </select>
                </label>

                <label className="funnel-filter-field">
                  <span>Início</span>
                  <input className="campaign-filter-select" type="datetime-local" name="startAt" value={formData.startAt} onChange={handleChange} required />
                </label>

                <label className="funnel-filter-field">
                  <span>Fim</span>
                  <input className="campaign-filter-select" type="datetime-local" name="endAt" value={formData.endAt} onChange={handleChange} />
                </label>

                <label className="funnel-filter-field" style={{ gridColumn: '1 / -1' }}>
                  <span>Descrição</span>
                  <textarea className="campaign-filter-select" name="description" value={formData.description} onChange={handleChange} rows="3" />
                </label>

                <label className="funnel-filter-field" style={{ gridColumn: '1 / -1' }}>
                  <span>Relatório</span>
                  <textarea className="campaign-filter-select" name="report" value={formData.report} onChange={handleChange} rows="3" placeholder="Resultados, percepções e pós-evento" />
                </label>
              </div>

              <div className="event-guest-section">
                <div className="event-guest-header">
                  <strong>Convidados</strong>
                  <span>{formData.guests.length} cadastrado(s)</span>
                </div>

                <div className="event-guest-draft">
                  <input className="campaign-filter-select" placeholder="Nome" value={guestDraft.name} onChange={(event) => setGuestDraft((prev) => ({ ...prev, name: event.target.value }))} />
                  <input className="campaign-filter-select" placeholder="Telefone" value={guestDraft.phone} onChange={(event) => setGuestDraft((prev) => ({ ...prev, phone: event.target.value }))} />
                  <input className="campaign-filter-select" placeholder="Papel / origem" value={guestDraft.role} onChange={(event) => setGuestDraft((prev) => ({ ...prev, role: event.target.value }))} />
                  <button type="button" className="btn-secondary" onClick={addGuest}>Adicionar</button>
                </div>

                <div className="event-volunteer-suggestions">
                  {volunteers.slice(0, 6).map((volunteer) => (
                    <button key={volunteer.id} type="button" className="funnel-link-btn" onClick={() => addVolunteerAsGuest(volunteer)}>
                      + {volunteer.nome}
                    </button>
                  ))}
                </div>

                <div className="event-guest-list">
                  {formData.guests.map((guest) => (
                    <div key={guest.id} className="event-guest-item">
                      <div>
                        <strong>{guest.name}</strong>
                        <p>{guest.role || 'Convidado'} • {guest.phone || 'Sem telefone'}</p>
                      </div>
                      <div className="event-guest-actions">
                        <select className="campaign-filter-select event-guest-status-select" value={guest.status} onChange={(event) => updateGuestStatus(guest.id, event.target.value)}>
                          {EVENT_CONFIRMATION_STATUSES.map((status) => (
                            <option key={status.value} value={status.value}>{status.label}</option>
                          ))}
                        </select>
                        <button type="button" className="icon-btn" onClick={() => removeGuest(guest.id)}>
                          <Trash2 size={16} color="#dc2626" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="event-qr-box">
                <div>
                  <strong>QR visual do evento</strong>
                  <p>Usado como base visual de check-in até conectarmos uma camada de leitura dedicada.</p>
                </div>
                <img className="event-qr-preview" src={generateQrSvg(`${formData.protocol || formData.title}:${formData.startAt}`)} alt="QR do evento" />
              </div>

              <div className="funnel-modal-actions">
                {selectedId ? (
                  <button type="button" className="btn-secondary" onClick={handleDelete} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#dc2626', borderColor: '#fecaca' }}>
                    <Trash2 size={16} />
                    Excluir
                  </button>
                ) : <span />}

                <button type="submit" className="btn-primary" disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <Save size={16} />
                  {saving ? 'Salvando...' : 'Salvar evento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
