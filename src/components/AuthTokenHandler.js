import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '../firebaseConfig';

const AuthTokenHandler = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const token = queryParams.get('token');

    if (token) {
      signInWithCustomToken(auth, token)
        .then((userCredential) => {
          console.log("Login via token realizado com sucesso", userCredential.user.uid);
          // Redireciona para o dashboard e remove o token da URL (replace: true)
          navigate('/dashboard', { replace: true });
        })
        .catch((error) => {
          console.error("Erro ao fazer login com token:", error);
          // Em caso de erro, redireciona para a página de login normal
          navigate('/login', { replace: true });
        });
    }
  }, [location, navigate]);

  // Este componente não renderiza nada visualmente
  return null;
};

export default AuthTokenHandler;