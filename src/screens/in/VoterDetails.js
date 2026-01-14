import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { ref, get, update, remove } from 'firebase/database';
import { database } from '../../firebaseConfig';

export default function VoterDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    const fetchVoter = async () => {
      try {
        const voterRef = ref(database, `eleitores/${id}`);
        const snapshot = await get(voterRef);
        if (snapshot.exists()) {
          setFormData(snapshot.val());
        } else {
          alert('Eleitor não encontrado');
          navigate('/dashboard/voters');
        }
      } catch (error) {
        console.error("Erro ao buscar eleitor:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVoter();
  }, [id, navigate]);

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
    setSaving(true);
    try {
      const voterRef = ref(database, `eleitores/${id}`);
      await update(voterRef, {
        ...formData,
        updatedAt: new Date().toISOString()
      });
      alert('Dados atualizados com sucesso!');
    } catch (error) {
      console.error("Erro ao atualizar:", error);
      alert('Erro ao atualizar dados.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Tem certeza que deseja excluir este eleitor?')) {
      try {
        const voterRef = ref(database, `eleitores/${id}`);
        await remove(voterRef);
        navigate('/dashboard/voters');
      } catch (error) {
        console.error("Erro ao excluir:", error);
        alert('Erro ao excluir eleitor.');
      }
    }
  };

  if (loading) return <div className="dashboard-card">Carregando...</div>;

  return (
    <div className="dashboard-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={() => navigate('/dashboard/voters')} className="icon-btn">
            <ArrowLeft size={20} />
          </button>
          <h3>Detalhes do Eleitor</h3>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleDelete} className="btn-secondary" style={{ color: '#ef4444', borderColor: '#ef4444', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Trash2 size={18} /> Excluir
            </button>
            <button onClick={handleSave} className="btn-primary" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Save size={18} /> {saving ? 'Salvando...' : 'Salvar'}
            </button>
        </div>
      </div>

      <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
        <div className="input-group"> <label>Nome Completo</label> <input type="text" name="nome" value={formData.nome || ''} onChange={handleChange} className="custom-input" /> </div>
        <div className="input-group"> <label>E-mail</label> <input type="email" name="email" value={formData.email || ''} onChange={handleChange} className="custom-input" /> </div>
        <div className="input-group"> <label>Telefone</label> <input type="text" name="telefone" value={formData.telefone || ''} onChange={handleChange} className="custom-input" /> </div>
        <div className="input-group"> <label>CPF</label> <input type="text" name="cpf" value={formData.cpf || ''} onChange={handleChange} className="custom-input" /> </div>
        <div className="input-group"> <label>Data de Nascimento</label> <input type="date" name="nascimento" value={formData.nascimento || ''} onChange={handleChange} className="custom-input" /> </div>
        <div className="input-group"> <label>Título de Eleitor</label> <input type="text" name="titulo" value={formData.titulo || ''} onChange={handleChange} className="custom-input" /> </div>
        <div className="input-group"> <label>Zona / Seção</label> <input type="text" name="zonaSecao" value={formData.zonaSecao || ''} onChange={handleChange} className="custom-input" /> </div>
        
        <h4 style={{ gridColumn: '1 / -1', marginTop: '10px', marginBottom: '5px', borderBottom: '1px solid #eee', paddingBottom: '5px', color: '#64748b' }}>Endereço</h4>
        
        <div className="input-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            CEP {cepLoading && <span style={{ fontSize: '0.75rem', color: '#3b82f6' }}>(Buscando...)</span>}
          </label>
          <input type="text" name="cep" value={formData.cep || ''} onChange={handleChange} onBlur={checkCep} className="custom-input" placeholder="00000-000" />
        </div>
        <div className="input-group"> <label>Endereço</label> <input type="text" name="endereco" value={formData.endereco || ''} onChange={handleChange} className="custom-input" /> </div>
        <div className="input-group"> <label>Número</label> <input type="text" name="numero" value={formData.numero || ''} onChange={handleChange} className="custom-input" /> </div>
        <div className="input-group"> <label>Bairro</label> <input type="text" name="bairro" value={formData.bairro || ''} onChange={handleChange} className="custom-input" /> </div>
        <div className="input-group"> <label>Cidade</label> <input type="text" name="cidade" value={formData.cidade || ''} onChange={handleChange} className="custom-input" /> </div>
        <div className="input-group"> <label>Estado</label> <input type="text" name="estado" value={formData.estado || ''} onChange={handleChange} className="custom-input" /> </div>
      </form>
    </div>
  );
}