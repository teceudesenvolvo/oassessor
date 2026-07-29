import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
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

export const firestore = getFirestore(app, FIRESTORE_DATABASE_ID);
// Alias temporário para manter compatibilidade com componentes durante a transição.
// Todas as operações de dados são executadas pela camada Firestore.
export const database = firestore;
export const analytics = getAnalytics(app);
