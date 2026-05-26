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

const { getGeohashRange, geohashForLocation } = require("geofire-common");

/**
 * 2. updateGeohash
 * Trigger: Write en /locations/{uid}.
 * Acción: Calcula el geohash usando GeoFire y normaliza la ubicación.
 */
exports.updateGeohash = functions.firestore
  .document("locations/{userId}")
  .onWrite(async (change, context) => {
    const data = change.after.data();
    if (!data || !data.lat || !data.lng) return null;

    const geohash = geohashForLocation([data.lat, data.lng]);
    
    // Evitar bucles infinitos comparando el geohash actual
    if (data.geohash === geohash) return null;

    return change.after.ref.update({
      geohash: geohash,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
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
    const chatId = context.params.chatId;

    // Obtener información del chat para saber quién es el receptor
    const chatDoc = await db.collection("chats").doc(chatId).get();
    const chatData = chatDoc.data();
    
    if (!chatData) return null;

    // El receptor es el usuario del chat que NO envió el mensaje
    const receiverId = chatData.users.find(uid => uid !== message.senderId);
    if (!receiverId) return null;

    // Obtener el perfil del receptor y el emisor
    const [receiverDoc, senderDoc] = await Promise.all([
      db.collection("users").doc(receiverId).get(),
      db.collection("users").doc(message.senderId).get()
    ]);

    const receiverData = receiverDoc.data();
    const senderData = senderDoc.data();

    if (!receiverData || !receiverData.fcmToken) {
      console.log("Receptor no tiene token FCM registrado.");
      return null;
    }

    const payload = {
      notification: {
        title: `Nuevo mensaje de ${senderData?.nick || "Alguien"}`,
        body: message.content,
        icon: senderData?.fotoUrl || "/favicon.ico",
        clickAction: `https://gay-meet-app-mvp-26.web.app/chat/${chatId}`
      }
    };

    try {
      await admin.messaging().sendToDevice(receiverData.fcmToken, payload);
      console.log("Notificación enviada con éxito.");
    } catch (error) {
      console.error("Error enviando notificación:", error);
    }

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
