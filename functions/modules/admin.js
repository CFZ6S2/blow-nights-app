const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { db } = require("../lib/init");

/**
 * getAdminAnalytics — Devuelve métricas globales agregadas sin coste masivo de lecturas.
 */
exports.getAdminAnalytics = onCall({ enforceAppCheck: true }, async (request) => {
  const { auth } = request;
  if (!auth) throw new HttpsError("unauthenticated", "Login requerido.");

  // Validar rol de administrador
  const callerIsAdmin = auth.token.role === 'admin' || auth.token.role === 'superadmin' || auth.token.email === 'cesar.herrera.rojo@gmail.com';
  if (!callerIsAdmin) {
    throw new HttpsError("permission-denied", "No tienes permisos de administrador.");
  }

  try {
    // 1. Consultas de agregación nativas de Firestore (cuentan documentos sin descargarlos)
    const [
      usersCountSnap, onlineCountSnap, premiumCountSnap, reportsCountSnap, verifCountSnap,
      venuesCountSnap, citiesCountSnap, partnerAppsCountSnap, rrppAppsCountSnap,
      organizerAppsCountSnap, promotersCountSnap
    ] = await Promise.all([
      db.collection("users").count().get(),
      db.collection("users").where("online", "==", true).count().get(),
      db.collection("users").where("premium", "==", true).count().get(),
      db.collection("reports").where("status", "==", "pending").count().get(),
      db.collection("verifications").where("status", "==", "pending").count().get(),
      db.collection("venues").count().get(),
      db.collection("cities").count().get(),
      db.collection("partner_applications").where("status", "==", "pending").count().get(),
      db.collection("rrpp_applications").where("status", "==", "pending").count().get(),
      db.collection("organizer_applications").where("status", "==", "pending").count().get(),
      db.collectionGroup("promoters").count().get()
    ]);

    return {
      success: true,
      stats: {
        totalUsers: usersCountSnap.data().count,
        onlineUsers: onlineCountSnap.data().count,
        premiumUsers: premiumCountSnap.data().count,
        pendingReports: reportsCountSnap.data().count,
        pendingVerifications: verifCountSnap.data().count,
        totalVenues: venuesCountSnap.data().count,
        totalCities: citiesCountSnap.data().count,
        pendingPartnerApps: partnerAppsCountSnap.data().count,
        pendingRrppApps: rrppAppsCountSnap.data().count,
        pendingOrganizerApps: organizerAppsCountSnap.data().count,
        totalPromoters: promotersCountSnap.data().count
      }
    };
  } catch (error) {
    console.error("Error al obtener analytics de admin:", error);
    throw new HttpsError("internal", "Error al calcular métricas.");
  }
});
