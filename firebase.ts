
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Sua configuração do Firebase obtida no Console
const firebaseConfig = {
  apiKey: "AIzaSyC-RUNbXfLcKF11481WmNBtEQKafL3SSPw",
  authDomain: "vendaeasy-14eff.firebaseapp.com",
  projectId: "vendaeasy-14eff",
  storageBucket: "vendaeasy-14eff.firebasestorage.app",
  messagingSenderId: "406229170813",
  appId: "1:406229170813:web:cc89658a27d5a793a40f14",
  measurementId: "G-9YE8JZ77Z3"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Exporta as instâncias dos serviços para serem usadas no db.ts
// getAuth(app) is the correct way to initialize Auth in modular v9
export const auth = getAuth(app);
export const firestore = getFirestore(app);
