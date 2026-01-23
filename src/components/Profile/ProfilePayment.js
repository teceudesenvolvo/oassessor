import React, { useState } from 'react';
import { CreditCard, MapPin, X } from 'lucide-react';
import { ref, update } from 'firebase/database';
import { database } from '../../firebaseConfig';

export default function ProfilePayment({ user, profileData, setProfileData, handleSave, loading, handleMaskedInput }) {
  const [showCardModal, setShowCardModal] = useState(false);
  const [cardLoading, setCardLoading] = useState(false);
  const [cardForm, setCardForm] = useState({
    number: '',
    holder: '',
    expiry: '',
    cvv: ''
  });

  const checkCep = async (e) => {
    const cep = e.target.value.replace(/\D/g, '');
    if (cep.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setProfileData(prev => ({
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
    }
  };

  const getBrand = (number) => {
    if (!number) return 'unknown';
    const n = number.replace(/\D/g, '');
    if (n.match(/^4/)) return 'visa';
    if (n.match(/^5[1-5]/)) return 'mastercard';
    if (n.match(/^3[47]/)) return 'amex';
    if (n.match(/^(606282|3841)/)) return 'hipercard';
    if (n.match(/^(4011|438935|451416|504175|5067|5090|6277|6362|6363|650|6516|6550)/)) return 'elo';
    return 'unknown';
  };

  const getCardBrandInfo = (brand) => {
    switch(brand) {
      case 'visa': return { color: '#1a1f71', label: 'VISA' };
      case 'mastercard': return { color: '#eb001b', label: 'MASTER' };
      case 'amex': return { color: '#2e77bc', label: 'AMEX' };
      case 'elo': return { color: '#00a4e0', label: 'ELO' };
      case 'hipercard': return { color: '#be1817', label: 'HIPER' };
      default: return { color: '#64748b', label: <CreditCard size={16} color="white"/> };
    }
  };

  const handleCardInputChange = (e) => {
    const { name, value } = e.target;
    let val = value;

    if (name === 'number') {
      val = val.replace(/\D/g, '').slice(0, 16);
      val = val.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
    } else if (name === 'expiry') {
      val = val.replace(/\D/g, '').slice(0, 4);
      if (val.length > 2) {
        val = val.slice(0, 2) + '/' + val.slice(2);
      }
    } else if (name === 'cvv') {
      val = val.replace(/\D/g, '').slice(0, 4);
    } else if (name === 'holder') {
        val = val.toUpperCase();
    }

    setCardForm(prev => ({ ...prev, [name]: val }));
  };

  const handleSaveCard = async (e) => {
    e.preventDefault();
    if (!user) return;
    
    setCardLoading(true);
    try {
        const userRef = ref(database, `users/${user.uid}`);
        
        const last4 = cardForm.number.replace(/\D/g, '').slice(-4);
        const brand = getBrand(cardForm.number);
        
        const newCard = {
            last4: last4 || '0000',
            holder_name: cardForm.holder,
            exp: cardForm.expiry,
            brand: brand
        };

        const updatedCards = [...(profileData.cards || []), newCard];

        await update(userRef, {
            cards: updatedCards
        });

        setProfileData(prev => ({ ...prev, cards: updatedCards }));
        setShowCardModal(false);
        setCardForm({ number: '', holder: '', expiry: '', cvv: '' });
        alert('Cartão adicionado com sucesso!');
    } catch (error) {
        console.error("Erro ao adicionar cartão:", error);
        alert('Erro ao adicionar cartão.');
    } finally {
        setCardLoading(false);
    }
  };

  const handleRemoveCard = async (index) => {
    if (!user) return;
    if (!window.confirm('Tem certeza que deseja remover este cartão?')) return;

    setCardLoading(true);
    try {
      const updatedCards = profileData.cards.filter((_, i) => i !== index);
      const userRef = ref(database, `users/${user.uid}`);
      await update(userRef, { cards: updatedCards });
      setProfileData(prev => ({ ...prev, cards: updatedCards }));
      alert('Cartão removido com sucesso!');
    } catch (error) {
      console.error("Erro ao remover cartão:", error);
      alert('Erro ao remover cartão.');
    } finally {
      setCardLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Seção de Cartões */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', color: '#0f172a' }}>
            <CreditCard size={20} /> Seus Cartões
          </h4>
          <button className="btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 12px' }} onClick={() => setShowCardModal(true)}>
            + Adicionar Cartão
          </button>
        </div>
        
        {(!profileData.cards || profileData.cards.length === 0) ? (
          <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '8px', textAlign: 'center', color: '#64748b', border: '1px dashed #cbd5e1' }}>
            Nenhum cartão cadastrado.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {profileData.cards.map((card, index) => (
              <div key={index} style={{ padding: '15px', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ 
                    width: '50px', height: '32px', 
                    backgroundColor: getCardBrandInfo(card.brand).color, 
                    borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontSize: '10px', fontWeight: 'bold', letterSpacing: '1px'
                  }}>
                    {getCardBrandInfo(card.brand).label}
                  </div>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>•••• {card.last4}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Expira em {card.exp}</div>
                  </div>
                </div>
                <button onClick={() => handleRemoveCard(index)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>Remover</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Seção de Endereço de Cobrança */}
      <div>
        <h4 style={{ margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '10px', color: '#0f172a' }}>
          <MapPin size={20} /> Endereço de Cobrança
        </h4>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
           <div style={{ flex: '1 1 150px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b' }}>CEP</label>
              <input type="text" name="cep" style={{ width: '70%'}} value={profileData.cep} onChange={handleMaskedInput} onBlur={checkCep} className="custom-input" placeholder="00000-000" />
           </div>
           <div style={{ flex: '1 1 100px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b' }}>Estado</label>
              <input style={{ width: '70%'}} type="text" value={profileData.estado} onChange={(e) => setProfileData({...profileData, estado: e.target.value})} className="custom-input" placeholder="UF" />
           </div>
        </div>

        <div style={{ marginTop: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b' }}>Endereço</label>
            <input type="text" value={profileData.endereco} onChange={(e) => setProfileData({...profileData, endereco: e.target.value})} className="custom-input" placeholder="Rua, Avenida..." />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginTop: '15px' }}>
           <div style={{ flex: '1 1 100px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b' }}>Número</label>
              <input type="text" style={{ width: '60%'}} value={profileData.numero} onChange={(e) => setProfileData({...profileData, numero: e.target.value})} className="custom-input" placeholder="123" />
           </div>
           <div style={{ flex: '2 1 200px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b' }}>Bairro</label>
              <input style={{ width: '80%'}} type="text" value={profileData.bairro} onChange={(e) => setProfileData({...profileData, bairro: e.target.value})} className="custom-input" placeholder="Bairro" />
           </div>
        </div>
        
        <div style={{ marginTop: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b' }}>Cidade</label>
            <input type="text" value={profileData.cidade} onChange={(e) => setProfileData({...profileData, cidade: e.target.value})} className="custom-input" placeholder="Cidade" />
        </div>
      </div>

      <button type="button" onClick={handleSave} disabled={loading} className="btn-primary" style={{ marginTop: '10px', width: '100%', justifyContent: 'center' }}>
        {loading ? 'Salvando...' : 'Salvar Dados de Cobrança'}
      </button>

      {showCardModal && (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
            display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
            <div style={{
                backgroundColor: 'white', padding: '25px', borderRadius: '12px',
                width: '90%', maxWidth: '400px', position: 'relative'
            }}>
                <button 
                    onClick={() => setShowCardModal(false)}
                    style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                    <X size={20} color="#64748b" />
                </button>
                
                <h3 style={{ marginBottom: '20px' }}>Novo Cartão</h3>
                
                <form onSubmit={handleSaveCard} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div className="input-group">
                        <label>Número do Cartão</label>
                        <input 
                            type="text" 
                            name="number"
                            value={cardForm.number} 
                            onChange={handleCardInputChange} 
                            className="custom-input" 
                            placeholder="0000 0000 0000 0000"
                            required 
                        />
                    </div>
                    
                    <div className="input-group">
                        <label>Nome do Titular</label>
                        <input 
                            type="text" 
                            name="holder"
                            value={cardForm.holder} 
                            onChange={handleCardInputChange} 
                            className="custom-input" 
                            placeholder="Como no cartão"
                            required 
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '15px' }}>
                        <div className="input-group" style={{ flex: 1 }}>
                            <label>Validade</label>
                            <input 
                                type="text" 
                                name="expiry"
                                value={cardForm.expiry} 
                                onChange={handleCardInputChange} 
                                className="custom-input" 
                                placeholder="MM/AA"
                                style={{ width: '50%' }}
                                required 
                            />
                        </div>
                        <div className="input-group" style={{ flex: 1 }}>
                            <label>CVV</label>
                            <input 
                                type="text" 
                                name="cvv"
                                value={cardForm.cvv} 
                                onChange={handleCardInputChange} 
                                className="custom-input" 
                                placeholder="123"
                                style={{ width: '55%' }}
                                required 
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn-primary" disabled={cardLoading} style={{ marginTop: '10px', justifyContent: 'center' }}>
                        {cardLoading ? 'Salvando...' : 'Adicionar Cartão'}
                    </button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}