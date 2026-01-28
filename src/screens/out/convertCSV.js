import React, { useState, useMemo } from 'react';

const App = () => {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMun, setSelectedMun] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const municipios = useMemo(() => Object.keys(data).sort(), [data]);

  const filteredLocais = useMemo(() => {
    if (!selectedMun || !data[selectedMun]) return [];
    return data[selectedMun].filter(item =>
      item.local.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.bairro.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.zona.includes(searchTerm)
    );
  }, [selectedMun, data, searchTerm]);

  const downloadJSON = () => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tre-ce-locais-votacao.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCSV = (text) => {
    setLoading(true);
    try {
      const lines = text.split(/\r\n|\n\r|\n|\r/);
      const result = {};

      let headerIdx = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().startsWith('município')) {
          headerIdx = i;
          break;
        }
      }

      if (headerIdx === -1) {
        throw new Error("Não foi possível encontrar o cabeçalho dos dados.");
      }

      for (let i = headerIdx + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = line.split(';');
        if (cols.length < 3) continue;

        // Remove caracteres inválidos para chaves do Firebase
        // e normaliza (remove acentos)
        const mun = cols[0].trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[.$#[\]\x2F]/g, '');
        if (!mun) continue;

        if (!result[mun]) result[mun] = [];
        
        result[mun].push({
          zona: cols[1]?.trim() || '',
          local: cols[2]?.trim() || '',
          endereco: cols[3]?.trim() || '',
          bairro: cols[4]?.trim() || '',
          cep: cols[5]?.trim() || '',
          eleitores: parseInt(cols[7]?.trim() || '0', 10)
        });
      }

      const keys = Object.keys(result);
      if (keys.length === 0) {
        throw new Error("Nenhum dado válido extraído.");
      }

      setData(result);
      setSelectedMun(keys.sort()[0]);
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => parseCSV(e.target.result);
    reader.readAsText(file, 'ISO-8859-1');
  };

  if (Object.keys(data).length === 0) {
    return (
      <div className="upload-screen">
        <style>{styles}</style>
        <div 
          className={`drop-zone ${isDragging ? 'active' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFileUpload(e.dataTransfer.files[0]);
          }}
        >
          <div className="upload-content">
            <span className="icon">🗳️</span>
            <h2>Explorador TRE-CE</h2>
            <p>Arraste o arquivo CSV aqui para converter para JSON</p>
            <input 
              type="file" 
              id="csv-input" 
              hidden 
              accept=".csv" 
              onChange={(e) => handleFileUpload(e.target.files[0])} 
            />
            <button className="btn-upload" onClick={() => document.getElementById('csv-input').click()}>
              {loading ? 'Processando...' : 'Carregar CSV'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <style>{styles}</style>
      <header className="header">
        <div className="logo">
          <strong>TRE-CE</strong> | Dados de Votação
        </div>
        <div className="header-actions">
          <button className="btn-download" onClick={downloadJSON}>
             Baixar JSON
          </button>
          <button className="btn-back" onClick={() => setData({})}>Trocar Arquivo</button>
        </div>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <div className="sidebar-header">Municípios ({municipios.length})</div>
          <div className="list">
            {municipios.map(m => (
              <button 
                key={m} 
                className={`item ${selectedMun === m ? 'active' : ''}`}
                onClick={() => setSelectedMun(m)}
              >
                {m}
              </button>
            ))}
          </div>
        </aside>

        <main className="main">
          <div className="toolbar">
            <div className="title-area">
              <h2>{selectedMun}</h2>
              <p>{filteredLocais.length} locais de votação</p>
            </div>
            <div className="filters">
              <input 
                type="text" 
                placeholder="Pesquisar local ou bairro..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          <div className="grid">
            {filteredLocais.map((l, i) => (
              <div key={i} className="card">
                <div className="card-header">
                  <span className="zona">ZONA {l.zona}</span>
                  <span className="eleitores">{l.eleitores.toLocaleString()} ELEITORES</span>
                </div>
                <h3>{l.local}</h3>
                <div className="card-body">
                  <p><strong>Bairro:</strong> {l.bairro}</p>
                  <p><strong>Endereço:</strong> {l.endereco}</p>
                  <p className="cep">CEP: {l.cep}</p>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
};

const styles = `
  :root {
    --primary: #004a8e;
    --accent: #ffcc00;
    --success: #28a745;
    --bg: #f8f9fa;
    --border: #dee2e6;
  }

  * { box-sizing: border-box; font-family: 'Inter', -apple-system, sans-serif; }
  body { margin: 0; background: var(--bg); }

  .upload-screen { height: 100vh; display: flex; align-items: center; justify-content: center; background: #002d5a; }
  .drop-zone { 
    width: 450px; padding: 60px; border: 2px dashed rgba(255,255,255,0.2); 
    border-radius: 24px; background: rgba(255,255,255,0.03); text-align: center; color: white;
  }
  .drop-zone.active { border-color: var(--accent); background: rgba(255,255,255,0.08); }
  .icon { font-size: 64px; display: block; margin-bottom: 24px; }
  .btn-upload { 
    background: var(--accent); color: #002d5a; border: none; padding: 14px 40px; 
    border-radius: 40px; font-weight: bold; cursor: pointer; margin-top: 30px; font-size: 1rem;
    transition: transform 0.2s;
  }
  .btn-upload:hover { transform: scale(1.05); }

  .container { height: 100vh; display: flex; flex-direction: column; }
  .header { background: #003366; color: white; padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 10px rgba(0,0,0,0.1); z-index: 20; }
  .header-actions { display: flex; gap: 12px; }
  
  .btn-download { 
    background: var(--success); color: white; border: none; padding: 8px 18px; 
    border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 14px;
    display: flex; align-items: center; gap: 8px;
  }
  .btn-download:hover { background: #218838; }
  
  .btn-back { background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.2); padding: 8px 15px; border-radius: 6px; cursor: pointer; font-size: 14px; }

  .layout { flex: 1; display: flex; overflow: hidden; }
  .sidebar { width: 280px; background: white; border-right: 1px solid var(--border); display: flex; flex-direction: column; }
  .sidebar-header { padding: 18px; font-size: 12px; font-weight: 800; color: #adb5bd; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid var(--border); }
  .list { flex: 1; overflow-y: auto; }
  .item { width: 100%; text-align: left; padding: 14px 20px; border: none; background: none; border-bottom: 1px solid #f8f9fa; cursor: pointer; font-size: 14px; color: #495057; transition: 0.2s; }
  .item:hover { background: #f1f3f5; }
  .item.active { background: #e7f1ff; color: var(--primary); font-weight: bold; border-left: 4px solid var(--primary); }

  .main { flex: 1; overflow-y: auto; background: #f1f3f5; }
  .toolbar { position: sticky; top: 0; background: white; padding: 20px 40px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; z-index: 10; }
  .toolbar h2 { margin: 0; color: var(--primary); font-size: 24px; }
  .toolbar p { margin: 4px 0 0; color: #6c757d; font-size: 14px; }
  
  .search-input { padding: 12px 24px; border: 1px solid var(--border); border-radius: 12px; width: 320px; outline: none; transition: all 0.2s; font-size: 14px; }
  .search-input:focus { border-color: var(--primary); box-shadow: 0 0 0 4px rgba(0,74,142,0.1); }

  .grid { padding: 40px; display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 24px; }
  .card { background: white; border-radius: 16px; border: 1px solid var(--border); padding: 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
  .card:hover { box-shadow: 0 12px 24px rgba(0,0,0,0.06); }
  
  .card-header { display: flex; justify-content: space-between; margin-bottom: 18px; align-items: center; }
  .zona { background: #e9ecef; color: #495057; padding: 4px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; }
  .eleitores { color: var(--success); font-size: 11px; font-weight: 800; }
  
  .card h3 { margin: 0 0 16px; font-size: 17px; line-height: 1.5; color: #212529; height: 50px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  .card-body p { margin: 10px 0; font-size: 13.5px; color: #495057; line-height: 1.4; }
  .card-body strong { color: #212529; font-weight: 600; margin-right: 4px; }
  .cep { color: #adb5bd !important; font-size: 12px !important; margin-top: 15px !important; border-top: 1px solid #f8f9fa; padding-top: 10px; }

  @media (max-width: 1024px) {
    .sidebar { width: 220px; }
    .grid { grid-template-columns: 1fr; }
    .search-input { width: 240px; }
  }
`;

export default App;