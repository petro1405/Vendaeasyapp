
import { initializeApp } from "firebase/app";
// Fix: Use consolidated named imports for Firebase Auth to ensure all symbols are correctly recognized as exported members of the modular SDK.
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  updateProfile 
} from "firebase/auth";
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
  deleteDoc, 
  onSnapshot 
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC-RUNbXfLcKF11481WmNBtEQKafL3SSPw",
  authDomain: "vendaeasy-14eff.firebaseapp.com",
  projectId: "vendaeasy-14eff",
  storageBucket: "vendaeasy-14eff.firebasestorage.app",
  messagingSenderId: "406229170813",
  appId: "1:406229170813:web:cc89658a27d5a793a40f14",
  measurementId: "G-9YE8JZ77Z3"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const firestore = getFirestore(app);

// Re-export modular functions for cleaner access in db.ts and other components
export { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  updateProfile,
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
  deleteDoc,
  onSnapshot
};
