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
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);