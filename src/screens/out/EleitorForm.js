import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ref, push, set } from 'firebase/database';
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
  
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    bairro: '',
    cidade: '',
    estado: '',
    cpf: '',
    nascimento: '',
    titulo: '',
    zonaSecao: '',
    endereco: '',
    numero: '',
    cep: ''
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
    } else if (name === 'zonaSecao') {
      val = val.replace(/\D/g, '').slice(0, 7);
      if (val.length > 3) val = val.slice(0, 3) + '/' + val.slice(3);
    }
    setFormData(prev => ({ ...prev, [name]: val }));
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
        nome: '', email: '', telefone: '', bairro: '', cidade: '', estado: '',
        cpf: '', nascimento: '', titulo: '', zonaSecao: '', endereco: '', numero: '', cep: ''
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
                  <div className="input-group"> <label>Nome Completo</label> <input type="text" name="nome" value={formData.nome} onChange={handleChange} className="custom-input" required /> </div>
                  <div className="input-group"> <label>E-mail</label> <input type="email" name="email" value={formData.email} onChange={handleChange} className="custom-input" /> </div>
                  <div className="input-group"> <label>Telefone</label> <input type="text" name="telefone" value={formData.telefone} onChange={handleMaskedChange} className="custom-input" placeholder="(00) 00000-0000" /> </div>
                  <div className="input-group"> <label>CPF</label> <input type="text" name="cpf" value={formData.cpf} onChange={handleMaskedChange} className="custom-input" placeholder="000.000.000-00" /> </div>
                  <div className="input-group"> <label>Data de Nascimento</label> <input type="date" name="nascimento" value={formData.nascimento} onChange={handleChange} className="custom-input" /> </div>
                  <div className="input-group"> <label>Título de Eleitor</label> <input type="text" name="titulo" value={formData.titulo} onChange={handleMaskedChange} className="custom-input" placeholder="Apenas números" /> </div>
                  <div className="input-group"> <label>Zona / Seção</label> <input type="text" name="zonaSecao" value={formData.zonaSecao} onChange={handleMaskedChange} className="custom-input" placeholder="000/0000" /> </div>
                  
                  <h4 style={{ gridColumn: '1 / -1', marginTop: '10px', marginBottom: '5px', borderBottom: '1px solid #eee', paddingBottom: '5px', color: '#64748b' }}>Endereço</h4>
                  
                  <div className="input-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      CEP {cepLoading && <span style={{ fontSize: '0.75rem', color: '#3b82f6' }}>(Buscando...)</span>}
                  </label>
                  <input type="text" name="cep" value={formData.cep} onChange={handleMaskedChange} onBlur={checkCep} className="custom-input" placeholder="00000-000" />
                  </div>
                  <div className="input-group"> <label>Endereço</label> <input type="text" name="endereco" value={formData.endereco} onChange={handleChange} className="custom-input" /> </div>
                  <div className="input-group"> <label>Número</label> <input type="text" name="numero" value={formData.numero} onChange={handleChange} className="custom-input" /> </div>
                  <div className="input-group"> <label>Bairro</label> <input type="text" name="bairro" value={formData.bairro} onChange={handleChange} className="custom-input" /> </div>
                  <div className="input-group"> <label>Cidade</label> <input type="text" name="cidade" value={formData.cidade} onChange={handleChange} className="custom-input" /> </div>
                  <div className="input-group"> <label>Estado</label> <input type="text" name="estado" value={formData.estado} onChange={handleChange} className="custom-input" /> </div>

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