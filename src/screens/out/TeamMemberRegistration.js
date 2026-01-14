import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { ref, query, orderByChild, equalTo, get, update } from 'firebase/database';
import { auth, database } from '../../firebaseConfig';
import Navbar from '../../components/Navbar';

export default function TeamMemberRegistration() {
    const location = useLocation();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const emailParam = searchParams.get('email');
        if (emailParam) {
            setEmail(emailParam);
        }
    }, [location]);

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (password !== confirmPassword) {
            setError('As senhas não coincidem.');
            setLoading(false);
            return;
        }

        try {
            if (!email) {
                setError('O e-mail não foi fornecido na URL.');
                setLoading(false);
                return;
            }

            // Buscar o nó do usuário no Realtime Database pelo email
            const usersRef = ref(database, 'users');
            const q = query(usersRef, orderByChild('email'), equalTo(email));
            const snapshot = await get(q);

            if (!snapshot.exists()) {
                setError('Não foi encontrado um convite para este e-mail.');
                setLoading(false);
                return;
            }

            // No Realtime DB, o resultado é um objeto onde as chaves são os IDs
            const data = snapshot.val();
            const userKey = Object.keys(data)[0]; // Pega a primeira chave encontrada

            // Se o convite é válido, cria o usuário na autenticação
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Atualiza o nó no Realtime Database com o novo UID
            const updates = {};
            updates[`/users/${userKey}/userId`] = user.uid;
            updates[`/users/${userKey}/uid`] = user.uid;
            
            console.log("Atualizando usuário:", userKey, "com UID:", user.uid);
            await update(ref(database), updates);

            alert('Cadastro realizado com sucesso! Bem-vindo à equipe.');
            navigate('/dashboard');
        } catch (err) {
            console.error(err);
            let msg = 'Erro ao realizar cadastro.';
            if (err.code === 'auth/email-already-in-use') { // Este erro agora é mais significativo
                msg = 'Este e-mail já possui uma conta. Por favor, tente fazer o login.';
            } else if (err.code === 'auth/weak-password') {
                msg = 'A senha deve ter pelo menos 6 caracteres.';
            }
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <header className="hero-section" style={{ minHeight: 'auto', paddingBottom: '20px' }}>
                <Navbar />
            </header>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: '20px' }}>
                <div className="dashboard-card" style={{ maxWidth: '400px', width: '100%' }}>
                    <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Finalizar Cadastro</h2>
                    <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '20px' }}>
                        Defina sua senha para acessar a equipe.
                    </p>
                    {error && <p style={{ color: '#ef4444', marginBottom: '15px', textAlign: 'center', fontSize: '0.9rem' }}>{error}</p>}

                    <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#475569', fontSize: '0.9rem' }}>E-mail</label>
                            <input type="email" value={email} disabled style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f1f5f9', color: '#64748b' }} />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#475569', fontSize: '0.9rem' }}>Senha</label>
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Mínimo 6 caracteres" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#475569', fontSize: '0.9rem' }}>Confirmar Senha</label>
                            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required placeholder="Repita a senha" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                        </div>

                        <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '10px', width: '100%', justifyContent: 'center', padding: '12px' }}>
                            {loading ? 'Processando...' : 'Entrar na Equipe'}
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
}