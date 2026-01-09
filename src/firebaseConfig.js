import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Substitua pelas suas credenciais do Firebase Console
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "oassessor-blu.firebaseapp.com",
  databaseURL: "https://oassessor-blu-default-rtdb.firebaseio.com",
  projectId: "oassessor-blu",
  storageBucket: "oassessor-blu.appspot.com",
  messagingSenderId: "SEU_SENDER_ID",
  appId: "SEU_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);