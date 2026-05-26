const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

const db = admin.firestore();

/**
 * 1. onUserCreate
 * Trigger: Auth create.
 * Acción: Crea los documentos iniciales en /users/{uid} y /subscriptions/{uid}.
 */
exports.onUserCreate = functions.auth.user().onCreate(async (user) => {
  const { uid, phoneNumber, email, displayName, photoURL } = user;
  
  const userDoc = {
    nick: displayName || "Usuario",
    edad: null,
    rol: "versátil",
    intencion: "conocer",
    fotoUrl: photoURL || "",
    online: false,
    lastSeen: admin.firestore.FieldValue.serverTimestamp(),
    premium: false,
    disponibleHasta: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const subscriptionDoc = {
    stripeCustomerId: "",
    subscriptionId: "",
    status: "incomplete",
    renewalDate: null,
  };

  const batch = db.batch();
  batch.set(db.collection("users").doc(uid), userDoc);
  batch.set(db.collection("subscriptions").doc(uid), subscriptionDoc);
  
  return batch.commit();
});

/**
 * 2. updateGeohash
 * Trigger: Write en /locations/{uid}.
 * Acción: Calcula el geohash usando GeoFire y normaliza la ubicación.
 */
exports.updateGeohash = functions.firestore
  .document("locations/{userId}")
  .onWrite(async (change, context) => {
    // Lógica para calcular geohash (requiere geofire-common o similar)
    console.log("Updating geohash for user:", context.params.userId);
    return null;
  });

/**
 * 3. cleanupAvailability
 * Trigger: Cron job (cada 5 minutos).
 * Acción: Limpia usuarios cuyo disponibleHasta haya expirado.
 */
exports.cleanupAvailability = functions.pubsub
  .schedule("every 5 minutes")
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    const expiredUsers = await db.collection("users")
      .where("disponibleHasta", "<", now)
      .get();

    const batch = db.batch();
    expiredUsers.forEach(doc => {
      batch.update(doc.ref, { disponibleHasta: null });
    });

    return batch.commit();
  });

/**
 * 4. sendMessageNotification
 * Trigger: Mensaje nuevo en /chats/{chatId}/messages/{messageId}.
 * Acción: Envía notificación push vía FCM.
 */
exports.sendMessageNotification = functions.firestore
  .document("chats/{chatId}/messages/{messageId}")
  .onCreate(async (snapshot, context) => {
    const message = snapshot.data();
    console.log("New message in chat:", context.params.chatId);
    // Lógica para obtener el receptor y enviar notificación
    return null;
  });

/**
 * 5. createCheckoutSession
 * Trigger: Callable Function (onCall).
 * Acción: Crea sesión de Stripe Checkout.
 */
exports.createCheckoutSession = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Debes estar logueado.");
  }
  // Lógica de Stripe
  return { sessionId: "CHECKOUT_SESSION_ID" };
});

/**
 * 6. stripeWebhook
 * Trigger: HTTP.
 * Acción: Procesa eventos de Stripe.
 */
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  // Lógica de Webhook
  res.status(200).send("Webhook received");
});
