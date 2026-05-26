const admin = require('firebase-admin');
const { geohashForLocation } = require('geofire-common');

// Inicialización
// NOTA: Para ejecutar esto localmente, necesitas descargar tu serviceAccountKey.json 
// desde la Consola de Firebase -> Configuración del proyecto -> Cuentas de servicio
// Y poner la ruta aquí:
// const serviceAccount = require("./serviceAccountKey.json");
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });

// Si ya estás logueado con Firebase CLI, a veces basta con:
admin.initializeApp({
  projectId: 'gay-meet-app-mvp-26'
});

const db = admin.firestore();

const nicks = ["Alex", "Marc", "Javi", "Dani", "Carlos", "Santi", "Rubén", "Leo", "Hugo", "Iván", "Lucas", "Adri", "Miki", "Pau", "Joel"];
const roles = ["activo", "pasivo", "versátil"];
const intenciones = ["conocer", "quedar"];

// Centro: Alcalá de Henares
const BASE_LAT = 40.48;
const BASE_LNG = -3.36;

async function seedUsers(count = 50) {
  console.log(`Generando ${count} usuarios de prueba...`);

  const batch = db.batch();

  for (let i = 0; i < count; i++) {
    const uid = `test_user_${i}`;
    const lat = BASE_LAT + (Math.random() - 0.5) * 0.1;
    const lng = BASE_LNG + (Math.random() - 0.5) * 0.1;
    const geohash = geohashForLocation([lat, lng]);

    const userData = {
      nick: nicks[Math.floor(Math.random() * nicks.length)] + "_" + i,
      edad: 18 + Math.floor(Math.random() * 40),
      rol: roles[Math.floor(Math.random() * roles.length)],
      intencion: intenciones[Math.floor(Math.random() * intenciones.length)],
      fotoUrl: `https://i.pravatar.cc/150?u=${uid}`,
      online: Math.random() > 0.3,
      lat: lat,
      lng: lng,
      geohash: geohash,
      lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      disponibleHasta: Math.random() > 0.5 ? admin.firestore.Timestamp.fromDate(new Date(Date.now() + 3600000)) : null
    };

    const userRef = db.collection('users').doc(uid);
    batch.set(userRef, userData);

    // También crear documento de ubicación por si acaso la app lo usa por separado
    const locRef = db.collection('locations').doc(uid);
    batch.set(locRef, { lat, lng, geohash, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  }

  await batch.commit();
  console.log("¡Hecho! 50 usuarios creados en Alcalá de Henares.");
}

seedUsers().catch(console.error);
