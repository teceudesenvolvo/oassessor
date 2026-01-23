import React, { useState } from 'react';
import { Key, Lock } from 'lucide-react';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../../firebaseConfig';

export default function ProfilePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("As senhas não coincidem.");
      return;
    }
    if (newPassword.length < 6) {
      alert("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);
    const user = auth.currentUser;

    if (user && user.email) {
      try {
        // Reautenticar o usuário antes de alterar a senha
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);

        // Atualizar a senha
        await updatePassword(user, newPassword);
        
        alert("Senha atualizada com sucesso!");
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } catch (error) {
        console.error("Erro ao atualizar senha:", error);
        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            alert("A senha atual está incorreta.");
        } else if (error.code === 'auth/requires-recent-login') {
            alert("Por segurança, faça login novamente antes de alterar sua senha.");
        } else {
            alert("Erro ao atualizar senha: " + error.message);
        }
      }
    } else {
        alert("Usuário não autenticado ou sem e-mail vinculado.");
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        <div>
            <h4 style={{ margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '10px', color: '#0f172a' }}>
                <Key size={20} /> Alterar Senha
            </h4>
            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' }}>Senha Atual</label>
                    <div className="input-container">
                        <Lock size={18} className="field-icon-left" />
                        <input 
                            type="password" 
                            value={currentPassword} 
                            onChange={(e) => setCurrentPassword(e.target.value)} 
                            className="custom-input" 
                            placeholder="••••••••"
                            required
                        />
                    </div>
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' }}>Nova Senha</label>
                    <div className="input-container">
                        <Lock size={18} className="field-icon-left" />
                        <input 
                            type="password" 
                            value={newPassword} 
                            onChange={(e) => setNewPassword(e.target.value)} 
                            className="custom-input" 
                            placeholder="••••••••"
                            required
                        />
                    </div>
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' }}>Confirmar Nova Senha</label>
                    <div className="input-container">
                        <Lock size={18} className="field-icon-left" />
                        <input 
                            type="password" 
                            value={confirmPassword} 
                            onChange={(e) => setConfirmPassword(e.target.value)} 
                            className="custom-input" 
                            placeholder="••••••••"
                            required
                        />
                    </div>
                </div>
                <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '10px', width: '100%', justifyContent: 'center' }}>
                    {loading ? 'Atualizando...' : 'Atualizar Senha'}
                </button>
            </form>
        </div>
    </div>
  );
}