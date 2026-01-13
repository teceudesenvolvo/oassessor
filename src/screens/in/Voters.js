import React from 'react';
import { Search, Filter } from 'lucide-react';

export default function Voters() {
  return (
    <div className="dashboard-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h3>Base de Eleitores</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div className="search-box" style={{ display: 'flex' }}>
            <Search size={18} />
            <input type="text" placeholder="Buscar eleitor..." />
          </div>
          <button className="icon-btn" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px', width: 'auto', height: 'auto' }}>
            <Filter size={20} />
          </button>
        </div>
      </div>

      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
        <p style={{ marginBottom: '20px' }}>Nenhum eleitor cadastrado ainda.</p>
        <button className="btn-primary">Importar Lista de Contatos</button>
      </div>
    </div>
  );
}