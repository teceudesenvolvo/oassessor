import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Trash2, MessageCircle } from 'lucide-react';
import { ref, get, update, remove } from 'firebase/database';
import { database } from '../../firebaseConfig';

export default function VoterDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    const fetchVoter = async () => {
      try {
        const voterRef = ref(database, `eleitores/${id}`);
        const snapshot = await get(voterRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          // Se a data vier no formato BR (DD/MM/YYYY), converte para ISO (YYYY-MM-DD) para o input exibir corretamente
          if (data.nascimento && data.nascimento.includes('/')) {
            const [day, month, year] = data.nascimento.split('/');
            data.nascimento = `${year}-${month}-${day}`;
          }
          // Compatibilidade com dados antigos que usam zonaSecao
          if (data.zonaSecao && !data.zona) {
            const [zona = '', secao = ''] = data.zonaSecao.split('/');
            data.zona = zona;
            data.secao = secao;
          }
          setFormData(data);
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

  const checkLocalVotacao = async () => {
    const { zona } = formData;
    setLocalVotacaoOptions([]);

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
            // Check if current value is still valid
            const isCurrentValueValid = matchedPlaces.some(p => `${p.local || ''} - ${p.endereco || ''}` === formData.localVotacao);
            if (!isCurrentValueValid) {
              setFormData(prev => ({ ...prev, localVotacao: '' }));
            }
          } else {
            // No places found for this zone, clear the field and options
            setLocalVotacaoOptions([]);
            setFormData(prev => ({ ...prev, localVotacao: '' }));
          }
        } else {
            setLocalVotacaoOptions([]);
            setFormData(prev => ({ ...prev, localVotacao: '' }));
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
    setSaving(true);
    try {
      const voterRef = ref(database, `eleitores/${id}`);
      await update(voterRef, {
        ...formData,
        // Normaliza campos de endereço para maiúsculas ao salvar
        endereco: formData.endereco ? formData.endereco.trim().toUpperCase() : '',
        bairro: formData.bairro ? formData.bairro.trim().toUpperCase() : '',
        cidade: formData.cidade ? formData.cidade.trim().toUpperCase() : '',
        localVotacao: formData.localVotacao ? formData.localVotacao.trim().toUpperCase() : '',
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

  const handleWhatsApp = () => {
    const phone = formData.telefone;
    if (!phone) return alert("Telefone não cadastrado.");
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length <= 11) {
      cleanPhone = '55' + cleanPhone;
    }
    
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const url = isMobile 
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}`
      : `https://web.whatsapp.com/send?phone=${cleanPhone}`;

    window.open(url, '_blank');
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
            <button onClick={handleWhatsApp} className="btn-secondary btn-whatsapp" style={{ color: '#16a34a', borderColor: '#16a34a', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <MessageCircle size={18} /> WhatsApp
            </button>
            <button onClick={handleDelete} className="btn-secondary btn-excluir" style={{ color: '#ef4444', borderColor: '#ef4444', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Trash2 size={18} /> Excluir
            </button>
            <button onClick={handleSave} className="btn-primary" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Save size={18} /> {saving ? 'Salvando...' : 'Salvar'}
            </button>
        </div>
      </div>

      <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
        <div className="input-group"> <label>Nome Completo</label> <input type="text" name="nome" value={formData.nome || ''} onChange={handleChange} className="custom-input-voter" /> </div>
        <div className="input-group"> <label>Apelido</label> <input type="text" name="apelido" value={formData.apelido || ''} onChange={handleChange} className="custom-input-voter" /> </div>
        <div className="input-group"> <label>E-mail</label> <input type="email" name="email" value={formData.email || ''} onChange={handleChange} className="custom-input-voter" /> </div>
        <div className="input-group"> <label>Telefone</label> <input type="text" name="telefone" value={formData.telefone || ''} onChange={handleMaskedChange} className="custom-input-voter" placeholder="(00) 00000-0000" /> </div>
        <div className="input-group"> <label>Instagram</label> <input type="text" name="instagram" value={formData.instagram || ''} onChange={handleChange} className="custom-input-voter" placeholder="@usuario" /> </div>
        <div className="input-group"> <label>CPF</label> <input type="text" name="cpf" value={formData.cpf || ''} onChange={handleMaskedChange} className="custom-input-voter" placeholder="000.000.000-00" /> </div>
        <div className="input-group"> <label>Sexo</label> 
            <select name="sexo" value={formData.sexo || ''} onChange={handleChange} className="custom-input-voter custom-input-voter-select">
                <option value="">Selecione</option>
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
                <option value="Outro">Outro</option>
            </select>
        </div>
        <div className="input-group"> <label>Data de Nascimento</label> <input type="date" name="nascimento" value={formData.nascimento || ''} onChange={handleChange} className="custom-input-voter" /> </div>
        <div className="input-group"> <label>Título de Eleitor</label> <input type="text" name="titulo" value={formData.titulo || ''} onChange={handleMaskedChange} className="custom-input-voter" placeholder="Apenas números" /> </div>
        <div className="input-group" style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1 }}> <label>Zona</label> <input type="text" name="zona" value={formData.zona || ''} onChange={handleMaskedChange} onBlur={checkLocalVotacao} className="custom-input-voter" style={{ width: '20%' }} placeholder="000" /> </div>
          <div style={{ flex: 1 }}> <label>Seção</label> <input type="text" name="secao" value={formData.secao || ''} onChange={handleMaskedChange} className="custom-input-voter" placeholder="0000" /> </div>
        </div>
        
        <div className="input-group" style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                Local de Votação {localVotacaoLoading && <span style={{ fontSize: '0.75rem', color: '#3b82f6' }}>(Buscando...)</span>}
            </label>
            <select name="localVotacao" value={formData.localVotacao || ''} onChange={handleChange} className="custom-input-voter custom-input-voter-select">
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
          <input type="text" name="cep" value={formData.cep || ''} onChange={handleMaskedChange} onBlur={checkCep} className="custom-input-voter" placeholder="00000-000" />
        </div>
        <div className="input-group"> <label>Endereço</label> <input type="text" name="endereco" value={formData.endereco || ''} onChange={handleChange} className="custom-input-voter" /> </div>
        <div className="input-group"> <label>Número</label> <input type="text" name="numero" value={formData.numero || ''} onChange={handleChange} className="custom-input-voter" /> </div>
        <div className="input-group"> <label>Bairro</label> <input type="text" name="bairro" value={formData.bairro || ''} onChange={handleChange} className="custom-input-voter" /> </div>
        <div className="input-group"> <label>Cidade</label> <input type="text" name="cidade" value={formData.cidade || ''} onChange={handleChange} className="custom-input-voter" /> </div>
        <div className="input-group"> <label>Estado</label> <input type="text" name="estado" value={formData.estado || ''} onChange={handleChange} className="custom-input-voter" /> </div>
      </form> 
    </div>
  );
}