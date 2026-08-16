// Uso: node scripts/set-admin-role.js <uid-o-email>
//
// Fija role: 'admin' en el documento users/{uid} del usuario indicado.
// Necesario porque firestore.rules ahora valida isAdmin() consultando ese campo
// en vez de un correo hardcodeado (ver HANDOVER.md, Paso 6).
//
// Requiere credenciales de servicio con acceso al proyecto. Antes de ejecutar:
//   set GOOGLE_APPLICATION_CREDENTIALS=ruta\a\tu\service-account.json   (PowerShell: $env:GOOGLE_APPLICATION_CREDENTIALS="...")
// o estar autenticado con `firebase login` + `gcloud auth application-default login`.

const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();
const auth = admin.auth();

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error("Uso: node scripts/set-admin-role.js <uid-o-email>");
    process.exit(1);
  }

  const userRecord = arg.includes("@")
    ? await auth.getUserByEmail(arg)
    : await auth.getUser(arg);

  const uid = userRecord.uid;
  await db.collection("users").doc(uid).set({ role: "admin" }, { merge: true });

  console.log(`OK: role: 'admin' asignado a users/${uid} (${userRecord.email || "sin email"}).`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
