
import { initializeApp } from "@firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  updateProfile 
} from "@firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  collection, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  updateDoc, 
  deleteDoc 
} from "@firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC-RUNbXfLcKF11481WmNBtEQKafL3SSPw",
  authDomain: "vendaeasy-14eff.firebaseapp.com",
  projectId: "vendaeasy-14eff",
  storageBucket: "vendaeasy-14eff.firebasestorage.app",
  messagingSenderId: "406229170813",
  appId: "1:406229170813:web:cc89658a27d5a793a40f14",
  measurementId: "G-9YE8JZ77Z3"
};

// Inicialização Única
const app = initializeApp(firebaseConfig);

// Instâncias
export const auth = getAuth(app);
export const firestore = getFirestore(app);

// Re-exportação de Funções de Auth
export { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  updateProfile 
};

// Re-exportação de Funções de Firestore
export { 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  collection, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  updateDoc, 
  deleteDoc 
};
