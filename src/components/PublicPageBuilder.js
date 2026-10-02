import React from 'react';
import { ArrowDown, ArrowUp, CalendarClock, ChevronDown, Eye, EyeOff, FileText, Image, Link2, Plus, Trash2, Users, Wrench } from 'lucide-react';

const BLOCK_TYPES = [
  { type: 'text', label: 'Texto', icon: FileText },
  { type: 'image', label: 'Imagem', icon: Image },
  { type: 'link', label: 'Link personalizado', icon: Link2 },
  { type: 'voterForm', label: 'Cadastro de eleitor', icon: Users },
  { type: 'demandForm', label: 'Envio de demanda', icon: Wrench },
  { type: 'appointment', label: 'Agendamento', icon: CalendarClock },
  { type: 'customForm', label: 'Formulário personalizado', icon: Plus }
];

const makeId = () => `block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const createBlock = (type) => {
  const base = { id: makeId(), type, title: '', content: '' };
  if (type === 'image') return { ...base, title: 'Imagem', imageUrl: '', alt: '' };
  if (type === 'link') return { ...base, title: 'Saiba mais', url: '', description: '' };
  if (type === 'voterForm') return { ...base, title: 'Cadastre-se como eleitor', description: 'Participe da comunidade.' };
  if (type === 'demandForm') return { ...base, title: 'Envie uma demanda', description: 'Conte como o gabinete pode ajudar.' };
  if (type === 'appointment') return { ...base, title: 'Agende um atendimento', description: 'Escolha um serviço e horário.' };
  if (type === 'customForm') return { ...base, title: 'Fale com o gabinete', description: '', submitLabel: 'Enviar', fields: [{ id: makeId(), label: 'Seu nome', type: 'text', required: true }] };
  return { ...base, title: 'Título da seção', content: 'Escreva seu texto aqui.' };
};

function Field({ label, children }) {
  return <label className="public-builder-field"><span>{label}</span>{children}</label>;
}

export default function PublicPageBuilder({ blocks = [], onChange, selectedBlockId, onSelectBlock }) {
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [openBlockId, setOpenBlockId] = React.useState(null);
  React.useEffect(() => {
    if (!selectedBlockId) return;
    setOpenBlockId(selectedBlockId);
    window.requestAnimationFrame(() => document.getElementById(`public-builder-${selectedBlockId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  }, [selectedBlockId]);
  const updateBlock = (index, changes) => onChange(blocks.map((block, itemIndex) => itemIndex === index ? { ...block, ...changes } : block));
  const moveBlock = (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    onChange(next);
  };
  const addField = (block) => ({ ...block, fields: [...(block.fields || []), { id: makeId(), label: 'Novo campo', type: 'text', required: false }] });

  return (
    <div className="public-builder">
      {!blocks.length ? <div className="public-builder-empty">A página ainda está vazia. Use os botões abaixo para adicionar o primeiro bloco.</div> : null}
      <div className="public-builder-blocks">
        {blocks.map((block, index) => {
          const typeLabel = BLOCK_TYPES.find((item) => item.type === block.type)?.label || 'Bloco';
          const blockId = block.id || `block-index-${index}`;
          const isOpen = openBlockId === blockId;
          return <article className={`public-builder-block ${isOpen ? 'is-open' : 'is-collapsed'}`} id={`public-builder-${blockId}`} key={blockId}>
            <header><button type="button" className="public-builder-block-toggle" aria-expanded={isOpen} onClick={() => { setOpenBlockId(isOpen ? null : blockId); onSelectBlock?.(isOpen ? null : blockId); }}><span><strong>{String(index + 1).padStart(2, '0')}</strong>{typeLabel}</span><ChevronDown size={18} /></button><div>
              <button type="button" title="Mover para cima" aria-label="Mover para cima" disabled={index === 0} onClick={() => moveBlock(index, -1)}><ArrowUp size={16} /></button>
              <button type="button" title="Mover para baixo" aria-label="Mover para baixo" disabled={index === blocks.length - 1} onClick={() => moveBlock(index, 1)}><ArrowDown size={16} /></button>
              <button type="button" title="Remover bloco" aria-label="Remover bloco" onClick={() => onChange(blocks.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={16} /></button>
            </div></header>
            {isOpen ? <div className="public-builder-block-fields">
              {block.type === 'text' ? <><Field label="Título"><input value={block.title || ''} maxLength={120} onChange={(event) => updateBlock(index, { title: event.target.value })} /></Field><Field label="Texto"><textarea rows={5} maxLength={4000} value={block.content || ''} onChange={(event) => updateBlock(index, { content: event.target.value })} /></Field><Field label="Imagem (opcional)"><input type="file" accept="image/*" onChange={(event) => updateBlock(index, { imageFile: event.target.files?.[0] || null, imageUrl: event.target.files?.[0] ? URL.createObjectURL(event.target.files[0]) : block.imageUrl })} /></Field><Field label="ou URL da imagem"><input type="url" placeholder="https://..." value={block.imageUrl || ''} onChange={(event) => updateBlock(index, { imageUrl: event.target.value, imageFile: null })} /></Field><Field label="Descrição da imagem"><input maxLength={180} value={block.imageAlt || ''} onChange={(event) => updateBlock(index, { imageAlt: event.target.value })} /></Field><Field label="Posição da imagem"><select value={block.imagePosition || 'top'} onChange={(event) => updateBlock(index, { imagePosition: event.target.value })}><option value="top">Acima do texto</option><option value="right">À direita do texto</option><option value="left">À esquerda do texto</option><option value="bottom">Abaixo do texto</option></select></Field><Field label="Espaçamento da imagem (px)"><input type="number" min="0" max="120" value={block.imageSpacing ?? 20} onChange={(event) => updateBlock(index, { imageSpacing: Math.max(0, Math.min(120, Number(event.target.value) || 0)) })} /></Field></> : null}
              {block.type === 'image' ? <><Field label="Imagem"><input type="file" accept="image/*" onChange={(event) => updateBlock(index, { imageFile: event.target.files?.[0] || null, imageUrl: event.target.files?.[0] ? URL.createObjectURL(event.target.files[0]) : block.imageUrl })} /></Field><Field label="ou URL da imagem"><input type="url" placeholder="https://..." value={block.imageUrl || ''} onChange={(event) => updateBlock(index, { imageUrl: event.target.value, imageFile: null })} /></Field><Field label="Descrição da imagem"><input maxLength={180} value={block.alt || ''} onChange={(event) => updateBlock(index, { alt: event.target.value })} /></Field><Field label="Legenda"><input maxLength={180} value={block.title || ''} onChange={(event) => updateBlock(index, { title: event.target.value })} /></Field></> : null}
              {block.type === 'link' ? <><Field label="Texto do botão"><input maxLength={100} value={block.title || ''} onChange={(event) => updateBlock(index, { title: event.target.value })} /></Field><Field label="Endereço do link"><input type="url" placeholder="https://..." value={block.url || ''} onChange={(event) => updateBlock(index, { url: event.target.value })} /></Field><Field label="Descrição"><textarea rows={2} maxLength={300} value={block.description || ''} onChange={(event) => updateBlock(index, { description: event.target.value })} /></Field><Field label="Cor do botão"><input type="color" value={block.buttonColor || '#50d59a'} onChange={(event) => updateBlock(index, { buttonColor: event.target.value })} /></Field><Field label="Cor do texto do botão"><input type="color" value={block.buttonTextColor || '#09203a'} onChange={(event) => updateBlock(index, { buttonTextColor: event.target.value })} /></Field></> : null}
              {['voterForm', 'demandForm', 'appointment'].includes(block.type) ? <><Field label="Título do atalho"><input maxLength={100} value={block.title || ''} onChange={(event) => updateBlock(index, { title: event.target.value })} /></Field><Field label="Descrição"><input maxLength={240} value={block.description || ''} onChange={(event) => updateBlock(index, { description: event.target.value })} /></Field><Field label="Cor do botão"><input type="color" value={block.buttonColor || '#50d59a'} onChange={(event) => updateBlock(index, { buttonColor: event.target.value })} /></Field><Field label="Cor do texto do botão"><input type="color" value={block.buttonTextColor || '#09203a'} onChange={(event) => updateBlock(index, { buttonTextColor: event.target.value })} /></Field><button className="btn-secondary" type="button" onClick={() => updateBlock(index, { buttonColor: '', buttonTextColor: '' })}>Usar cores do tema</button></> : null}
              {block.type === 'customForm' ? <>
                <Field label="Título do formulário"><input maxLength={120} value={block.title || ''} onChange={(event) => updateBlock(index, { title: event.target.value })} /></Field>
                <Field label="Descrição"><textarea rows={2} maxLength={400} value={block.description || ''} onChange={(event) => updateBlock(index, { description: event.target.value })} /></Field>
                <div className="public-builder-form-fields"><strong>Campos</strong>{(block.fields || []).map((field, fieldIndex) => <div className="public-builder-form-field" key={field.id || fieldIndex}>
                  <input aria-label="Nome do campo" value={field.label || ''} maxLength={80} onChange={(event) => updateBlock(index, { fields: block.fields.map((item, i) => i === fieldIndex ? { ...item, label: event.target.value } : item) })} />
                  <select aria-label="Tipo do campo" value={field.type || 'text'} onChange={(event) => updateBlock(index, { fields: block.fields.map((item, i) => i === fieldIndex ? { ...item, type: event.target.value } : item) })}><option value="text">Texto</option><option value="email">E-mail</option><option value="tel">Telefone</option><option value="textarea">Texto longo</option></select>
                  <label><input type="checkbox" checked={!!field.required} onChange={(event) => updateBlock(index, { fields: block.fields.map((item, i) => i === fieldIndex ? { ...item, required: event.target.checked } : item) })} /> Obrigatório</label>
                  <button type="button" aria-label="Remover campo" disabled={block.fields.length <= 1} onClick={() => updateBlock(index, { fields: block.fields.filter((_, i) => i !== fieldIndex) })}><Trash2 size={15} /></button>
                </div>)}
                  <button className="public-builder-add-field" type="button" onClick={() => updateBlock(index, addField(block))}><Plus size={15} /> Adicionar campo</button>
                </div>
                <Field label="Texto do botão"><input maxLength={40} value={block.submitLabel || ''} onChange={(event) => updateBlock(index, { submitLabel: event.target.value })} /></Field>
                <Field label="Cor do botão"><input type="color" value={block.buttonColor || '#50d59a'} onChange={(event) => updateBlock(index, { buttonColor: event.target.value })} /></Field>
                <Field label="Cor do texto do botão"><input type="color" value={block.buttonTextColor || '#09203a'} onChange={(event) => updateBlock(index, { buttonTextColor: event.target.value })} /></Field>
                <button className="btn-secondary" type="button" onClick={() => updateBlock(index, { buttonColor: '', buttonTextColor: '' })}>Usar cores do tema</button>
              </> : null}
            </div> : null}
          </article>;
        })}
      </div>
      <div className="public-builder-toolbar">
        <div><strong>Adicionar conteúdo</strong><span>Os novos blocos serão incluídos ao final da página.</span></div>
        <div className="public-builder-add-list">{BLOCK_TYPES.map(({ type, label, icon: Icon }) => <button type="button" key={type} onClick={() => { const block = createBlock(type); setOpenBlockId(block.id); onSelectBlock?.(block.id); onChange([...blocks, block]); }}><Plus size={15} /><Icon size={16} />{label}</button>)}</div>
      </div>
      <button type="button" className="public-builder-preview-toggle" onClick={() => setPreviewOpen((open) => !open)}>{previewOpen ? <EyeOff size={16} /> : <Eye size={16} />}{previewOpen ? 'Fechar prévia' : 'Pré-visualizar página'}</button>
      {previewOpen ? <div className="public-builder-preview"><span className="public-builder-preview-label">Prévia do conteúdo</span>{blocks.map((block, index) => {
        if (block.type === 'text') return <article className={`public-content-block public-content-text layout-${block.imagePosition || 'top'}`} style={{ '--text-image-gap': `${Math.max(0, Math.min(120, Number(block.imageSpacing) || 0))}px` }} key={block.id || index}>{block.imageUrl ? <img className="public-content-text-image" src={block.imageUrl} alt={block.imageAlt || ''} /> : null}<div className="public-content-text-body">{block.title ? <h2>{block.title}</h2> : null}<p>{block.content || 'Seu texto aparecerá aqui.'}</p></div></article>;
        if (block.type === 'image') return <article className="public-content-block public-content-image" key={block.id || index}>{block.imageUrl ? <img src={block.imageUrl} alt={block.alt || ''} /> : <div className="public-builder-image-placeholder">Imagem: adicione o endereço da imagem</div>}{block.title ? <p>{block.title}</p> : null}</article>;
        if (block.type === 'link' || block.type === 'voterForm' || block.type === 'demandForm' || block.type === 'appointment') return <article className="public-action-link" style={{ '--shortcut-button': block.buttonColor || undefined, '--shortcut-button-text': block.buttonTextColor || undefined }} key={block.id || index}><span><strong>{block.title || (block.type === 'voterForm' ? 'Cadastro de eleitor' : block.type === 'demandForm' ? 'Envio de demanda' : block.type === 'appointment' ? 'Agendamento' : 'Seu link')}</strong><small>{block.description || (block.type === 'link' ? block.url : 'Atalho para a comunidade')}</small></span><Link2 size={17} /></article>;
        if (block.type === 'customForm') return <article className="public-content-block" key={block.id || index}><h2>{block.title || 'Formulário'}</h2>{(block.fields || []).map((field, i) => <div className="public-builder-preview-field" key={field.id || i}>{field.label || 'Campo'}{field.required ? ' *' : ''}<div /></div>)}<button className="btn-primary" style={{ '--shortcut-button': block.buttonColor || undefined, '--shortcut-button-text': block.buttonTextColor || undefined }} type="button">{block.submitLabel || 'Enviar'}</button></article>;
        return null;
      })}</div> : null}
    </div>
  );
}
