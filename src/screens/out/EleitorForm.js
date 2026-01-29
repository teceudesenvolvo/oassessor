import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ref, push, set, get } from 'firebase/database';
import { database } from '../../firebaseConfig';
import { CheckCircle } from 'lucide-react';
import Navbar from '../../components/Navbar';


export default function EleitorForm() {
  const location = useLocation();
  const [creatorId, setCreatorId] = useState('');
  const [creatorEmail, setCreatorEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [localVotacaoLoading, setLocalVotacaoLoading] = useState(false);
  const [localVotacaoOptions, setLocalVotacaoOptions] = useState([]);
  
  const [formData, setFormData] = useState({
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
    localVotacao: ''
  });

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const uid = searchParams.get('userId');
    const email = searchParams.get('email');
    
    if (uid) setCreatorId(uid);
    if (email) setCreatorEmail(email);
  }, [location]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMaskedChange = (e) => {
    const { name, value } = e.target;
    let val = value;

    if (name === 'cpf') {
      val = val.replace(/\D/g, '').slice(0, 11)
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2');
    } else if (name === 'telefone') {
      val = val.replace(/\D/g, '').slice(0, 11);
      val = val.replace(/^(\d{2})(\d)/g, '($1) $2');
      val = val.replace(/(\d)(\d{4})$/, '$1-$2');
    } else if (name === 'cep') {
      val = val.replace(/\D/g, '').slice(0, 8);
      val = val.replace(/^(\d{5})(\d)/, '$1-$2');
    } else if (name === 'titulo') {
      val = val.replace(/\D/g, '').slice(0, 12);
    } else if (name === 'zona') {
      val = val.replace(/\D/g, '').slice(0, 3);
      if (val === '') {
        setLocalVotacaoOptions([]);
      }
    } else if (name === 'secao') {
      val = val.replace(/\D/g, '').slice(0, 4);
    }
    setFormData(prev => {
      const newData = { ...prev, [name]: val };
      if (name === 'zona' && val === '') newData.localVotacao = '';
      return newData;
    });
  };

  const checkCep = async (e) => {
    const cep = e.target.value.replace(/\D/g, '');
    if (cep.length === 8) {
      setCepLoading(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            endereco: data.logradouro,
            bairro: data.bairro,
            cidade: data.localidade,
            estado: data.uf
          }));
        }
      } catch (error) {
        console.error("Erro ao buscar CEP:", error);
      }
      setCepLoading(false);
    }
  };

  const isValidTitulo = (titulo) => {
    if (!titulo) return false;
    const cleanTitulo = titulo.replace(/\D/g, '');
    if (cleanTitulo.length !== 12) return false;
    
    const digits = cleanTitulo.split('').map(Number);
    const uf = digits[8] * 10 + digits[9];
    if (uf < 1 || uf > 28) return false;

    // Cálculo do 1º Dígito Verificador
    let sum = 0;
    for (let i = 0; i < 8; i++) sum += digits[i] * (i + 2);
    let rest = sum % 11;
    let dv1 = rest;
    if (rest === 0) {
        if (uf === 1 || uf === 2) dv1 = 1; else dv1 = 0;
    } else if (rest === 10) {
        dv1 = 0;
    }
    if (digits[10] !== dv1) return false;

    // Cálculo do 2º Dígito Verificador
    sum = 0;
    sum += digits[8] * 7 + digits[9] * 8 + dv1 * 9;
    rest = sum % 11;
    let dv2 = rest;
    if (rest === 0) {
        if (uf === 1 || uf === 2) dv2 = 1; else dv2 = 0;
    } else if (rest === 10) {
        dv2 = 0;
    }
    if (digits[11] !== dv2) return false;

    return true;
  };

  const checkTitulo = async (e) => {
    const titulo = e.target.value.replace(/\D/g, '');
    if (titulo.length === 12) {
      if (!isValidTitulo(titulo)) {
        alert("Título de eleitor inválido.");
        return;
      }
      // Aqui você pode inserir a chamada para sua API de consulta de Título
      // setTituloLoading(true);
      // try { const res = await fetch(...); ... } finally { setTituloLoading(false); }
      // Como não há API pública aberta, mantemos apenas a validação por enquanto.
      console.log("Título válido:", titulo);
    }
  };

  const checkLocalVotacao = async () => {
    const { zona } = formData;
    
    setLocalVotacaoOptions([]);
    setFormData(prev => ({ ...prev, localVotacao: '' }));

    if (zona) {
      setLocalVotacaoLoading(true);
      try {
        const placesRef = ref(database, 'localvotacao');
        const snapshot = await get(placesRef);
        
        if (snapshot.exists()) {
          const allData = snapshot.val();
          let matchedPlaces = [];
          
          Object.values(allData).forEach(cityPlaces => {
            const places = Object.values(cityPlaces).filter(p => p.zona === zona);
            matchedPlaces = [...matchedPlaces, ...places];
          });
          
          if (matchedPlaces.length > 0) {
            setLocalVotacaoOptions(matchedPlaces);
          }
        }
      } catch (error) {
        console.error("Erro ao buscar local de votação:", error);
      } finally {
        setLocalVotacaoLoading(false);
      }
    }
  };
  

  const handleSave = async (e) => {
    e.preventDefault();
    if (!creatorId) {
        alert("Erro: Link inválido (faltando ID do responsável).");
        return;
    }
    setSaving(true);
    try {
      const votersRef = ref(database, 'eleitores');
      const newVoterRef = push(votersRef);
      await set(newVoterRef, {
        ...formData,
        creatorId: creatorId,
        creatorEmail: creatorEmail,
        createdAt: new Date().toISOString(),
        origin: 'public_form'
      });
      setSuccess(true);
      setFormData({
        nome: '', apelido: '', instagram: '', sexo: '', email: '', telefone: '', bairro: '', cidade: '', estado: '',
        cpf: '', nascimento: '', titulo: '', zona: '', secao: '', endereco: '', numero: '', cep: '', localVotacao: ''
      });
    } catch (error) {
      console.error("Erro ao cadastrar:", error);
      alert('Erro ao cadastrar eleitor.');
    } finally {
      setSaving(false);
    }
  };

  if (success) {
      return (
        <>
          <header className="hero-section" style={{ minHeight: 'auto', paddingBottom: '20px' }}>
             <Navbar />
          </header>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '20px', backgroundColor: '#f8fafc' }}>
              <div className="dashboard-card" style={{ textAlign: 'center', maxWidth: '500px', width: '100%' }}>
                  <CheckCircle size={64} color="#16a34a" style={{ marginBottom: '20px', margin: '0 auto' }} />
                  <h2>Cadastro Realizado!</h2>
                  <p style={{ color: '#64748b', marginBottom: '30px' }}>O eleitor foi cadastrado com sucesso na base de dados.</p>
                  <button className="btn-primary" onClick={() => setSuccess(false)} style={{ width: '100%', justifyContent: 'center' }}>Cadastrar Novo</button>
              </div>
          </div>
        </>
      );
  }

  return (
    <>
      <header className="hero-section" style={{ minHeight: 'auto', paddingBottom: '20px' }}>
         <Navbar />
      </header>
      <div style={{ minHeight: '80vh', backgroundColor: '#f8fafc', padding: '20px 20px 60px' }}>
          <div className="dashboard-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
              <h2 style={{ marginBottom: '20px', textAlign: 'center', color: '#0f172a' }}>Ficha de Cadastro</h2>
              <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '30px', fontSize: '0.9rem' }}>
                  Preencha os dados abaixo para realizar o cadastro.
              </p>

              <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                  <div className="input-group"> <label>Nome Completo</label> <input type="text" name="nome" value={formData.nome} onChange={handleChange} className="custom-input-voter" required /> </div>
                  <div className="input-group"> <label>Apelido</label> <input type="text" name="apelido" value={formData.apelido} onChange={handleChange} className="custom-input-voter" /> </div>
                  <div className="input-group"> <label>E-mail</label> <input type="email" name="email" value={formData.email} onChange={handleChange} className="custom-input-voter" /> </div>
                  <div className="input-group"> <label>Telefone</label> <input type="text" name="telefone" value={formData.telefone} onChange={handleMaskedChange} className="custom-input-voter" placeholder="(00) 00000-0000" /> </div>
                  <div className="input-group"> <label>Instagram</label> <input type="text" name="instagram" value={formData.instagram} onChange={handleChange} className="custom-input-voter" placeholder="@usuario" /> </div>
                  <div className="input-group"> <label>CPF</label> <input type="text" name="cpf" value={formData.cpf} onChange={handleMaskedChange} className="custom-input-voter" placeholder="000.000.000-00" /> </div>
                  <div className="input-group"> <label>Sexo</label> 
                      <select name="sexo" value={formData.sexo} onChange={handleChange} className="custom-input-voter custom-input-voter-select" style={{ width: '100%' }}>
                          <option value="">Selecione</option>
                          <option value="Masculino">Masculino</option>
                          <option value="Feminino">Feminino</option>
                          <option value="Outro">Outro</option>
                      </select>
                  </div>
                  <div className="input-group"> <label>Data de Nascimento</label> <input type="date" name="nascimento" value={formData.nascimento} onChange={handleChange} className="custom-input-voter" /> </div>
                  <div className="input-group"> 
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      Título de Eleitor
                    </label>
                    <input type="text" name="titulo" value={formData.titulo} onChange={handleMaskedChange} onBlur={checkTitulo} className="custom-input-voter" placeholder="Apenas números" /> 
                  </div>
                  <div className="input-group" style={{ display: 'flex', gap: '10px' }}> 
                      <div style={{ flex: 1 }}> <label>Zona</label> <input type="text" name="zona" value={formData.zona} onChange={handleMaskedChange} onBlur={checkLocalVotacao} className="custom-input-voter" style={{ width: '30%' }} placeholder="000" /> </div>
                      <div style={{ flex: 1 }}> <label>Seção</label> <input type="text" name="secao" value={formData.secao} onChange={handleMaskedChange} className="custom-input-voter" style={{ width: '86%' }} placeholder="0000" /> </div>
                  </div>
                  
                  <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          Local de Votação {localVotacaoLoading && <span style={{ fontSize: '0.75rem', color: '#3b82f6' }}>(Buscando...)</span>}
                      </label>
                      <select name="localVotacao" value={formData.localVotacao} onChange={handleChange} className="custom-input-voter custom-input-voter-select" style={{ width: '93%' }}>
                          <option value="">Selecione um local</option>
                          {formData.localVotacao && !localVotacaoOptions.some(p => `${p.local || ''} - ${p.endereco || ''}` === formData.localVotacao) && (
                              <option value={formData.localVotacao}>{formData.localVotacao}</option>
                          )}
                          {localVotacaoOptions.map((place, index) => (
                              <option key={index} value={`${place.local || ''} - ${place.endereco || ''}`}>
                                  {place.local}
                              </option>
                          ))}
                      </select>
                  </div>
                  
                  <h4 style={{ gridColumn: '1 / -1', marginTop: '10px', marginBottom: '5px', borderBottom: '1px solid #eee', paddingBottom: '5px', color: '#64748b' }}>Endereço</h4>
                  
                  <div className="input-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      CEP {cepLoading && <span style={{ fontSize: '0.75rem', color: '#3b82f6' }}>(Buscando...)</span>}
                  </label>
                  <input type="text" name="cep" value={formData.cep} onChange={handleMaskedChange} onBlur={checkCep} className="custom-input-voter" placeholder="00000-000" />
                  </div>
                  <div className="input-group"> <label>Endereço</label> <input type="text" name="endereco" value={formData.endereco} onChange={handleChange} className="custom-input-voter" /> </div>
                  <div className="input-group"> <label>Número</label> <input type="text" name="numero" value={formData.numero} onChange={handleChange} className="custom-input-voter" /> </div>
                  <div className="input-group"> <label>Bairro</label> <input type="text" name="bairro" value={formData.bairro} onChange={handleChange} className="custom-input-voter" /> </div>
                  <div className="input-group"> <label>Cidade</label> <input type="text" name="cidade" value={formData.cidade} onChange={handleChange} className="custom-input-voter" /> </div>
                  <div className="input-group"> <label>Estado</label> <input type="text" name="estado" value={formData.estado} onChange={handleChange} className="custom-input-voter" /> </div>

                  <div style={{ gridColumn: '1 / -1', marginTop: '20px' }}>
                      <button type="submit" className="btn-primary" disabled={saving} style={{ width: '100%', justifyContent: 'center', padding: '15px', fontSize: '1.1rem' }}>
                          {saving ? 'Salvando...' : 'Confirmar Cadastro'}
                      </button>
                  </div>
              </form>
          </div>
      </div>
    </>
  );
}