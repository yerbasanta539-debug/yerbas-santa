/* ==========================================================
   CONFIGURACIÓN DE FIREBASE
   ========================================================== */

const firebaseConfig = {
  apiKey: "AIzaSyD_K8BEDDfk0PRYeO1_26Un1lZVbDRwMy4",
  authDomain: "yerbas-santa-47cbf.firebaseapp.com",
  projectId: "yerbas-santa-47cbf",
  storageBucket: "yerbas-santa-47cbf.firebasestorage.app",
  messagingSenderId: "596170771719",
  appId: "1:596170771719:web:397e2590801b1848ec49a2"
};

// No hace falta cambiar este email: es solo la cuenta interna
// que usa el panel de administrador para iniciar sesión.
const ADMIN_EMAIL = "admin@yerbasanta.com";

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Si dejaste los valores de arriba sin completar, la web funciona
// igual en "modo demo" (datos guardados solo en este navegador).
const DEMO_MODE = firebaseConfig.apiKey === "TU_API_KEY";
