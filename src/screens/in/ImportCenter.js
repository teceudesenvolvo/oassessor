import React, { useMemo, useState } from 'react';
import { CheckCircle2, FileUp, ListChecks, RefreshCw, ShieldCheck, UploadCloud } from 'lucide-react';
import InsightPanel from '../../components/dashboard/InsightPanel';
import MetricCard from '../../components/dashboard/MetricCard';
import { DEFAULT_FIELD_OPTIONS, IMPORT_STEPS, useImportWizard } from '../../hooks/useImportWizard';
import { useAuth } from '../../useAuth';

const STEP_LABELS = {
  upload: 'Upload',
  mapping: 'Mapeamento',
  validation: 'Validação',
  duplicates: 'Duplicidade',
  import: 'Importação',
  report: 'Relatório'
};

export default function ImportCenter() {
  const { user } = useAuth();
  const {
    step,
    setStep,
    headers,
    rows,
    mapping,
    setMapping,
    mappedRows,
    validation,
    duplicates,
    loadingExisting,
    isImporting,
    report,
    handleFileUpload,
    importRows,
    resetWizard
  } = useImportWizard(user);
  const [isDragging, setIsDragging] = useState(false);

  const previewRows = useMemo(() => mappedRows.slice(0, 5), [mappedRows]);

  const goNext = () => {
    if (step === 'mapping') setStep('validation');
    if (step === 'validation') setStep('duplicates');
    if (step === 'duplicates') setStep('import');
  };

  return (
    <div className="campaign-dashboard">
      <section className="campaign-filters-card">
        <div className="campaign-filters-header">
          <div>
            <p className="campaign-kicker">
              <UploadCloud size={16} />
              Fase 18
            </p>
            <h3>Assistente de Importação</h3>
          </div>
          <button className="btn-secondary" onClick={resetWizard} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <RefreshCw size={16} />
            Reiniciar
          </button>
        </div>

        <div className="import-stepper">
          {IMPORT_STEPS.map((item, index) => (
            <div key={item} className={`import-step-chip ${step === item ? 'active' : ''} ${IMPORT_STEPS.indexOf(step) > index ? 'done' : ''}`}>
              <span>{index + 1}</span>
              <strong>{STEP_LABELS[item]}</strong>
            </div>
          ))}
        </div>
      </section>

      <div className="campaign-metrics-grid">
        <MetricCard title="Linhas carregadas" value={rows.length} helper="Arquivo atual" />
        <MetricCard title="Válidas" value={validation.validRows.length} helper="Prontas para seguir" tone="success" />
        <MetricCard title="Com erro" value={validation.errors.length} helper="Exigem revisão" tone="danger" />
        <MetricCard title="Duplicadas" value={duplicates.duplicates.length} helper="Já existentes na base" tone="highlight" />
        <MetricCard title="Prontas para importar" value={duplicates.readyToImport.length} helper="Sem conflito" />
      </div>

      {step === 'upload' ? (
        <div className="campaign-main-grid import-main-grid">
          <InsightPanel title="1. Upload" subtitle="Envie o CSV da sua base eleitoral">
            <div
              className={`import-dropzone ${isDragging ? 'active' : ''}`}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                handleFileUpload(event.dataTransfer.files[0]);
              }}
            >
              <FileUp size={28} />
              <strong>Arraste o arquivo CSV aqui</strong>
              <p>Ou selecione manualmente. O assistente segue em seis etapas com foco em importação segura.</p>
              <input
                id="csv-import-wizard"
                type="file"
                hidden
                accept=".csv,text/csv"
                onChange={(event) => handleFileUpload(event.target.files?.[0])}
              />
              <button className="btn-primary" onClick={() => document.getElementById('csv-import-wizard')?.click()}>
                Selecionar CSV
              </button>
            </div>
          </InsightPanel>

          <InsightPanel title="Como funciona" subtitle="Fluxo guiado para reduzir erros" compact>
            <div className="campaign-notes-list">
              <div className="campaign-note-item">
                <strong>Mapeamento</strong>
                <p>Você revisa qual coluna vai para cada campo do eleitor.</p>
              </div>
              <div className="campaign-note-item">
                <strong>Validação</strong>
                <p>Identificamos linhas sem nome ou sem informação suficiente de contato/identificação.</p>
              </div>
              <div className="campaign-note-item">
                <strong>Duplicidade</strong>
                <p>Comparamos CPF, título, telefone e nome+bairro com a base atual.</p>
              </div>
            </div>
          </InsightPanel>
        </div>
      ) : null}

      {step === 'mapping' ? (
        <div className="campaign-main-grid import-main-grid">
          <InsightPanel title="2. Mapeamento" subtitle="Associe as colunas do CSV aos campos do portal">
            <div className="import-mapping-list">
              {headers.map((header) => (
                <div key={header} className="import-mapping-row">
                  <strong>{header}</strong>
                  <select
                    className="campaign-filter-select"
                    value={mapping[header] || ''}
                    onChange={(event) => setMapping((prev) => ({ ...prev, [header]: event.target.value }))}
                  >
                    {DEFAULT_FIELD_OPTIONS.map((option) => (
                      <option key={option.value || 'ignore'} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <div className="funnel-modal-actions">
              <span />
              <button className="btn-primary" onClick={goNext}>Continuar para validação</button>
            </div>
          </InsightPanel>

          <InsightPanel title="Prévia" subtitle="Primeiras linhas após o mapeamento" compact>
            <div className="reports-table-list">
              {previewRows.map((row, index) => (
                <div key={`${row.nome}-${index}`} className="reports-table-card">
                  <div className="reports-table-row"><strong>Nome</strong><span>{row.nome || '—'}</span></div>
                  <div className="reports-table-row"><strong>Telefone</strong><span>{row.telefone || '—'}</span></div>
                  <div className="reports-table-row"><strong>Bairro</strong><span>{row.bairro || '—'}</span></div>
                </div>
              ))}
            </div>
          </InsightPanel>
        </div>
      ) : null}

      {step === 'validation' ? (
        <div className="campaign-main-grid import-main-grid">
          <InsightPanel title="3. Validação" subtitle="Linhas que exigem ajuste antes da importação">
            <div className="import-review-list">
              {validation.errors.length === 0 ? (
                <div className="campaign-empty-state">Nenhuma inconsistência encontrada.</div>
              ) : (
                validation.errors.map((entry) => (
                  <article key={entry.index} className="audit-log-card">
                    <div className="audit-log-head">
                      <strong>Linha {entry.index + 2}</strong>
                      <span className="users-role-pill">{entry.row.nome || 'Sem nome'}</span>
                    </div>
                    <div className="audit-log-changes">
                      {entry.issues.map((issue) => <span key={issue} className="audit-change-pill">{issue}</span>)}
                    </div>
                  </article>
                ))
              )}
            </div>
            <div className="funnel-modal-actions">
              <button className="btn-secondary" onClick={() => setStep('mapping')}>Voltar ao mapeamento</button>
              <button className="btn-primary" onClick={goNext}>Continuar para duplicidade</button>
            </div>
          </InsightPanel>

          <InsightPanel title="Resumo" subtitle="Situação atual da validação" compact>
            <div className="campaign-list-block">
              <article className="campaign-list-item">
                <div>
                  <strong>{validation.validRows.length} linhas válidas</strong>
                  <p>{validation.errors.length} linhas precisam de correção ou serão desconsideradas nesta rodada.</p>
                </div>
                <ListChecks size={18} color="#2563eb" />
              </article>
            </div>
          </InsightPanel>
        </div>
      ) : null}

      {step === 'duplicates' ? (
        <div className="campaign-main-grid import-main-grid">
          <InsightPanel title="4. Duplicidade" subtitle="Conferência com a base atual de eleitores">
            {loadingExisting ? <div className="campaign-empty-state">Conferindo base existente...</div> : null}
            {!loadingExisting ? (
              <div className="import-review-list">
                {duplicates.duplicates.length === 0 ? <div className="campaign-empty-state">Nenhuma duplicidade detectada.</div> : null}
                {duplicates.duplicates.map((item) => (
                  <article key={item.index} className="audit-log-card">
                    <div className="audit-log-head">
                      <div>
                        <strong>{item.row.nome}</strong>
                        <p>Possível duplicidade com {item.duplicate?.nome || 'registro existente'}</p>
                      </div>
                      <span className="users-role-pill">Revisar</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
            <div className="funnel-modal-actions">
              <button className="btn-secondary" onClick={() => setStep('validation')}>Voltar à validação</button>
              <button className="btn-primary" onClick={goNext}>Continuar para importação</button>
            </div>
          </InsightPanel>

          <InsightPanel title="Prontas para importar" subtitle="Linhas sem conflito" compact>
            <div className="campaign-list-block">
              {duplicates.readyToImport.slice(0, 6).map((item) => (
                <article key={item.index} className="campaign-list-item">
                  <div>
                    <strong>{item.row.nome}</strong>
                    <p>{item.row.bairro || 'Sem bairro'} • {item.row.telefone || item.row.email || 'Sem contato'}</p>
                  </div>
                  <ShieldCheck size={18} color="#16a34a" />
                </article>
              ))}
            </div>
          </InsightPanel>
        </div>
      ) : null}

      {step === 'import' ? (
        <div className="campaign-main-grid import-main-grid">
          <InsightPanel title="5. Importação" subtitle="Confirme e grave os novos eleitores">
            <div className="campaign-notes-list">
              <div className="campaign-note-item">
                <strong>{duplicates.readyToImport.length} registros serão importados</strong>
                <p>{duplicates.duplicates.length} foram tratados como possíveis duplicados e {validation.errors.length} ficaram inválidos nesta execução.</p>
              </div>
            </div>
            <div className="funnel-modal-actions">
              <button className="btn-secondary" onClick={() => setStep('duplicates')}>Voltar à duplicidade</button>
              <button className="btn-primary" onClick={importRows} disabled={isImporting || duplicates.readyToImport.length === 0}>
                {isImporting ? 'Importando...' : 'Importar agora'}
              </button>
            </div>
          </InsightPanel>

          <InsightPanel title="Compatibilidade" subtitle="Padrão usado na gravação" compact>
            <div className="campaign-notes-list">
              <div className="campaign-note-item">
                <strong>Mesma base de eleitores</strong>
                <p>Os dados entram em `eleitores` seguindo o padrão já usado pelo cadastro manual.</p>
              </div>
            </div>
          </InsightPanel>
        </div>
      ) : null}

      {step === 'report' ? (
        <div className="campaign-main-grid import-main-grid">
          <InsightPanel title="6. Relatório" subtitle="Resumo final da execução">
            <div className="campaign-notes-list">
              <div className="campaign-note-item"><strong>Total lido</strong><p>{report?.totalRows || 0} linhas no CSV.</p></div>
              <div className="campaign-note-item"><strong>Importados</strong><p>{report?.imported || 0} novos eleitores gravados.</p></div>
              <div className="campaign-note-item"><strong>Inválidos</strong><p>{report?.invalidRows || 0} registros ficaram fora por validação.</p></div>
              <div className="campaign-note-item"><strong>Duplicados</strong><p>{report?.duplicates || 0} registros já existiam ou tinham forte indício de duplicidade.</p></div>
            </div>
          </InsightPanel>

          <InsightPanel title="Importação concluída" subtitle="Próximo passo sugerido" compact>
            <div className="campaign-list-block">
              <article className="campaign-list-item">
                <div>
                  <strong>Base pronta para operação</strong>
                  <p>Agora você pode revisar os eleitores importados no módulo de eleitores e seguir para classificação no funil.</p>
                </div>
                <CheckCircle2 size={18} color="#16a34a" />
              </article>
            </div>
          </InsightPanel>
        </div>
      ) : null}
    </div>
  );
}
