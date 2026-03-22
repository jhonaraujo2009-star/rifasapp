// ============================================================
//  firebase.js – Configuración e inicialización de Firebase
//  Reemplaza los valores de firebaseConfig con los de tu
//  proyecto en console.firebase.google.com
// ============================================================
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyB6xMmh_42AO-qZ-8kfxs5xBtlk5Xh-EyM",
  authDomain: "rifasaraujo-39da4.firebaseapp.com",
  projectId: "rifasaraujo-39da4",
  storageBucket: "rifasaraujo-39da4.firebasestorage.app",
  messagingSenderId: "610928529813",
  appId: "1:610928529813:web:25b8f4d4848641e5f5e69c"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
