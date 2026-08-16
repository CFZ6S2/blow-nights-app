const functions = require("firebase-functions/v1");
const { setGlobalOptions } = require("firebase-functions/v2");
const { onDocumentCreated, onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall, HttpsError, onRequest } = require("firebase-functions/v2/https");

const admin = require("firebase-admin");
admin.initializeApp();

const db = admin.firestore();

// Configuración global para Gen 2 - Usamos us-central1 para máxima compatibilidad con triggers de eur3
setGlobalOptions({ region: "us-central1" });

/**
 * 1. onUserCreate (Usando V1 explícitamente para asegurar compatibilidad)
 */
exports.onUserCreate = functions.auth.user().onCreate(async (user) => {
  const { uid, phoneNumber, email, displayName, photoURL } = user;
  
  // Promoción: Los primeros 100 usuarios son Premium automáticamente
  let isPremium = false;
  try {
    const statsRef = db.collection("system").doc("promoStats");
    let statsSnapshot = await statsRef.get();
    let initialCount = 0;
    
    // Si es la primera vez, contamos los usuarios actuales como base
    if (!statsSnapshot.exists) {
      const usersSnapshot = await db.collection("users").count().get();
      initialCount = usersSnapshot.data().count;
    }

    isPremium = await db.runTransaction(async (transaction) => {
      const statsDoc = await transaction.get(statsRef);
      let count = initialCount;
      
      if (statsDoc.exists) {
        count = statsDoc.data().count || 0;
      }
      
      if (count < 100) {
        transaction.set(statsRef, { count: count + 1 }, { merge: true });
        return true;
      }
      return false;
    });
    console.log(`Usuario ${uid} registrado. Promo Premium: ${isPremium}`);
  } catch (error) {
    console.error("Error al contar usuarios para premium promo:", error);
    // Fallback: Tu correo siempre es premium
    isPremium = email === 'cesar.herrera.rojo@gmail.com';
  }

  const userDoc = {
    nick: displayName || "Usuario",
    edad: null,
    rol: "versátil",
    intencion: "conocer",
    fotoUrl: photoURL || "",
    online: false,
    lastSeen: admin.firestore.FieldValue.serverTimestamp(),
    premium: isPremium,
    disponibleHasta: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const subscriptionDoc = {
    stripeCustomerId: "",
    subscriptionId: "",
    status: isPremium ? "active" : "incomplete",
    renewalDate: null,
    promoMember: isPremium // Marcamos que es miembro de la promo inicial
  };

  const batch = db.batch();
  batch.set(db.collection("users").doc(uid), userDoc);
  batch.set(db.collection("subscriptions").doc(uid), subscriptionDoc);
  
  return batch.commit();
});

const { geohashForLocation } = require("geofire-common");

/**
 * 2. updateGeohash
 */
exports.updateGeohash = onDocumentWritten("locations/{userId}", async (event) => {
    const data = event.data?.after?.data();
    if (!data || !data.lat || !data.lng) return null;

    const geohash = geohashForLocation([data.lat, data.lng]);
    if (data.geohash === geohash) return null;

    return event.data.after.ref.update({
      geohash: geohash,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
});

/**
 * 3. cleanupAvailability
 */
exports.cleanupAvailability = onSchedule("every 5 minutes", async (event) => {
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
 */
exports.sendMessageNotification = onDocumentCreated("chats/{chatId}/messages/{messageId}", async (event) => {
    const message = event.data?.data();
    if (!message) return null;
    const chatId = event.params.chatId;

    const chatDoc = await db.collection("chats").doc(chatId).get();
    const chatData = chatDoc.data();
    if (!chatData) return null;

    const receiverId = chatData.users.find(uid => uid !== message.senderId);
    if (!receiverId) return null;

    // NO enviar notificación si el usuario ya está activo en el chat (leyendo en tiempo real)
    const activeUsers = chatData.activeUsers || [];
    if (activeUsers.includes(receiverId)) {
      console.log(`Usuario ${receiverId} activo en chat ${chatId}. Saltando notificación.`);
      return null;
    }

    const [receiverDoc, senderDoc] = await Promise.all([
      db.collection("users").doc(receiverId).get(),
      db.collection("users").doc(message.senderId).get()
    ]);

    const receiverData = receiverDoc.data();
    const senderData = senderDoc.data();

    if (!receiverData?.fcmToken) return null;

    const payload = {
      token: receiverData.fcmToken,
      notification: {
        title: `Nuevo mensaje de ${senderData?.nick || "Alguien"}`,
        body: message.content,
      },
      data: {
        type: "chat",
        chatId: chatId,
        click_action: `https://gay-meet-app-mvp-26.web.app/chat/detail?id=${chatId}`
      }
    };

    try {
      await admin.messaging().send(payload);
    } catch (error) {
      console.error("Error FCM Message:", error);
    }
    return null;
});

/**
 * 7. sendLikeNotification
 */
exports.sendLikeNotification = onDocumentCreated("likes/{likeId}", async (event) => {
    const likeData = event.data?.data();
    if (!likeData || likeData.isMatch) return null;

    const [receiverDoc, senderDoc] = await Promise.all([
      db.collection("users").doc(likeData.toId).get(),
      db.collection("users").doc(likeData.fromId).get()
    ]);

    const receiverData = receiverDoc.data();
    const senderData = senderDoc.data();

    if (!receiverData?.fcmToken) return null;

    const payload = {
      token: receiverData.fcmToken,
      notification: {
        title: "¡Alguien te dio like! ❤️",
        body: `${senderData?.nick || "Un usuario"} está interesado en ti.`,
      },
      data: {
        type: "like",
        senderId: likeData.fromId,
        click_action: "https://gay-meet-app-mvp-26.web.app/visits"
      }
    };

    try {
      await admin.messaging().send(payload);
    } catch (error) {
      console.error("Error FCM Like:", error);
    }
    return null;
});

/**
 * 8. sendMatchNotification
 */
exports.sendMatchNotification = onDocumentCreated("matches/{matchId}", async (event) => {
    const matchData = event.data?.data();
    if (!matchData) return null;
    
    const sendToUser = async (targetId, otherId) => {
      const [targetDoc, otherDoc] = await Promise.all([
        db.collection("users").doc(targetId).get(),
        db.collection("users").doc(otherId).get()
      ]);
      
      const tData = targetDoc.data();
      const oData = otherDoc.data();
      
      if (!tData?.fcmToken) return;

      const payload = {
        token: tData.fcmToken,
        notification: {
          title: "¡ES UN MATCH! 🔥🏳️🌈",
          body: `Tú y ${oData?.nick || "alguien"} os habéis gustado. ¡Saluda!`,
        },
        data: {
          type: "match",
          matchId: event.data.id,
          click_action: `https://gay-meet-app-mvp-26.web.app/chat`
        }
      };

      try {
        await admin.messaging().send(payload);
      } catch (e) {
        console.error("Error FCM Match:", e);
      }
    };

    await Promise.all([
      sendToUser(matchData.users[0], matchData.users[1]),
      sendToUser(matchData.users[1], matchData.users[0])
    ]);
    
    return null;
});

/**
 * 9. sendVisitNotification
 */
exports.sendVisitNotification = onDocumentCreated("visits/{visitId}", async (event) => {
    const visitData = event.data?.data();
    if (!visitData) return null;

    const receiverDoc = await db.collection("users").doc(visitData.visitedId).get();
    const receiverData = receiverDoc.data();

    if (!receiverData?.fcmToken) return null;

    const senderDoc = await db.collection("users").doc(visitData.visitorId).get();
    const senderData = senderDoc.data();

    const payload = {
      token: receiverData.fcmToken,
      notification: {
        title: "¡Visita nueva! 👀",
        body: `${senderData?.nick || "Alguien"} ha cotilleado tu perfil.`,
      },
      data: {
        type: "visit",
        visitorId: visitData.visitorId,
        click_action: "https://gay-meet-app-mvp-26.web.app/visits"
      }
    };

    try {
      await admin.messaging().send(payload);
    } catch (error) {
      console.error("Error FCM Visit:", error);
    }
    return null;
});

// Lazy loader para Stripe para evitar crash en healthcheck.
// PARA ACTIVAR LOS PAGOS: define STRIPE_SECRET_KEY y STRIPE_WEBHOOK_SECRET,
// por ejemplo en functions/.env (ver functions/.env.example) o con
// `firebase functions:secrets:set STRIPE_SECRET_KEY`.
let stripeInstance = null;
function getStripe() {
  if (stripeInstance) return stripeInstance;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return null;
  stripeInstance = require("stripe")(stripeKey);
  return stripeInstance;
}

/**
 * 5. createCheckoutSession
 */
exports.createCheckoutSession = onCall(async (request) => {
  const { data, auth } = request;
  if (!auth) throw new HttpsError("unauthenticated", "Login requerido.");

  const stripe = getStripe();
  if (!stripe) throw new HttpsError("failed-precondition", "Stripe no configurado.");

  const { priceId, origin } = data;
  const uid = auth.uid;
  const email = auth.token.email;

  try {
    const subDoc = await db.collection("subscriptions").doc(uid).get();
    let customerId = subDoc.exists ? subDoc.data().stripeCustomerId : null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: email,
        metadata: { firebaseUID: uid }
      });
      customerId = customer.id;
      await db.collection("subscriptions").doc(uid).set({ stripeCustomerId: customerId, status: "incomplete" }, { merge: true });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/premium?success=true`,
      cancel_url: `${origin}/premium?canceled=true`,
      metadata: { firebaseUID: uid }
    });

    return { sessionId: session.id, url: session.url };
  } catch (error) {
    throw new HttpsError("internal", error.message);
  }
});

/**
 * 6. stripeWebhook
 */
exports.stripeWebhook = onRequest(async (req, res) => {
  const stripe = getStripe();
  if (!stripe) return res.status(500).send("Stripe no configurado.");

  const sig = req.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!endpointSecret) return res.status(500).send("Stripe webhook secret no configurado.");

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const session = event.data.object;
  const firebaseUID = session.metadata?.firebaseUID;

  if (event.type === "checkout.session.completed" && firebaseUID) {
    await db.collection("users").doc(firebaseUID).update({ premium: true });
    await db.collection("subscriptions").doc(firebaseUID).update({
      status: "active",
      subscriptionId: session.subscription,
      renewalDate: admin.firestore.FieldValue.serverTimestamp()
    });
  } else if (event.type === "customer.subscription.deleted") {
    const customer = await stripe.customers.retrieve(session.customer);
    const uid = customer.metadata?.firebaseUID;
    if (uid) {
      await db.collection("users").doc(uid).update({ premium: false });
      await db.collection("subscriptions").doc(uid).update({ status: "canceled" });
    }
  }

  res.json({ received: true });
});
