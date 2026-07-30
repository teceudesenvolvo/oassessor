import { useCallback, useEffect, useMemo, useState } from 'react';
import { equalTo, get, orderByChild, push, query, ref, set } from '../services/firestoreDatabase';
import { database } from '../firebaseConfig';
import { logAuditEvent } from '../services/auditService';
import { checkVoterPlanLimit } from '../services/planLimits';

export const IMPORT_STEPS = [
  'upload',
  'mapping',
  'validation',
  'duplicates',
  'import',
  'report'
];

export const DEFAULT_FIELD_OPTIONS = [
  { value: '', label: 'Ignorar coluna' },
  { value: 'nome', label: 'Nome' },
  { value: 'email', label: 'E-mail' },
  { value: 'telefone', label: 'Telefone' },
  { value: 'bairro', label: 'Bairro' },
  { value: 'cidade', label: 'Cidade' },
  { value: 'estado', label: 'Estado' },
  { value: 'cpf', label: 'CPF' },
  { value: 'nascimento', label: 'Nascimento' },
  { value: 'titulo', label: 'Título' },
  { value: 'zona', label: 'Zona' },
  { value: 'secao', label: 'Seção' },
  { value: 'endereco', label: 'Endereço' },
  { value: 'numero', label: 'Número' },
  { value: 'cep', label: 'CEP' },
  { value: 'localVotacao', label: 'Local de votação' },
  { value: 'observacoes', label: 'Observações' }
];

const DEFAULT_MAPPING_GUESSES = {
  nome: ['nome', 'nome completo', 'eleitor', 'votante'],
  email: ['email', 'e-mail', 'mail'],
  telefone: ['telefone', 'celular', 'whatsapp', 'fone'],
  bairro: ['bairro'],
  cidade: ['cidade', 'municipio', 'município'],
  estado: ['estado', 'uf'],
  cpf: ['cpf'],
  nascimento: ['nascimento', 'data nascimento', 'data de nascimento'],
  titulo: ['titulo', 'título', 'titulo eleitor', 'título eleitor'],
  zona: ['zona'],
  secao: ['secao', 'seção'],
  endereco: ['endereco', 'endereço', 'logradouro', 'rua'],
  numero: ['numero', 'número'],
  cep: ['cep'],
  localVotacao: ['local votacao', 'local votação', 'local de votacao', 'local de votação'],
  observacoes: ['observacoes', 'observações', 'obs']
};

const normalizeText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const normalizeUpper = (value) => String(value || '').trim().toUpperCase();
const digitsOnly = (value) => String(value || '').replace(/\D/g, '');

const splitCsvLine = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ';' && !inQuotes) {
      result.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
};

const guessMapping = (headers) => {
  const mapped = {};
  headers.forEach((header) => {
    const normalized = normalizeText(header);
    const match = Object.entries(DEFAULT_MAPPING_GUESSES).find(([, aliases]) =>
      aliases.some((alias) => normalized.includes(normalizeText(alias)))
    );
    mapped[header] = match?.[0] || '';
  });
  return mapped;
};

const mapRow = (row, mapping) => {
  const formatted = {
    nome: '',
    apelido: '',
    instagram: '',
    sexo: '',
    email: '',
    telefone: '',
    bairro: '',
    cidade: '',
    estado: '',
    cpf: '',
    nascimento: '',
    titulo: '',
    zona: '',
    secao: '',
    endereco: '',
    numero: '',
    cep: '',
    localVotacao: '',
    observacoes: ''
  };

  Object.entries(mapping).forEach(([header, targetField]) => {
    if (!targetField) return;
    formatted[targetField] = row[header] || '';
  });

  return {
    ...formatted,
    nome: formatted.nome.trim(),
    email: formatted.email.trim().toLowerCase(),
    telefone: formatted.telefone.trim(),
    bairro: normalizeUpper(formatted.bairro),
    cidade: normalizeUpper(formatted.cidade),
    estado: normalizeUpper(formatted.estado),
    endereco: normalizeUpper(formatted.endereco),
    numero: formatted.numero.trim(),
    cep: formatted.cep.trim(),
    cpf: formatted.cpf.trim(),
    nascimento: formatted.nascimento.trim(),
    titulo: formatted.titulo.trim(),
    zona: formatted.zona.trim(),
    secao: formatted.secao.trim(),
    localVotacao: normalizeUpper(formatted.localVotacao),
    observacoes: formatted.observacoes.trim()
  };
};

export function useImportWizard(user) {
  const [step, setStep] = useState('upload');
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [existingVoters, setExistingVoters] = useState([]);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [report, setReport] = useState(null);

  useEffect(() => {
    if (!user) return;

    let active = true;

    const loadExisting = async () => {
      try {
        setLoadingExisting(true);

        let currentUserType = null;
        let resolvedAdminId = user.uid;

        if (user.email) {
          const assessoresRef = ref(database, 'assessores');
          const qEmail = query(assessoresRef, orderByChild('email'), equalTo(user.email));
          const snapshotEmail = await get(qEmail);
          if (snapshotEmail.exists()) currentUserType = 'assessor';
        }

        const usersRef = ref(database, 'users');
        const qUser = query(usersRef, orderByChild('userId'), equalTo(user.uid));
        const userSnapshot = await get(qUser);
        if (userSnapshot.exists()) {
          const userData = Object.values(userSnapshot.val())[0];
          currentUserType = userData.tipoUser || currentUserType;
          if (userData.adminId) resolvedAdminId = userData.adminId;
        }

        const effectiveAdminId = currentUserType === 'admin' ? user.uid : resolvedAdminId;

        const ownerIds = new Set([effectiveAdminId]);
        const ownerEmails = new Set([user.email].filter(Boolean));

        const assessoresRef = ref(database, 'assessores');
        const assessorsSnapshot = await get(query(assessoresRef, orderByChild('adminId'), equalTo(effectiveAdminId)));
        if (assessorsSnapshot.exists()) {
          Object.values(assessorsSnapshot.val()).forEach((assessor) => {
            if (assessor.userId) ownerIds.add(assessor.userId);
            if (assessor.email) ownerEmails.add(assessor.email);
          });
        }

        const votersSnapshot = await get(ref(database, 'eleitores'));
        const allVoters = votersSnapshot.exists()
          ? Object.entries(votersSnapshot.val()).map(([id, value]) => ({ id, ...value }))
          : [];

        const scopedVoters = allVoters.filter((entry) =>
          ownerIds.has(entry.creatorId) || ownerEmails.has(entry.creatorEmail)
        );

        if (!active) return;
        setExistingVoters(scopedVoters);
      } catch (error) {
        console.error('Erro ao carregar base existente para importação:', error);
      } finally {
        if (active) setLoadingExisting(false);
      }
    };

    loadExisting();
    return () => {
      active = false;
    };
  }, [user]);

  const handleFileUpload = useCallback((file) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = String(event.target?.result || '');
      const lines = text
        .split(/\r\n|\n\r|\n|\r/)
        .map((line) => line.trim())
        .filter(Boolean);

      if (!lines.length) {
        alert('O arquivo CSV está vazio.');
        return;
      }

      const parsedHeaders = splitCsvLine(lines[0]);
      const parsedRows = lines.slice(1).map((line) => {
        const values = splitCsvLine(line);
        return parsedHeaders.reduce((acc, header, index) => {
          acc[header] = values[index] || '';
          return acc;
        }, {});
      });

      setHeaders(parsedHeaders);
      setRows(parsedRows);
      setMapping(guessMapping(parsedHeaders));
      setReport(null);
      setStep('mapping');
    };

    reader.readAsText(file, 'utf-8');
  }, []);

  const mappedRows = useMemo(() => rows.map((row) => mapRow(row, mapping)), [rows, mapping]);

  const validation = useMemo(() => {
    const errors = [];
    const validRows = [];

    mappedRows.forEach((row, index) => {
      const issues = [];
      if (!row.nome) issues.push('Nome obrigatório');
      if (!row.telefone && !row.email && !row.cpf && !row.titulo) {
        issues.push('Informe ao menos telefone, e-mail, CPF ou título');
      }
      if (issues.length) {
        errors.push({ index, row, issues });
      } else {
        validRows.push({ index, row });
      }
    });

    return {
      errors,
      validRows
    };
  }, [mappedRows]);

  const duplicates = useMemo(() => {
    const results = validation.validRows.map(({ index, row }) => {
      const duplicate = existingVoters.find((item) => {
        const byCpf = digitsOnly(row.cpf) && digitsOnly(item.cpf) && digitsOnly(row.cpf) === digitsOnly(item.cpf);
        const byTitulo = digitsOnly(row.titulo) && digitsOnly(item.titulo) && digitsOnly(row.titulo) === digitsOnly(item.titulo);
        const byPhone = digitsOnly(row.telefone) && digitsOnly(item.telefone) && digitsOnly(row.telefone) === digitsOnly(item.telefone);
        const byNameNeighborhood =
          normalizeText(row.nome) &&
          normalizeText(item.nome) &&
          normalizeText(row.nome) === normalizeText(item.nome) &&
          normalizeText(row.bairro) &&
          normalizeText(row.bairro) === normalizeText(item.bairro);
        return byCpf || byTitulo || byPhone || byNameNeighborhood;
      });

      return {
        index,
        row,
        duplicate
      };
    });

    return {
      duplicates: results.filter((item) => item.duplicate),
      readyToImport: results.filter((item) => !item.duplicate)
    };
  }, [existingVoters, validation.validRows]);

  const importRows = useCallback(async () => {
    if (!user) return;

    try {
      setIsImporting(true);
      const limitCheck = await checkVoterPlanLimit(user, duplicates.readyToImport.length);
      if (!limitCheck.allowed) {
        alert(limitCheck.message);
        return;
      }

      const importedIds = [];

      for (const item of duplicates.readyToImport) {
        const newRef = push(ref(database, 'eleitores'));
        await set(newRef, {
          ...item.row,
          funnelStage: 'Não contatado',
          funnelNotes: item.row.observacoes || '',
          funnelNextContact: '',
          funnelOwner: user.displayName || user.email || 'Equipe',
          funnelUpdatedAt: new Date().toISOString(),
          etapa: 'Não contatado',
          creatorId: user.uid,
          creatorEmail: user.email || '',
          createdAt: new Date().toISOString(),
          importedAt: new Date().toISOString(),
          importSource: 'csv_wizard'
        });
        importedIds.push(newRef.key);
      }

      const finalReport = {
        totalRows: rows.length,
        mappedRows: mappedRows.length,
        invalidRows: validation.errors.length,
        duplicates: duplicates.duplicates.length,
        imported: duplicates.readyToImport.length,
        importedIds
      };

      setReport(finalReport);
      setStep('report');

      await logAuditEvent({
        user,
        action: 'create',
        entity: 'import',
        entityId: 'csv-wizard',
        entityLabel: 'Assistente de Importação',
        details: {
          format: 'csv',
          targetName: 'eleitores',
          rows: duplicates.readyToImport.length,
          changes: ['upload', 'mapping', 'validation', 'duplicates', 'import', 'report']
        }
      });

      await logAuditEvent({
        user,
        action: 'export',
        entity: 'import',
        entityId: 'csv-wizard-report',
        entityLabel: 'Relatório de Importação',
        details: {
          format: 'wizard-report',
          targetName: 'eleitores',
          rows: rows.length
        }
      });
    } catch (error) {
      console.error('Erro ao importar CSV:', error);
      alert('Não foi possível concluir a importação.');
    } finally {
      setIsImporting(false);
    }
  }, [duplicates, mappedRows.length, rows.length, user, validation.errors.length]);

  const resetWizard = () => {
    setStep('upload');
    setHeaders([]);
    setRows([]);
    setMapping({});
    setReport(null);
  };

  return {
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
  };
}
