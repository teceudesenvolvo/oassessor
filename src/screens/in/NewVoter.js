import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { ref, push, set } from 'firebase/database';
import { database } from '../../firebaseConfig';
import { useAuth } from '../../useAuth';

export default function NewVoter() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
    if (!user) return;
    setSaving(true);
    try {
      const votersRef = ref(database, 'eleitores');
      const newVoterRef = push(votersRef);
      await set(newVoterRef, {
        ...formData,
        creatorId: user.uid,
        createdAt: new Date().toISOString()
      });
      alert('Eleitor cadastrado com sucesso!');
      navigate('/dashboard/voters');
    } catch (error) {
      console.error("Erro ao cadastrar:", error);
      alert('Erro ao cadastrar eleitor.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={() => navigate('/dashboard/voters')} className="icon-btn">
            <ArrowLeft size={20} />
          </button>
          <h3>Novo Eleitor</h3>
        </div>
        <button onClick={handleSave} className="btn-primary" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Save size={18} /> {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
        <div className="input-group"> <label>Nome Completo</label> <input type="text" name="nome" value={formData.nome} onChange={handleChange} className="custom-input" required /> </div>
        <div className="input-group"> <label>E-mail</label> <input type="email" name="email" value={formData.email} onChange={handleChange} className="custom-input" /> </div>
        <div className="input-group"> <label>Telefone</label> <input type="text" name="telefone" value={formData.telefone} onChange={handleChange} className="custom-input" /> </div>
        <div className="input-group"> <label>CPF</label> <input type="text" name="cpf" value={formData.cpf} onChange={handleChange} className="custom-input" /> </div>
        <div className="input-group"> <label>Data de Nascimento</label> <input type="date" name="nascimento" value={formData.nascimento} onChange={handleChange} className="custom-input" /> </div>
        <div className="input-group"> <label>Título de Eleitor</label> <input type="text" name="titulo" value={formData.titulo} onChange={handleChange} className="custom-input" /> </div>
        <div className="input-group"> <label>Zona / Seção</label> <input type="text" name="zonaSecao" value={formData.zonaSecao} onChange={handleChange} className="custom-input" /> </div>
        
        <h4 style={{ gridColumn: '1 / -1', marginTop: '10px', marginBottom: '5px', borderBottom: '1px solid #eee', paddingBottom: '5px', color: '#64748b' }}>Endereço</h4>
        
        <div className="input-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            CEP {cepLoading && <span style={{ fontSize: '0.75rem', color: '#3b82f6' }}>(Buscando...)</span>}
          </label>
          <input type="text" name="cep" value={formData.cep} onChange={handleChange} onBlur={checkCep} className="custom-input" placeholder="00000-000" />
        </div>
        <div className="input-group"> <label>Endereço</label> <input type="text" name="endereco" value={formData.endereco} onChange={handleChange} className="custom-input" /> </div>
        <div className="input-group"> <label>Número</label> <input type="text" name="numero" value={formData.numero} onChange={handleChange} className="custom-input" /> </div>
        <div className="input-group"> <label>Bairro</label> <input type="text" name="bairro" value={formData.bairro} onChange={handleChange} className="custom-input" /> </div>
        <div className="input-group"> <label>Cidade</label> <input type="text" name="cidade" value={formData.cidade} onChange={handleChange} className="custom-input" /> </div>
        <div className="input-group"> <label>Estado</label> <input type="text" name="estado" value={formData.estado} onChange={handleChange} className="custom-input" /> </div>
      </form>
    </div>
  );
}