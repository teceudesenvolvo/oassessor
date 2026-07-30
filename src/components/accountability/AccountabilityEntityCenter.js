import React, { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import InsightPanel from '../dashboard/InsightPanel';
import CurrencyValue from './CurrencyValue';
import StatusBadge from './StatusBadge';

const formatDate = (value) => {
  if (!value) return 'Sem data';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(date);
};

export default function AccountabilityEntityCenter({
  title,
  subtitle,
  emptyText,
  fields,
  records,
  saving,
  onSave,
  onDelete,
  initialForm,
  renderSummary
}) {
  const [form, setForm] = useState(initialForm);
  const [deleteReason, setDeleteReason] = useState('');
  const [formVersion, setFormVersion] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const summary = useMemo(() => (renderSummary ? renderSummary(records) : null), [records, renderSummary]);

  useEffect(() => {
    setForm(initialForm);
    setEditingId(null);
    setIsModalOpen(false);
    setFormVersion((prev) => prev + 1);
  }, [initialForm]);

  const reset = () => {
    setForm(initialForm);
    setEditingId(null);
    setIsModalOpen(false);
    setFormVersion((prev) => prev + 1);
  };

  return (
    <>
      <InsightPanel title={title} subtitle={subtitle}>
        {summary}
        <div className="accountability-toolbar">
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setForm(initialForm);
              setEditingId(null);
              setIsModalOpen(true);
              setFormVersion((prev) => prev + 1);
            }}
          >
            <Plus size={16} />
            Novo registro
          </button>
        </div>
        <div className="campaign-list-block">
          {records.length === 0 ? <div className="campaign-empty-state">{emptyText}</div> : null}
          {records.map((record) => (
            <article key={record.id} className="campaign-list-item accountability-record-item">
              <div>
                <strong>{record.title || record.description || record.name || record.bankName || record.documentName || 'Registro'}</strong>
                <p>
                  {record.amountCents !== undefined ? <CurrencyValue valueCents={record.amountCents} /> : null}
                  {record.amountCents !== undefined ? ' • ' : ''}
                  {record.date ? formatDate(record.date) : formatDate(record.updatedAt || record.createdAt)}
                </p>
                <div className="audit-log-details">
                  {record.category ? <span>{record.category}</span> : null}
                  {record.accountName ? <span>{record.accountName}</span> : null}
                  {record.documentName ? <span>{record.documentName}</span> : null}
                </div>
              </div>
              <div className="accountability-record-actions">
                <StatusBadge status={record.status || 'ativo'} />
                <button
                  type="button"
                  className="funnel-link-btn"
                  onClick={() => {
                    setEditingId(record.id);
                    setForm({ ...initialForm, ...record, invoiceFile: null });
                    setIsModalOpen(true);
                    setFormVersion((prev) => prev + 1);
                  }}
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  className="funnel-link-btn"
                  onClick={() => {
                    const reason = window.prompt('Informe a justificativa para arquivar este registro:', deleteReason);
                    if (reason) onDelete(record.id, reason);
                    setDeleteReason('');
                  }}
                  style={{ color: '#dc2626' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
      </InsightPanel>

      {isModalOpen ? (
        <div className="funnel-modal-backdrop dashboard-modal-backdrop" onClick={reset}>
          <div className="funnel-modal accountability-form-modal" onClick={(event) => event.stopPropagation()}>
            <div className="funnel-modal-header">
              <div>
                <h3>{editingId ? `Editando ${title.toLowerCase()}` : `Novo registro de ${title.toLowerCase()}`}</h3>
                <p>{editingId ? 'Atualize os campos e salve para aplicar as alterações.' : 'Preencha os campos e salve para incluir o novo registro.'}</p>
              </div>
              <button type="button" className="accountability-modal-close" onClick={reset} aria-label="Fechar modal">
                <X size={18} />
              </button>
            </div>

            <div className="campaign-filters-grid accountability-modal-grid">
              {fields.filter((field) => !(typeof field.hidden === 'function' ? field.hidden(form) : field.hidden)).map((field) => (
                <label key={field.name} className={`funnel-filter-field ${field.full ? 'full' : ''}`}>
                  <span>{field.label}</span>
                  {field.type === 'select' ? (
                    <select
                      className="campaign-filter-select"
                      value={String(form[field.name] ?? '')}
                      onChange={(event) => setForm((prev) => (field.onChange ? field.onChange(event, prev) : ({ ...prev, [field.name]: event.target.value })))}
                    >
                      {(field.options || []).map((option) => (
                        <option key={String(option.value)} value={String(option.value)}>{option.label}</option>
                      ))}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea
                      className="campaign-filter-select"
                      value={form[field.name] ?? ''}
                      placeholder={field.placeholder || ''}
                      rows={field.rows || 4}
                      onChange={(event) => setForm((prev) => (field.onChange ? field.onChange(event, prev) : ({ ...prev, [field.name]: event.target.value })))}
                    />
                  ) : field.type === 'file' ? (
                    <div className="accountability-file-field">
                      <input
                        key={`${field.name}-${formVersion}`}
                        type="file"
                        className="campaign-filter-select"
                        accept={field.accept || '*'}
                        onChange={(event) => setForm((prev) => (field.onChange ? field.onChange(event, prev) : ({ ...prev, [field.name]: event.target.files?.[0] || null })))}
                      />
                      {form[field.name]?.name ? <small>{form[field.name].name}</small> : null}
                    </div>
                  ) : (
                    <input
                      type={field.type || 'text'}
                      className="campaign-filter-select"
                      value={form[field.name] ?? ''}
                      placeholder={field.placeholder || ''}
                      onChange={(event) => setForm((prev) => (field.onChange ? field.onChange(event, prev) : ({ ...prev, [field.name]: event.target.value })))}
                    />
                  )}
                  {field.helper ? <small className="accountability-field-helper">{field.helper}</small> : null}
                </label>
              ))}
            </div>

            <div className="funnel-modal-actions">
              <button type="button" className="btn-secondary" onClick={reset}>
                <Plus size={16} />
                {editingId ? 'Cancelar edição' : 'Limpar'}
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={saving}
                onClick={async () => {
                  await onSave(form, editingId);
                  reset();
                }}
              >
                <Save size={16} />
                {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Salvar registro'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
