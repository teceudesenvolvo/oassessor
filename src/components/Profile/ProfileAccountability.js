import React from 'react';
import { Landmark, Mail, Phone, Receipt, ShieldCheck, UserRound } from 'lucide-react';

const FIELD_GROUPS = [
  [
    { key: 'campaignName', label: 'Campanha', icon: Landmark, placeholder: 'Nome da campanha' },
    { key: 'candidateName', label: 'Candidato', icon: UserRound, placeholder: 'Nome do candidato' },
    { key: 'candidateCpf', label: 'CPF do candidato', icon: Receipt, placeholder: '000.000.000-00' }
  ],
  [
    { key: 'office', label: 'Cargo', icon: ShieldCheck, placeholder: 'Ex.: Deputado Federal' },
    { key: 'party', label: 'Partido', icon: Landmark, placeholder: 'Sigla do partido' },
    { key: 'electionLabel', label: 'Eleição', icon: Receipt, placeholder: 'Ex.: Eleições 2026' }
  ],
  [
    { key: 'round', label: 'Turno', icon: Receipt, placeholder: '1º turno' },
    { key: 'city', label: 'Município', icon: Landmark, placeholder: 'Município da campanha' },
    { key: 'state', label: 'Estado', icon: Landmark, placeholder: 'UF' }
  ],
  [
    { key: 'financialManager', label: 'Responsável financeiro', icon: UserRound, placeholder: 'Nome do responsável' },
    { key: 'accountantName', label: 'Contador responsável', icon: UserRound, placeholder: 'Nome do contador' },
    { key: 'emailPrimary', label: 'E-mail principal', icon: Mail, placeholder: 'contato@campanha.com' }
  ],
  [
    { key: 'phonePrimary', label: 'Telefone', icon: Phone, placeholder: '(00) 00000-0000' },
    { key: 'spendingLimitCents', label: 'Limite de gastos (centavos)', icon: Receipt, placeholder: '0' },
    { key: 'plannedBudgetCents', label: 'Orçamento planejado (centavos)', icon: Receipt, placeholder: '0' }
  ]
];

export default function ProfileAccountability({ profileData, setProfileData, loading, handleMaskedInput, handleSaveAccountability }) {
  return (
    <div className="profile-help-shell">
      <div className="profile-section-heading">
        <h3>Prestação de contas da campanha</h3>
        <p>Preencha aqui os dados estratégicos do dono da conta que serão usados como base na central financeira da campanha.</p>
      </div>

      {FIELD_GROUPS.map((group, index) => (
        <div key={index} style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
          {group.map((field) => {
            const Icon = field.icon;
            const inputName = field.key === 'candidateCpf' ? 'accountabilityProfile.candidateCpf' : field.key === 'phonePrimary' ? 'accountabilityProfile.phonePrimary' : field.key;
            return (
              <div key={field.key} style={{ flex: '1 1 250px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' }}>
                  {field.label}
                </label>
                <div className="input-container">
                  <Icon size={18} className="field-icon-left" />
                  <input
                    type="text"
                    name={inputName}
                    value={profileData.accountabilityProfile?.[field.key] || ''}
                    onChange={(event) => {
                      if (field.key === 'candidateCpf' || field.key === 'phonePrimary') {
                        handleMaskedInput(event);
                        return;
                      }
                      setProfileData((prev) => ({
                        ...prev,
                        accountabilityProfile: {
                          ...(prev.accountabilityProfile || {}),
                          [field.key]: event.target.value
                        }
                      }));
                    }}
                    className="custom-input"
                    placeholder={field.placeholder}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ))}

      <button type="button" onClick={handleSaveAccountability} disabled={loading} className="btn-primary" style={{ marginTop: '10px', width: '100%', justifyContent: 'center' }}>
        {loading ? 'Salvando...' : 'Salvar dados da prestação'}
      </button>
    </div>
  );
}
