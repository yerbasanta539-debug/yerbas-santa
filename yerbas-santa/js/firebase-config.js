/* ==========================================================
   CONFIGURACIÓN DE FIREBASE
   Reemplazá los valores de abajo por los que te da tu propio
   proyecto de Firebase.
   ========================================================== */

const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};

// No hace falta cambiar este email: es solo la cuenta interna
// que usa el panel de administrador para iniciar sesión.
const ADMIN_EMAIL = "admin@yerbasanta.com";

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Si dejaste los valores de arriba sin completar, la web funciona
// igual en "modo demo" (datos guardados solo en este navegador),
// para que puedas ver el diseño mientras configurás Firebase.
const DEMO_MODE = firebaseConfig.apiKey === "TU_API_KEY";
