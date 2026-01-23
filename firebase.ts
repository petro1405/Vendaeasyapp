
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  updateProfile 
} from "firebase/auth";
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

// Exporta as instâncias dos serviços de forma singleton e as funções de autenticação re-exportadas para uso modular
export const auth = getAuth(app);
export const firestore = getFirestore(app);

// Re-export authentication functions to allow centralized access and resolve module resolution issues in various environments
export { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  updateProfile 
};
