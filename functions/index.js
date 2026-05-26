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

const stripe = require("stripe")(functions.config().stripe.secret_key);

/**
 * 5. createCheckoutSession
 * Trigger: Callable Function (onCall).
 * Acción: Crea sesión de Stripe Checkout para suscripción Premium.
 */
exports.createCheckoutSession = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Debes estar logueado.");
  }

  const { priceId } = data;
  const uid = context.auth.uid;
  const email = context.auth.token.email;

  try {
    // 1. Obtener o crear el cliente de Stripe
    const subDoc = await db.collection("subscriptions").doc(uid).get();
    let customerId = subDoc.exists ? subDoc.data().stripeCustomerId : null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: email,
        metadata: { firebaseUID: uid }
      });
      customerId = customer.id;
      await db.collection("subscriptions").doc(uid).set({
        stripeCustomerId: customerId,
        status: "incomplete"
      }, { merge: true });
    }

    // 2. Crear la sesión de Checkout
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${data.origin}/premium?success=true`,
      cancel_url: `${data.origin}/premium?canceled=true`,
      metadata: { firebaseUID: uid }
    });

    return { sessionId: session.id, url: session.url };
  } catch (error) {
    console.error("Stripe Error:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * 6. stripeWebhook
 * Trigger: HTTP.
 * Acción: Procesa eventos de Stripe (pago éxito, suscripción borrada, etc).
 */
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const endpointSecret = functions.config().stripe.webhook_secret;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
  } catch (err) {
    console.error("Webhook Error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const session = event.data.object;
  const firebaseUID = session.metadata ? session.metadata.firebaseUID : null;

  switch (event.type) {
    case "checkout.session.completed":
      if (firebaseUID) {
        await db.collection("users").doc(firebaseUID).update({ premium: true });
        await db.collection("subscriptions").doc(firebaseUID).update({
          status: "active",
          subscriptionId: session.subscription,
          renewalDate: admin.firestore.FieldValue.serverTimestamp() // Stripe enviará la fecha real en otros eventos
        });
      }
      break;
    case "customer.subscription.deleted":
      const customer = await stripe.customers.retrieve(session.customer);
      const uid = customer.metadata.firebaseUID;
      if (uid) {
        await db.collection("users").doc(uid).update({ premium: false });
        await db.collection("subscriptions").doc(uid).update({ status: "canceled" });
      }
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});
