import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Substitua pelas suas credenciais do Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyBNW0mDARNEofVO6iJXwYz-IAXKy9BxJ3Y",
  authDomain: "oassessor-blu.firebaseapp.com",
  databaseURL: "https://oassessor-blu-default-rtdb.firebaseio.com",
  projectId: "oassessor-blu",
  storageBucket: "oassessor-blu.firebasestorage.app",
  messagingSenderId: "951583753744",
  appId: "1:951583753744:web:ad9766f2b6c40da901ac95",
  measurementId: "G-LTTWECEMYW"
};

const app = initializeApp(firebaseConfig);
const FIRESTORE_DATABASE_ID = "(default)";
export const auth = getAuth(app);
// Alias de compatibilidade para chamadas legadas do estilo RTDB.
// O valor em si não é utilizado pela camada `firestoreDatabase`, apenas passado
// como assinatura para `ref(database, path)`. Mantemos um objeto estável para
// evitar ciclos/TDZ durante hot reload e inicialização.
export const database = { __compat: 'firestore' };

export const firestore = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  useFetchStreams: false,
  ignoreUndefinedProperties: true
}, FIRESTORE_DATABASE_ID);
export const analytics = getAnalytics(app);
