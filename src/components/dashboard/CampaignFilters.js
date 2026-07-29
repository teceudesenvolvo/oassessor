import React from 'react';
import { Filter, SlidersHorizontal } from 'lucide-react';

const periods = [
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: '90d', label: '90 dias' },
  { value: 'all', label: 'Todo o período' }
];

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="campaign-filter-field">
      <span>{label}</span>
      <select value={value} onChange={onChange} className="campaign-filter-select">
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function CampaignFilters({ filters, setFilters, options }) {
  const updateFilter = (field) => (event) =>
    setFilters((prev) => ({
      ...prev,
      [field]: event.target.value
    }));

  const mapOptions = (items, fallbackLabel) => [
    { value: 'all', label: fallbackLabel },
    ...items.map((item) =>
      typeof item === 'string'
        ? { value: item, label: item }
        : item
    )
  ];

  return (
    <section className="campaign-filters-card">
      <div className="campaign-filters-header">
        <div>
          <p className="campaign-kicker">
            <Filter size={16} />
            Inteligência por recorte
          </p>
          <h3>Central da Campanha</h3>
        </div>
        <div className="campaign-filters-pill">
          <SlidersHorizontal size={16} />
          Filtros estratégicos
        </div>
      </div>

      <div className="campaign-filters-grid">
        <FilterSelect
          label="Campanha"
          value={filters.campaign}
          onChange={updateFilter('campaign')}
          options={mapOptions(options.campaigns, 'Todas as campanhas')}
        />
        <FilterSelect
          label="Bairro"
          value={filters.neighborhood}
          onChange={updateFilter('neighborhood')}
          options={mapOptions(options.neighborhoods, 'Todos os bairros')}
        />
        <FilterSelect
          label="Região"
          value={filters.region}
          onChange={updateFilter('region')}
          options={mapOptions(options.regions, 'Todas as regiões')}
        />
        <FilterSelect
          label="Equipe"
          value={filters.team}
          onChange={updateFilter('team')}
          options={mapOptions(options.teams, 'Todas as equipes')}
        />
        <FilterSelect
          label="Assessor"
          value={filters.assessor}
          onChange={updateFilter('assessor')}
          options={mapOptions(options.assessors, 'Toda a operação')}
        />
        <FilterSelect
          label="Período"
          value={filters.period}
          onChange={updateFilter('period')}
          options={periods}
        />
      </div>
    </section>
  );
}
