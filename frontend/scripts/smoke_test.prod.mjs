import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, deleteUser } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, deleteDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Configuración de Producción
const firebaseConfig = {
  projectId: "gay-meet-app-mvp-26",
  appId: "1:410458751631:web:5104de4d1f227cebe566fa",
  storageBucket: "gay-meet-app-mvp-26.firebasestorage.app",
  apiKey: "AIzaSyDxWUweEG-H_fZiYLDlHr6Uz6p4VTsTvtQ",
  authDomain: "gay-meet-app-mvp-26.firebaseapp.com",
  messagingSenderId: "410458751631",
  measurementId: "G-02P71J812C",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, 'us-central1');

async function runSmokeTest() {
  const venueId = "venue_smoke_test";
  let userCredential;

  console.log("🚀 Iniciando Smoke Test en PRODUCCIÓN E2E...");

  try {
    // 1. Registro
    console.log(`[1] Registrando usuario anónimo (Auth Email/Pass deshabilitado en Prod?)...`);
    userCredential = await signInAnonymously(auth);
    const uid = userCredential.user.uid;
    console.log(`✅ Usuario creado. UID: ${uid}`);

    // 2. Perfil
    console.log(`[2] Creando perfil de usuario...`);
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
      displayName: "Smoke Tester",
      role: "user",
      createdAt: new Date(),
    });
    console.log(`✅ Perfil creado en Firestore.`);

    // 3. (Simulación rápida de Discovery)
    console.log(`[3] Validando lectura del propio perfil (Reglas)...`);
    const profileSnap = await getDoc(userRef);
    if (profileSnap.exists()) {
        console.log(`✅ Perfil accesible mediante reglas de seguridad de Prod.`);
    }

    // 4. Configurar Venue Dummy (Atención: esto podría fallar si las reglas impiden crear venues a usuarios rasos)
    console.log(`[4] Preparando Venue de Smoke Test...`);
    try {
        await setDoc(doc(db, 'venues', venueId), {
            name: "Smoke Test Venue",
            currentCount: 0,
            capacity: 100
        });
        console.log(`✅ Venue de prueba configurado.`);
    } catch(e) {
        console.log(`⚠️ No se pudo crear el venue (probablemente las reglas de seguridad lo bloquean, lo cual es correcto). Saltando creación de venue...`);
    }

    // 5. Check-in
    console.log(`[5] Ejecutando Check-in via Cloud Function...`);
    const checkInUser = httpsCallable(functions, 'checkInUser');
    const checkInStart = Date.now();
    const checkInRes = await checkInUser({ venueId });
    const checkInEnd = Date.now();
    console.log(`✅ Check-in exitoso en ${checkInEnd - checkInStart}ms:`, checkInRes.data);

    // Validar en Firestore
    console.log(`[6] Validando estado en la base de datos...`);
    const checkinDoc = await getDoc(doc(db, 'checkins', uid));
    if (!checkinDoc.exists()) {
        throw new Error("El documento de checkin no se generó en Firestore.");
    }
    console.log(`✅ Documento de check-in verificado en base de datos.`);

    // 7. Check-out
    console.log(`[7] Ejecutando Check-out via Cloud Function...`);
    const checkOutUser = httpsCallable(functions, 'checkOutUser');
    const checkOutStart = Date.now();
    const checkOutRes = await checkOutUser({ venueId });
    const checkOutEnd = Date.now();
    console.log(`✅ Check-out exitoso en ${checkOutEnd - checkOutStart}ms:`, checkOutRes.data);

    // Limpieza
    console.log(`[8] Limpiando datos de prueba...`);
    await deleteDoc(userRef);
    try {
        await deleteDoc(doc(db, 'venues', venueId));
    } catch(e) {}
    await userCredential.user.delete();
    console.log(`✅ Usuario y datos eliminados.`);

    console.log("🎉 SMOKE TEST DE USUARIO COMPLETO: SUCCESS");
    process.exit(0);
  } catch (error) {
    console.error("❌ ERROR en Smoke Test:", error);
    if (userCredential?.user) {
        console.log("Intentando limpiar usuario residual...");
        await userCredential.user.delete().catch(()=>console.log("Limpieza fallida."));
    }
    process.exit(1);
  }
}

runSmokeTest();
