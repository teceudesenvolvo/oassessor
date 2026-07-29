import React, { useMemo, useState } from 'react';
import { Copy, MessageSquare, Plus, Save, Search, Trash2, UsersRound } from 'lucide-react';
import InsightPanel from '../../components/dashboard/InsightPanel';
import MetricCard from '../../components/dashboard/MetricCard';
import { useCommunicationCenter } from '../../hooks/useCommunicationCenter';
import { useAuth } from '../../useAuth';

const INITIAL_TEMPLATE = {
  title: '',
  category: '',
  audience: 'all',
  message: ''
};

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'supporters', label: 'Apoiadores' },
  { value: 'volunteers', label: 'Voluntários' },
  { value: 'leaderships', label: 'Lideranças' },
  { value: 'birthday', label: 'Aniversariantes' }
];

const renderMessage = (template, contact) =>
  String(template.message || '')
    .replaceAll('{{nome}}', contact.nome || 'Contato')
    .replaceAll('{{bairro}}', contact.bairro || 'sua região');

export default function CommunicationCenter() {
  const { user } = useAuth();
  const { loading, contacts, templates, stats, saveTemplate, deleteTemplate } = useCommunicationCenter(user);
  const [filters, setFilters] = useState({
    audience: 'all',
    bairro: '',
    zona: '',
    secao: '',
    search: ''
  });
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(INITIAL_TEMPLATE);

  const uniqueNeighborhoods = useMemo(
    () => [...new Set(contacts.map((item) => item.bairro).filter(Boolean))].sort(),
    [contacts]
  );

  const uniqueZones = useMemo(
    () => [...new Set(contacts.map((item) => item.zona).filter(Boolean))].sort((a, b) => Number(a) - Number(b)),
    [contacts]
  );

  const uniqueSections = useMemo(
    () => [...new Set(contacts.map((item) => item.secao).filter(Boolean))].sort((a, b) => Number(a) - Number(b)),
    [contacts]
  );

  const filteredContacts = useMemo(
    () =>
      contacts.filter((contact) => {
        const search = filters.search.toLowerCase();
        const matchesSearch =
          !search ||
          contact.nome.toLowerCase().includes(search) ||
          String(contact.telefone || '').includes(search);

        const matchesAudience =
          filters.audience === 'all' ||
          (filters.audience === 'volunteers' && contact.source === 'voluntarios') ||
          (filters.audience === 'leaderships' && contact.source === 'liderancas') ||
          contact.audienceTags.includes(filters.audience);

        const matchesNeighborhood = filters.bairro ? contact.bairro === filters.bairro : true;
        const matchesZone = filters.zona ? contact.zona === filters.zona : true;
        const matchesSection = filters.secao ? contact.secao === filters.secao : true;

        return matchesSearch && matchesAudience && matchesNeighborhood && matchesZone && matchesSection;
      }),
    [contacts, filters]
  );

  const openNew = () => {
    setSelectedTemplateId(null);
    setFormData(INITIAL_TEMPLATE);
    setShowModal(true);
  };

  const openEdit = (template) => {
    setSelectedTemplateId(template.id);
    setFormData({
      title: template.title || '',
      category: template.category || '',
      audience: template.audience || 'all',
      message: template.message || ''
    });
    setShowModal(true);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      await saveTemplate(formData, selectedTemplateId);
      setShowModal(false);
      setFormData(INITIAL_TEMPLATE);
      setSelectedTemplateId(null);
    } catch (error) {
      console.error('Erro ao salvar modelo:', error);
      alert('Não foi possível salvar o modelo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTemplateId) return;
    if (!window.confirm('Tem certeza que deseja excluir este modelo?')) return;
    try {
      await deleteTemplate(selectedTemplateId);
      setShowModal(false);
      setFormData(INITIAL_TEMPLATE);
      setSelectedTemplateId(null);
    } catch (error) {
      console.error('Erro ao excluir modelo:', error);
      alert('Não foi possível excluir o modelo.');
    }
  };

  const copyMessage = async (template, contact) => {
    const message = renderMessage(template, contact);
    await navigator.clipboard.writeText(message);
    alert(`Mensagem para ${contact.nome} copiada.`);
  };

  return (
    <div className="campaign-dashboard">
      <section className="campaign-filters-card">
        <div className="campaign-filters-header">
          <div>
            <p className="campaign-kicker">
              <MessageSquare size={16} />
              Fase 11
            </p>
            <h3>Comunicação</h3>
          </div>
          <button className="btn-primary" onClick={openNew} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={16} />
            Novo modelo
          </button>
        </div>

        <div className="campaign-filters-grid">
          <label className="funnel-filter-field">
            <span>Público</span>
            <select className="campaign-filter-select" value={filters.audience} onChange={(event) => setFilters((prev) => ({ ...prev, audience: event.target.value }))}>
              {AUDIENCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="funnel-filter-field">
            <span>Bairro</span>
            <select className="campaign-filter-select" value={filters.bairro} onChange={(event) => setFilters((prev) => ({ ...prev, bairro: event.target.value }))}>
              <option value="">Todos</option>
              {uniqueNeighborhoods.map((bairro) => (
                <option key={bairro} value={bairro}>{bairro}</option>
              ))}
            </select>
          </label>

          <label className="funnel-filter-field">
            <span>Zona</span>
            <select className="campaign-filter-select" value={filters.zona} onChange={(event) => setFilters((prev) => ({ ...prev, zona: event.target.value }))}>
              <option value="">Todas</option>
              {uniqueZones.map((zona) => (
                <option key={zona} value={zona}>{zona}</option>
              ))}
            </select>
          </label>

          <label className="funnel-filter-field">
            <span>Seção</span>
            <select className="campaign-filter-select" value={filters.secao} onChange={(event) => setFilters((prev) => ({ ...prev, secao: event.target.value }))}>
              <option value="">Todas</option>
              {uniqueSections.map((secao) => (
                <option key={secao} value={secao}>{secao}</option>
              ))}
            </select>
          </label>

          <label className="funnel-filter-field" style={{ gridColumn: '1 / -1' }}>
            <span>Busca</span>
            <div className="communication-search-box">
              <Search size={16} />
              <input value={filters.search} onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))} placeholder="Buscar por nome ou telefone" />
            </div>
          </label>
        </div>
      </section>

      <div className="campaign-metrics-grid">
        <MetricCard title="Contatos" value={stats.total} helper="Base disponível para segmentação" />
        <MetricCard title="Apoiadores" value={stats.supporters} helper="Público de mobilização" tone="success" />
        <MetricCard title="Voluntários" value={stats.volunteers} helper="Base de apoio operacional" />
        <MetricCard title="Lideranças" value={stats.leaderships} helper="Rede institucional" tone="highlight" />
        <MetricCard title="Aniversariantes" value={stats.birthdays} helper="Relacionamento do dia" />
        <MetricCard title="Modelos" value={stats.templates} helper="Biblioteca de mensagens" />
      </div>

      <div className="campaign-main-grid communication-main-grid">
        <InsightPanel title="Segmentação de contatos" subtitle="Filtros prontos para operação manual da comunicação">
          <div className="communication-contact-list">
            {loading ? <div className="campaign-empty-state">Carregando central de comunicação...</div> : null}
            {!loading && filteredContacts.length === 0 ? <div className="campaign-empty-state">Nenhum contato encontrado para os filtros atuais.</div> : null}

            {filteredContacts.map((contact) => (
              <article key={`${contact.source}-${contact.id}`} className="communication-contact-card">
                <div className="communication-contact-head">
                  <div>
                    <strong>{contact.nome}</strong>
                    <p>{contact.telefone || 'Sem telefone'} • {contact.bairro || 'Sem bairro'}</p>
                  </div>
                  <span className="communication-contact-source">{contact.source}</span>
                </div>

                <div className="communication-contact-tags">
                  {contact.audienceTags.length === 0 ? <span className="communication-tag">geral</span> : null}
                  {contact.audienceTags.map((tag) => (
                    <span key={tag} className="communication-tag">{tag}</span>
                  ))}
                </div>

                <div className="communication-template-actions">
                  {templates.slice(0, 3).map((template) => (
                    <button key={template.id} type="button" className="funnel-link-btn" onClick={() => copyMessage(template, contact)}>
                      <Copy size={14} />
                      {template.title}
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </InsightPanel>

        <InsightPanel title="Modelos de mensagem" subtitle="Biblioteca pronta para copiar e adaptar" compact>
          <div className="communication-template-list">
            {templates.map((template) => (
              <div key={template.id} className="communication-template-card">
                <div className="communication-template-head">
                  <div>
                    <strong>{template.title}</strong>
                    <p>{template.category || 'Sem categoria'} • {AUDIENCE_OPTIONS.find((item) => item.value === template.audience)?.label || 'Todos'}</p>
                  </div>
                  <button type="button" className="funnel-link-btn" onClick={() => openEdit(template)}>
                    Editar
                  </button>
                </div>
                <p className="communication-template-copy">{template.message}</p>
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
                <h3>{selectedTemplateId ? 'Editar modelo' : 'Novo modelo'}</h3>
                <p>Modelos reutilizáveis para relacionamento e mobilização, sem disparo automático.</p>
              </div>
              <button type="button" className="funnel-link-btn" onClick={() => setShowModal(false)}>
                Fechar
              </button>
            </div>

            <form className="funnel-modal-form" onSubmit={handleSave}>
              <div className="campaign-filters-grid">
                <label className="funnel-filter-field">
                  <span>Título</span>
                  <input className="campaign-filter-select" name="title" value={formData.title} onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))} required />
                </label>

                <label className="funnel-filter-field">
                  <span>Categoria</span>
                  <input className="campaign-filter-select" name="category" value={formData.category} onChange={(event) => setFormData((prev) => ({ ...prev, category: event.target.value }))} />
                </label>

                <label className="funnel-filter-field">
                  <span>Público padrão</span>
                  <select className="campaign-filter-select" name="audience" value={formData.audience} onChange={(event) => setFormData((prev) => ({ ...prev, audience: event.target.value }))}>
                    {AUDIENCE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>

                <label className="funnel-filter-field" style={{ gridColumn: '1 / -1' }}>
                  <span>Mensagem</span>
                  <textarea className="campaign-filter-select" name="message" rows="6" value={formData.message} onChange={(event) => setFormData((prev) => ({ ...prev, message: event.target.value }))} placeholder="Use variáveis como {{nome}} e {{bairro}}" required />
                </label>
              </div>

              <div className="communication-variables-box">
                <UsersRound size={18} />
                <span>Variáveis disponíveis: {'{{nome}}'}, {'{{bairro}}'}</span>
              </div>

              <div className="funnel-modal-actions">
                {selectedTemplateId && !String(selectedTemplateId).startsWith('tpl-') ? (
                  <button type="button" className="btn-secondary" onClick={handleDelete} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#dc2626', borderColor: '#fecaca' }}>
                    <Trash2 size={16} />
                    Excluir
                  </button>
                ) : <span />}

                <button type="submit" className="btn-primary" disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <Save size={16} />
                  {saving ? 'Salvando...' : 'Salvar modelo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
