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
    dailyPingsLeft: 3,
    lastPingReset: admin.firestore.FieldValue.serverTimestamp(),
    isVIPNight: false,
    activePlatforms: ['blownights'],
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

    const [receiverDoc, senderDoc, blockDoc] = await Promise.all([
      db.collection("users").doc(receiverId).get(),
      db.collection("users").doc(message.senderId).get(),
      db.collection("users").doc(receiverId).collection("blocks").doc(message.senderId).get()
    ]);

    if (blockDoc.exists) {
      console.log(`Usuario ${message.senderId} bloqueado por ${receiverId}. Saltando notificación.`);
      return null;
    }

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
        click_action: `https://blownights.com/chat/detail?id=${chatId}`
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
        click_action: "https://blownights.com/visits"
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
          title: "¡ES UN MATCH! 🔥",
          body: `Tú y ${oData?.nick || "alguien"} os habéis gustado. ¡Saluda!`,
        },
        data: {
          type: "match",
          matchId: event.data.id,
          click_action: `https://blownights.com/chat`
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
        click_action: "https://blownights.com/visits"
      }
    };

    try {
      await admin.messaging().send(payload);
    } catch (error) {
      console.error("Error FCM Visit:", error);
    }
    return null;
});

// ── Swipe & Vente Aquí: Ping Notification ──
exports.sendPingNotification = onDocumentCreated("pings/{pingId}", async (event) => {
    const pingData = event.data?.data();
    if (!pingData) return null;

    const receiverDoc = await db.collection("users").doc(pingData.toUserId).get();
    const receiverData = receiverDoc.data();
    if (!receiverData?.fcmToken) return null;

    const senderDoc = await db.collection("users").doc(pingData.fromUserId).get();
    const senderData = senderDoc.data();
    
    let notificationTitle = `🔥 ${senderData?.nick || "Alguien"} te ha dado un Toque: ¡Quiere saber de ti esta noche!`;
    let notificationBody = "«¿Qué tal está el ambiente?»";
    
    if (pingData.venueId) {
      const venueDoc = await db.collection("venues").doc(pingData.venueId).get();
      if (venueDoc.exists) {
        const venueName = venueDoc.data().name || "la fiesta";
        notificationTitle = `🔥 ${senderData?.nick || "Alguien"} te ha dado un Toque desde ${venueName}`;
        notificationBody = "«¡Vente que esto está que arde!»";
      }
    }

    // Decrement sender's dailyPingsLeft if not VIP
    if (senderData && !senderData.isVIPNight && senderData.dailyPingsLeft > 0) {
      await db.collection("users").doc(pingData.fromUserId).update({
        dailyPingsLeft: admin.firestore.FieldValue.increment(-1)
      });
    }

    const payload = {
      token: receiverData.fcmToken,
      notification: {
        title: notificationTitle,
        body: notificationBody,
      },
      data: {
        type: "ping",
        fromUserId: pingData.fromUserId,
        venueId: pingData.venueId || "",
        click_action: `https://blownights.com/profile/view?id=${pingData.fromUserId}&pingVenueId=${pingData.venueId || ''}`
      }
    };

    try {
      await admin.messaging().send(payload);
    } catch (error) {
      console.error("Error FCM Ping:", error);
    }
    return null;
});

// ── Nightlife Hub: Checkin cleanup ──

/**
 * cleanupExpiredCheckins — runs daily at 14:00 Europe/Madrid.
 * Deletes all checkins whose expires_at is in the past.
 */
exports.cleanupExpiredCheckins = onSchedule({
  schedule: "0 14 * * *",
  timeZone: "Europe/Madrid",
}, async () => {
  const now = admin.firestore.Timestamp.now();
  const expired = await db.collection("checkins")
    .where("expiresAt", "<", now)
    .get();

  if (expired.empty) return;

  const batchSize = 500;
  let ops = [];
  for (const doc of expired.docs) {
    ops.push(doc.ref.delete());
    if (ops.length >= batchSize) {
      await Promise.all(ops);
      ops = [];
    }
  }
  if (ops.length) await Promise.all(ops);
  console.log(`Cleaned up ${expired.size} expired checkins.`);
});

/**
 * onCheckinCreated — updates the live counter on the venue doc.
 */
exports.onCheckinCreated = onDocumentCreated("checkins/{checkinId}", async (event) => {
  const data = event.data?.data();
  if (!data?.venueId) return null;
  return db.collection("venues").doc(data.venueId).update({
    currentCount: admin.firestore.FieldValue.increment(1),
  });
});

/**
 * purchaseTicket — callable function for buying a ticket via Stripe.
 * Creates a Checkout Session in payment mode (one-time), returns URL.
 */
/**
 * createTicketCheckout
 * Venta de entradas via Stripe Connect (Direct Charges) para salas.
 * El cliente paga: precio entrada + 1.00€ gastos de gestión.
 * La sala recibe el 100% del precio de la entrada.
 * Blow Nights retiene 1.00€ como application_fee.
 * RRPP sin sala usan el sistema de QR dinámicos (créditos prepago), no pasan por aquí.
 */
exports.createTicketCheckout = onCall(async (request) => {
  const { data, auth } = request;
  if (!auth) throw new HttpsError("unauthenticated", "Login requerido.");

  const stripe = getStripe();
  if (!stripe) throw new HttpsError("failed-precondition", "Stripe no configurado.");

  const { venueId, eventId, ticketType, rrppId, origin } = data;
  if (!venueId || !eventId || !ticketType) {
    throw new HttpsError("invalid-argument", "venueId, eventId y ticketType son obligatorios.");
  }

  let reservationId;
  let tierPrice = 0;
  let tierName = "";
  let eventTitle = "";

  await db.runTransaction(async (transaction) => {
    const eventDocTx = await transaction.get(db.collection("venues").doc(venueId).collection("events").doc(eventId));
    if (!eventDocTx.exists) throw new HttpsError("not-found", "Evento no encontrado.");
    const eventData = eventDocTx.data();
    eventTitle = eventData.title;

    const tier = eventData.ticket_tiers?.find(t => t.id === ticketType);
    if (!tier) throw new HttpsError("not-found", "Tipo de entrada no encontrado.");

    tierPrice = tier.price;
    tierName = tier.name;

    const tierSold = tier.sold || 0;
    if (tierSold >= tier.quota) {
      throw new HttpsError("resource-exhausted", "Entradas agotadas para este tramo.");
    }

    const newTiers = eventData.ticket_tiers.map(t => {
      if (t.id === ticketType) return { ...t, sold: (t.sold || 0) + 1 };
      return t;
    });

    transaction.update(eventDocTx.ref, { ticket_tiers: newTiers });

    const resRef = eventDocTx.ref.collection("reservations").doc();
    transaction.set(resRef, {
      userId: auth.uid,
      ticketType,
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 10 * 60 * 1000)),
      status: "pending"
    });
    reservationId = resRef.id;
  });

  const venueDoc = await db.collection("venues").doc(venueId).get();
  const stripeAccountId = venueDoc.data()?.stripeAccountId;
  if (!stripeAccountId) throw new HttpsError("failed-precondition", "El local no tiene Stripe configurado.");

  const ticketPriceCents = Math.round(tierPrice * 100);
  const platformFeeCents = 100; // 1.00€ gastos de gestión

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [{
      price_data: {
        currency: "eur",
        product_data: { name: `${eventTitle} - ${tierName}` },
        unit_amount: ticketPriceCents + platformFeeCents,
      },
      quantity: 1,
    }],
    mode: "payment",
    payment_intent_data: {
      application_fee_amount: platformFeeCents,
      transfer_data: {
        destination: stripeAccountId,
      },
    },
    success_url: `${origin}/wallet?success=true`,
    cancel_url: `${origin}/wallet?canceled=true`,
    metadata: {
      firebaseUID: auth.uid,
      venueId,
      eventId,
      ticketType,
      type: "ticket",
      rrppId: rrppId || "",
      reservationId: reservationId || "",
    },
  });

  return { sessionId: session.id, url: session.url };
});

/**
 * validateTicket — callable function for door staff to scan and validate a QR ticket.
 * Marks the ticket as 'used' atomically.
 */
exports.validateTicket = onCall(async (request) => {
  const { data, auth } = request;
  if (!auth) throw new HttpsError("unauthenticated", "Login requerido.");

  const { qrToken } = data;
  if (!qrToken) throw new HttpsError("invalid-argument", "qrToken es obligatorio.");

  const ticketsSnap = await db.collection("tickets")
    .where("qrToken", "==", qrToken)
    .limit(1)
    .get();

  if (ticketsSnap.empty) {
    throw new HttpsError("not-found", "Entrada no encontrada.");
  }

  const ticketDoc = ticketsSnap.docs[0];
  const ticket = ticketDoc.data();

  const venueDoc = await db.collection("venues").doc(ticket.venueId).get();
  const venue = venueDoc.exists ? venueDoc.data() : null;
  const callerIsAdmin = auth.token.role === 'admin';
  if (!venue || (venue.ownerId !== auth.uid && !callerIsAdmin)) {
    throw new HttpsError("permission-denied", "No tienes permiso para validar entradas de este local.");
  }

  if (ticket.status === "used") {
    return { valid: false, reason: "already_used", message: "Esta entrada ya ha sido utilizada." };
  }
  if (ticket.status === "cancelled") {
    return { valid: false, reason: "cancelled", message: "Esta entrada ha sido cancelada." };
  }

  await ticketDoc.ref.update({
    status: "used",
    usedAt: admin.firestore.FieldValue.serverTimestamp(),
    validatedBy: auth.uid,
  });

  const userDoc = await db.collection("users").doc(ticket.userId).get();
  const userData = userDoc.data();

  return {
    valid: true,
    message: "Entrada válida. Acceso permitido.",
    ticket: {
      id: ticketDoc.id,
      ticketType: ticket.ticketType,
      userName: userData?.nick || "Usuario",
      userPhoto: userData?.fotoUrl || "",
    },
  };
});

/**
 * validateTicketByDoorToken — callable function for door staff to scan and validate a QR ticket without auth.
 */
exports.validateTicketByDoorToken = onCall(async (request) => {
  const { data } = request;
  const { qrToken, doorAccessToken, eventId, venueId } = data;

  if (!qrToken || !doorAccessToken || !eventId || !venueId) {
    throw new HttpsError("invalid-argument", "Missing parameters.");
  }

  const eventSnap = await db.collection("venues").doc(venueId).collection("events").doc(eventId).get();
  if (!eventSnap.exists) throw new HttpsError("not-found", "Evento no encontrado.");
  const event = eventSnap.data();
  if (event.door_access_token !== doorAccessToken) {
    throw new HttpsError("permission-denied", "Token de puerta inválido.");
  }

  const ticketsSnap = await db.collection("tickets").where("qrToken", "==", qrToken).limit(1).get();
  if (ticketsSnap.empty) return { valid: false, message: "ENTRADA NO ENCONTRADA" };

  const ticketDoc = ticketsSnap.docs[0];
  const ticket = ticketDoc.data();

  if (ticket.venueId !== venueId) {
    return { valid: false, message: "PERTENECE A OTRO LOCAL" };
  }

  if (ticket.status === "used") {
    return { valid: false, message: "YA ESCANEADA" };
  }
  if (ticket.status === "cancelled") {
    return { valid: false, message: "ENTRADA CANCELADA" };
  }

  await ticketDoc.ref.update({
    status: "used",
    usedAt: admin.firestore.FieldValue.serverTimestamp(),
    validatedBy: `door_scanner_${eventId}`,
  });

  const tier = event.ticket_tiers?.find(t => t.id === ticket.ticketType || t.name === ticket.ticketType);
  const perks = tier?.perks || "1 Copa General";

  await eventSnap.ref.update({
    "stats.total_checked_in": admin.firestore.FieldValue.increment(1)
  });

  return {
    valid: true,
    message: "ENTREGAR: " + perks,
    ticket: {
      id: ticketDoc.id,
      ticketType: tier?.name || ticket.ticketType,
      userName: ticket.client_name || "Invitado",
      rrppName: ticket.promoter_name || null
    }
  };
});

/**
 * generateDirectPromoterTicket — RRPP pure offline ticketing
 */
exports.generateDirectPromoterTicket = onCall(async (request) => {
  const { data } = request;
  const { promoterToken, eventId, clientName, tierId } = data;

  if (!promoterToken || !eventId) {
    throw new HttpsError('invalid-argument', 'Faltan parámetros requeridos.');
  }

  const promotersQuery = await db.collectionGroup('promoters')
    .where('access_token', '==', promoterToken)
    .where('is_closed', '==', false)
    .limit(1)
    .get();

  if (promotersQuery.empty) {
    throw new HttpsError('permission-denied', 'Token de RRPP inválido o lista cerrada.');
  }

  const promoterDoc = promotersQuery.docs[0];
  const promoter = promoterDoc.data();
  const venueId = promoterDoc.ref.parent.parent.id;

  const eventRef = db.collection('venues').doc(venueId).collection('events').doc(eventId);
  const eventDoc = await eventRef.get();

  if (!eventDoc.exists) {
    throw new HttpsError('not-found', 'Evento no encontrado.');
  }
  const eventData = eventDoc.data();

  const crypto = require("crypto");
  const qrToken = crypto.randomBytes(32).toString("hex");

  const ticketPayload = {
    userId: null,
    venueId: venueId,
    eventId: eventId,
    venueOwnerId: eventData.ownerId || "",
    cityId: eventData.cityId || "",
    ticketType: tierId || 'general',
    client_name: clientName || 'Invitado',
    channel: 'rrpp_direct',
    rrpp_id: promoterDoc.id,
    promoter_name: promoter.name || 'RRPP',
    rrpp_commission: 0,
    qrToken,
    status: 'valid',
    purchasedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const ticketRef = await db.collection("tickets").add(ticketPayload);

  return {
    success: true,
    ticketId: ticketRef.id,
    qrToken: qrToken,
    clientName: ticketPayload.client_name
  };
});

/**
 * closePromoterList — RRPP closes their own list voluntarily
 */
exports.closePromoterList = onCall(async (request) => {
  const { data } = request;
  const { token } = data;

  if (!token) throw new HttpsError('invalid-argument', 'Faltan parámetros requeridos.');

  const promotersQuery = await db.collectionGroup('promoters')
    .where('access_token', '==', token)
    .limit(1)
    .get();

  if (promotersQuery.empty) throw new HttpsError('not-found', 'Token de RRPP inválido.');

  const promoterDoc = promotersQuery.docs[0];
  await promoterDoc.ref.update({
    is_closed: true,
    closed_at: admin.firestore.FieldValue.serverTimestamp()
  });

  return { success: true };
});

/**
 * liquidatePromoter — Allows the RRPP to confirm they received the money
 */
exports.liquidatePromoter = onCall(async (request) => {
  const { data } = request;
  const { token } = data;

  if (!token) {
    throw new HttpsError('invalid-argument', 'Faltan parámetros requeridos.');
  }

  const promotersQuery = await db.collectionGroup('promoters')
    .where('access_token', '==', token)
    .limit(1)
    .get();

  if (promotersQuery.empty) {
    throw new HttpsError('not-found', 'Token de RRPP inválido.');
  }

  const promoterDoc = promotersQuery.docs[0];

  await promoterDoc.ref.update({
    liquidated_by_rrpp: true,
    rrpp_liquidated_at: admin.firestore.FieldValue.serverTimestamp()
  });

  return { success: true };
});

/**
 * sendPromoNotification — when a promotion is created, push to nearby users.
 */
exports.sendPromoNotification = onDocumentCreated("promotions/{promoId}", async (event) => {
  const promo = event.data?.data();
  if (!promo?.venueId) return null;

  const venueDoc = await db.collection("venues").doc(promo.venueId).get();
  if (!venueDoc.exists) return null;
  const venue = venueDoc.data();

  const usersSnap = await db.collection("users")
    .where("fcmToken", "!=", "")
    .get();

  if (usersSnap.empty) return null;

  const radiusKm = promo.radiusKm || 5;
  const tokens = [];

  usersSnap.forEach((doc) => {
    const u = doc.data();
    if (!u.fcmToken || !u.lat || !u.lng) return;
    const dist = haversineKm(venue.location.latitude, venue.location.longitude, u.lat, u.lng);
    if (dist <= radiusKm) {
      tokens.push(u.fcmToken);
    }
  });

  if (!tokens.length) return null;

  const message = {
    notification: {
      title: `🔥 ${venue.name}`,
      body: promo.text,
    },
    data: {
      type: "promo",
      venueId: promo.venueId,
      promoId: event.data.id,
    },
  };

  const batchSize = 500;
  for (let i = 0; i < tokens.length; i += batchSize) {
    const batch = tokens.slice(i, i + batchSize);
    await admin.messaging().sendEachForMulticast({
      tokens: batch,
      ...message,
    });
  }

  console.log(`Promo ${event.data.id} sent to ${tokens.length} users within ${radiusKm}km.`);
  return null;
});

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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
 * createChillPassCheckout — Weekend pass (48h) or VIP subscription for Chills
 */
exports.createChillPassCheckout = onCall(async (request) => {
  const { data, auth } = request;
  if (!auth) throw new HttpsError("unauthenticated", "Login requerido.");

  const stripe = getStripe();
  if (!stripe) throw new HttpsError("failed-precondition", "Stripe no configurado.");

  const { passType, origin, citySlug } = data;
  const uid = auth.uid;
  const email = auth.token.email;

  const subDoc = await db.collection("subscriptions").doc(uid).get();
  let customerId = subDoc.exists ? subDoc.data()?.stripeCustomerId : null;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: email,
      metadata: { firebaseUID: uid },
    });
    customerId = customer.id;
    await db.collection("subscriptions").doc(uid).set(
      { stripeCustomerId: customerId, status: "incomplete" },
      { merge: true }
    );
  }

  try {
    if (passType === "weekend") {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "eur",
            product_data: { name: "Pase Fin de Semana (48h) — Blow Nights" },
            unit_amount: 999,
          },
          quantity: 1,
        }],
        mode: "payment",
        success_url: `${origin}/chills?pass=ok`,
        cancel_url: `${origin}/chills?pass=cancel`,
        metadata: { firebaseUID: uid, type: "chill_pass", duration: "48h", city_slug: citySlug || "" },
      });
      return { sessionId: session.id, url: session.url };
    } else if (passType === "monthly") {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "eur",
            product_data: { name: "Blow VIP Mensual" },
            unit_amount: 1999,
            recurring: { interval: "month" },
          },
          quantity: 1,
        }],
        mode: "subscription",
        success_url: `${origin}/chills?vip=ok`,
        cancel_url: `${origin}/chills?vip=cancel`,
        metadata: { firebaseUID: uid, type: "chill_vip", city_slug: citySlug || "" },
      });
      return { sessionId: session.id, url: session.url };
    } else if (passType === "quarterly") {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "eur",
            product_data: { name: "Blow VIP Trimestral" },
            unit_amount: 4999,
            recurring: { interval: "month", interval_count: 3 },
          },
          quantity: 1,
        }],
        mode: "subscription",
        success_url: `${origin}/chills?vip=ok`,
        cancel_url: `${origin}/chills?vip=cancel`,
        metadata: { firebaseUID: uid, type: "chill_vip", city_slug: citySlug || "" },
      });
      return { sessionId: session.id, url: session.url };
    } else {
      throw new HttpsError("invalid-argument", "passType debe ser weekend, monthly o quarterly.");
    }
  } catch (error) {
    throw new HttpsError("internal", error.message);
  }
});

exports.createPingCheckoutSession = onCall(async (request) => {
  const { data, auth } = request;
  if (!auth) throw new HttpsError("unauthenticated", "Login requerido.");

  const stripe = getStripe();
  if (!stripe) throw new HttpsError("failed-precondition", "Stripe no configurado.");

  const { type, origin } = data; // type: "ping_pack" or "vip_night"
  const uid = auth.uid;
  const email = auth.token.email;

  const subDoc = await db.collection("subscriptions").doc(uid).get();
  let customerId = subDoc.exists ? subDoc.data()?.stripeCustomerId : null;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: email,
      metadata: { firebaseUID: uid },
    });
    customerId = customer.id;
    await db.collection("subscriptions").doc(uid).set(
      { stripeCustomerId: customerId, status: "incomplete" },
      { merge: true }
    );
  }

  try {
    let priceData = {};
    if (type === "ping_pack") {
      priceData = {
        currency: "eur",
        product_data: { name: "Pack 3 Toques Extra" },
        unit_amount: 199,
      };
    } else if (type === "vip_night") {
      priceData = {
        currency: "eur",
        product_data: { name: "Pase Fuego Ilimitado (Esta Noche)" },
        unit_amount: 399,
      };
    } else {
      throw new HttpsError("invalid-argument", "Tipo de pase no válido.");
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card", "apple_pay", "google_pay"],
      line_items: [{
        price_data: priceData,
        quantity: 1,
      }],
      mode: "payment",
      success_url: `${origin}/premium?success=true`,
      cancel_url: `${origin}/premium?canceled=true`,
      metadata: { firebaseUID: uid, type: type, city_slug: citySlug || "" },
    });
    return { sessionId: session.id, url: session.url };
  } catch (error) {
    throw new HttpsError("internal", error.message);
  }
});

exports.createStripeConnectAccount = onCall(async (request) => {
  const { data, auth } = request;
  if (!auth) throw new HttpsError("unauthenticated", "Login requerido.");

  const stripe = getStripe();
  if (!stripe) throw new HttpsError("failed-precondition", "Stripe no configurado.");

  const { venueId, email } = data;
  if (!venueId) throw new HttpsError("invalid-argument", "venueId es requerido.");

  const venueRef = db.collection("venues").doc(venueId);
  const venueSnap = await venueRef.get();
  if (!venueSnap.exists) throw new HttpsError("not-found", "Local no encontrado.");

  try {
    let accountId = venueSnap.data().stripeAccountId;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'ES',
        email: email || auth.token.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      accountId = account.id;
      await venueRef.update({ stripeAccountId: accountId });
    }
    return { accountId };
  } catch (error) {
    throw new HttpsError("internal", error.message);
  }
});

exports.createStripeAccountLink = onCall(async (request) => {
  const { data, auth } = request;
  if (!auth) throw new HttpsError("unauthenticated", "Login requerido.");
  const stripe = getStripe();
  const accountLink = await stripe.accountLinks.create({
    account: data.accountId,
    refresh_url: `${data.origin}/business/stripe?refresh=true`,
    return_url: `${data.origin}/business/stripe?return=true`,
    type: 'account_onboarding',
  });
  return { url: accountLink.url };
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
    const isTicket = session.metadata?.type === "ticket";

    const isChillPass = session.metadata?.type === "chill_pass";
    const isChillVip = session.metadata?.type === "chill_vip";

    if (isChillPass || isChillVip) {
      if (isChillPass) {
        const passExpires = Date.now() + 48 * 60 * 60 * 1000;
        const existingClaims = (await admin.auth().getUser(firebaseUID)).customClaims || {};
        await admin.auth().setCustomUserClaims(firebaseUID, {
          ...existingClaims,
          pass_expires: passExpires,
        });
        await db.collection("users").doc(firebaseUID).update({
          pass_expires: admin.firestore.Timestamp.fromMillis(passExpires),
        });
      } else {
        const existingClaims = (await admin.auth().getUser(firebaseUID)).customClaims || {};
        await admin.auth().setCustomUserClaims(firebaseUID, {
          ...existingClaims,
          premium: true,
        });
        await db.collection("users").doc(firebaseUID).update({ premium: true });
        await db.collection("subscriptions").doc(firebaseUID).update({
          status: "active",
          subscriptionId: session.subscription,
          renewalDate: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // 40% partner transfer
      const citySlug = session.metadata?.city_slug;
      if (citySlug && session.amount_total > 0) {
        try {
          const cityDoc = await db.collection("cities").doc(citySlug).get();
          const partnerStripeId = cityDoc.exists ? cityDoc.data()?.partner_stripe_account_id : null;
          if (partnerStripeId) {
            const partnerCutCents = Math.round(session.amount_total * 0.40);
            await stripe.transfers.create({
              amount: partnerCutCents,
              currency: "eur",
              destination: partnerStripeId,
              description: `40% suscripcion VIP - ${session.customer_email || firebaseUID}`,
              metadata: { city: citySlug, firebaseUID },
            });
          }
        } catch (e) {
          console.error("Error en transfer 40% al socio local:", e);
        }
      }
    } else if (session.metadata?.type === "ping_pack" || session.metadata?.type === "vip_night") {
      const type = session.metadata.type;
      
      if (type === "ping_pack") {
        await db.collection("users").doc(firebaseUID).update({
          dailyPingsLeft: admin.firestore.FieldValue.increment(3)
        });
      } else {
        await db.collection("users").doc(firebaseUID).update({
          isVIPNight: true
        });
      }

      // 40% partner transfer & ledger
      const citySlug = session.metadata?.city_slug;
      if (citySlug && session.amount_total > 0) {
        try {
          const cityDoc = await db.collection("cities").doc(citySlug).get();
          const partnerStripeId = cityDoc.exists ? cityDoc.data()?.partner_stripe_account_id : null;
          if (partnerStripeId) {
            const partnerCutCents = Math.round(session.amount_total * 0.40);
            const amountEur = partnerCutCents / 100;
            
            await stripe.transfers.create({
              amount: partnerCutCents,
              currency: "eur",
              destination: partnerStripeId,
              description: `40% ${type === 'ping_pack' ? 'Pack Toques' : 'Pase Fuego'} - ${firebaseUID}`,
              metadata: { city: citySlug, firebaseUID, type },
            });
            
            // Ledger para el panel del City Manager
            await db.collection("cities").doc(citySlug).collection("earnings").add({
              amount: amountEur,
              type: type === 'ping_pack' ? 'micro_ping' : 'vip_night',
              userId: firebaseUID,
              timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
          }
        } catch (e) {
          console.error("Error en transfer 40% de pings al socio local:", e);
        }
      }
    } else if (isTicket) {
      const crypto = require("crypto");
      const qrToken = crypto.randomBytes(32).toString("hex");
      const pinCode = Math.floor(1000 + Math.random() * 9000).toString(); // 4 dígitos
      const venueId = session.metadata.venueId;
      const eventId = session.metadata.eventId;
      const rrppId = session.metadata.rrppId;
      const reservationId = session.metadata.reservationId;

      const venueDoc = await db.collection("venues").doc(venueId).get();
      const venueOwnerId = venueDoc.exists ? venueDoc.data().ownerId : null;
      const cityId = venueDoc.exists ? venueDoc.data().cityId || "" : "";

      let rrppCommission = 0;
      if (rrppId) {
        const rrppDoc = await db.collection("venues").doc(venueId).collection("promoters").doc(rrppId).get();
        if (rrppDoc.exists && rrppDoc.data().is_active) {
           const rrppData = rrppDoc.data();
           if (rrppData.commission_type === 'fixed') {
             rrppCommission = rrppData.commission_value || 0;
           } else {
             rrppCommission = (session.amount_total / 100) * (rrppData.commission_value / 100);
           }
        }
      }

      await db.collection("tickets").add({
        userId: firebaseUID,
        venueId,
        eventId,
        venueOwnerId: venueOwnerId || "",
        cityId,
        ticketType: session.metadata.ticketType || "general",
        rrpp_id: rrppId || null,
        rrpp_commission: rrppCommission,
        qrToken,
        pinCode,
        status: "valid",
        purchasedAt: admin.firestore.FieldValue.serverTimestamp(),
        stripeSessionId: session.id,
      });

      if (reservationId) {
        await db.collection("venues").doc(venueId).collection("events").doc(eventId).collection("reservations").doc(reservationId).update({
          status: "completed"
        });
      }

      // 40% del fee de gestión (1€) al City Manager = 0.40€ por ticket
      if (cityId) {
        try {
          const cityDoc = await db.collection("cities").doc(cityId).get();
          const cityManagerStripe = cityDoc.exists ? cityDoc.data()?.partner_stripe_account_id : null;
          if (cityManagerStripe) {
            const cityManagerCut = 40; // 0.40€ en céntimos (40% de 1€)
            await stripe.transfers.create({
              amount: cityManagerCut,
              currency: "eur",
              destination: cityManagerStripe,
              description: `40% ticket ${eventId} - ${venueId}`,
              transfer_group: session.id,
            });
            await db.collection("cities").doc(cityId).collection("earnings").add({
              amount: 0.40,
              type: "ticket_fee",
              venueId,
              eventId,
              userId: firebaseUID,
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
        } catch (e) {
          console.error("Error en transfer 40% ticket al City Manager:", e);
        }
      }
    } else {
      await db.collection("users").doc(firebaseUID).update({ premium: true });
      await db.collection("subscriptions").doc(firebaseUID).update({
        status: "active",
        subscriptionId: session.subscription,
        renewalDate: admin.firestore.FieldValue.serverTimestamp()
      });
    }
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

/**
 * 10. assignRole
 * Asigna un rol (custom claim) a un usuario. Solo un admin puede llamar a esta función.
 */
exports.assignRole = onCall(async (request) => {
  const { data, auth } = request;
  if (!auth) throw new HttpsError("unauthenticated", "Login requerido.");

  // Comprobar que el llamador es admin o superadmin
  const callerIsAdmin = auth.token.role === 'admin' || auth.token.role === 'superadmin' || auth.token.email === 'cesar.herrera.rojo@gmail.com';
  if (!callerIsAdmin) {
    throw new HttpsError("permission-denied", "No tienes permisos de administrador.");
  }

  const { uid, role, cityId } = data;
  if (!uid || !role) {
    throw new HttpsError("invalid-argument", "uid y role son obligatorios.");
  }

  try {
    const claims = { role: role };
    if (cityId) claims.cityId = cityId;

    // Asignar el claim en Firebase Auth
    await admin.auth().setCustomUserClaims(uid, claims);

    // Actualizar también el documento del usuario por conveniencia y queries
    await db.collection("users").doc(uid).update({
      role: role,
      ...(cityId ? { cityId } : {})
    });

    return { success: true, message: `Rol ${role} asignado a ${uid}` };
  } catch (error) {
    console.error("Error al asignar rol:", error);
    throw new HttpsError("internal", "Error al asignar el rol.");
  }
});

/**
 * getPromoterStats — Returns safe dashboard data for the RRPP
 */
exports.getPromoterStats = onCall(async (request) => {
  const { data } = request;
  const { token } = data;

  if (!token) throw new HttpsError('invalid-argument', 'Token requerido');

  const promotersQuery = await db.collectionGroup('promoters')
    .where('access_token', '==', token)
    .limit(1)
    .get();

  if (promotersQuery.empty) throw new HttpsError('not-found', 'RRPP no encontrado o inactivo');

  const promoterDoc = promotersQuery.docs[0];
  const promoter = promoterDoc.data();
  const eventId = promoterDoc.ref.parent.parent.id;
  const venueId = promoterDoc.ref.parent.parent.parent.parent.id;

  const ticketsQuery = await db.collection("tickets")
    .where("eventId", "==", eventId)
    .where("rrpp_id", "==", promoterDoc.id)
    .get();

  let totalSold = 0;
  let totalEntered = 0;

  ticketsQuery.forEach(doc => {
    const t = doc.data();
    if (t.status === "valid" || t.status === "used") totalSold++;
    if (t.status === "used") totalEntered++;
  });

  return {
    promoter: {
      id: promoterDoc.id,
      name: promoter.name,
      code: promoter.code,
      venueId,
      eventId,
      is_closed: promoter.is_closed || false,
      liquidated_by_rrpp: promoter.liquidated_by_rrpp || false,
      liquidated_by_venue: promoter.liquidated_by_venue || false,
    },
    stats: {
      totalSold,
      totalCommission: 0,
      totalEntered
    }
  };
});

// ═══════════════════════════════════════════════════════════════
// CHILLS / AFTERS PRIVADOS
// ═══════════════════════════════════════════════════════════════

/**
 * createChill — Host creates a private chill/after
 */
exports.createChill = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError("unauthenticated", "Login requerido.");

  const isPremium = auth.token.premium === true;
  const hasPass = auth.token.pass_expires && auth.token.pass_expires > Date.now();
  if (!isPremium && !hasPass) {
    throw new HttpsError("permission-denied", "Necesitas ser VIP o tener un Pase para crear un chill.");
  }

  const { title, description, exact_address, approx_lat, approx_lng, max_capacity, city_slug, tags } = data;

  if (!title || !exact_address || !approx_lat || !approx_lng || !city_slug) {
    throw new HttpsError("invalid-argument", "Faltan campos obligatorios.");
  }

  const userDoc = await db.collection("users").doc(auth.uid).get();
  if (!userDoc.exists) throw new HttpsError("not-found", "Usuario no encontrado.");
  const user = userDoc.data();

  const capacity = Math.min(Math.max(parseInt(max_capacity) || 10, 2), 50);

  const chillRef = db.collection("chills").doc();
  const now = admin.firestore.FieldValue.serverTimestamp();
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);

  await chillRef.set({
    host_uid: auth.uid,
    host_nick: user.nick || "Anon",
    host_foto: user.fotoUrl || "",
    city_slug,
    title,
    description: description || "",
    approx_lat: parseFloat(approx_lat),
    approx_lng: parseFloat(approx_lng),
    exact_address,
    max_capacity: capacity,
    accepted_users: [],
    pending_users: [],
    denied_users: [],
    status: "active",
    created_at: now,
    expires_at: admin.firestore.Timestamp.fromDate(expiresAt),
    boosted: false,
    tags: tags || [],
  });

  return { success: true, chillId: chillRef.id };
});

/**
 * requestChillAccess — User requests access to a chill (Pedir Pase)
 */
exports.requestChillAccess = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError("unauthenticated", "Login requerido.");

  const { chillId } = data;
  if (!chillId) throw new HttpsError("invalid-argument", "chillId requerido.");

  const chillRef = db.collection("chills").doc(chillId);
  const chillDoc = await chillRef.get();
  if (!chillDoc.exists) throw new HttpsError("not-found", "Chill no encontrado.");
  const chill = chillDoc.data();

  if (chill.status !== "active") throw new HttpsError("failed-precondition", "Este chill ya no acepta solicitudes.");
  if (chill.host_uid === auth.uid) throw new HttpsError("failed-precondition", "Eres el anfitrión de este chill.");
  if (chill.accepted_users.includes(auth.uid)) throw new HttpsError("already-exists", "Ya estás aceptado.");
  if (chill.denied_users.includes(auth.uid)) throw new HttpsError("permission-denied", "Tu solicitud fue denegada.");
  if (chill.pending_users.includes(auth.uid)) throw new HttpsError("already-exists", "Ya tienes una solicitud pendiente.");

  const isPremium = auth.token.premium === true;
  const hasPass = auth.token.pass_expires && auth.token.pass_expires > Date.now();
  if (!isPremium && !hasPass) {
    throw new HttpsError("permission-denied", "Necesitas ser VIP o tener un Pase para solicitar acceso a chills.");
  }

  const userDoc = await db.collection("users").doc(auth.uid).get();
  const user = userDoc.data();

  const requestRef = chillRef.collection("requests").doc(auth.uid);
  await requestRef.set({
    user_uid: auth.uid,
    user_nick: user.nick || "Anon",
    user_foto: user.fotoUrl || "",
    user_edad: user.edad || null,
    user_bio: user.bio || "",
    status: "pending",
    created_at: admin.firestore.FieldValue.serverTimestamp(),
  });

  await chillRef.update({
    pending_users: admin.firestore.FieldValue.arrayUnion(auth.uid),
  });

  // Send push to host
  const hostDoc = await db.collection("users").doc(chill.host_uid).get();
  const hostToken = hostDoc.data()?.fcmToken;
  if (hostToken) {
    try {
      await admin.messaging().send({
        token: hostToken,
        notification: {
          title: "Solicitud de Pase",
          body: `${user.nick || "Alguien"} quiere unirse a tu chill "${chill.title}"`,
        },
        data: { type: "chill_request", chillId },
      });
    } catch (e) {
      console.warn("FCM send failed for chill request:", e.message);
    }
  }

  return { success: true };
});

/**
 * respondChillRequest — Host approves or denies a request
 */
exports.respondChillRequest = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError("unauthenticated", "Login requerido.");

  const { chillId, userId, action } = data;
  if (!chillId || !userId || !["accept", "deny"].includes(action)) {
    throw new HttpsError("invalid-argument", "chillId, userId y action (accept/deny) requeridos.");
  }

  const chillRef = db.collection("chills").doc(chillId);
  const chillDoc = await chillRef.get();
  if (!chillDoc.exists) throw new HttpsError("not-found", "Chill no encontrado.");
  const chill = chillDoc.data();

  if (chill.host_uid !== auth.uid) throw new HttpsError("permission-denied", "Solo el anfitrión puede responder.");

  const requestRef = chillRef.collection("requests").doc(userId);
  const requestDoc = await requestRef.get();
  if (!requestDoc.exists) throw new HttpsError("not-found", "Solicitud no encontrada.");

  if (action === "accept") {
    if (chill.accepted_users.length >= chill.max_capacity) {
      throw new HttpsError("resource-exhausted", "El chill está lleno.");
    }

    await requestRef.update({ status: "accepted" });
    await chillRef.update({
      accepted_users: admin.firestore.FieldValue.arrayUnion(userId),
      pending_users: admin.firestore.FieldValue.arrayRemove(userId),
      status: chill.accepted_users.length + 1 >= chill.max_capacity ? "full" : "active",
    });

    // Notify accepted user
    const userDoc = await db.collection("users").doc(userId).get();
    const userToken = userDoc.data()?.fcmToken;
    if (userToken) {
      try {
        await admin.messaging().send({
          token: userToken,
          notification: {
            title: "Pase Aceptado",
            body: `Te han aceptado en "${chill.title}". Ya puedes ver la dirección.`,
          },
          data: { type: "chill_accepted", chillId },
        });
      } catch (e) {
        console.warn("FCM send failed for chill accept:", e.message);
      }
    }
  } else {
    await requestRef.update({ status: "denied" });
    await chillRef.update({
      denied_users: admin.firestore.FieldValue.arrayUnion(userId),
      pending_users: admin.firestore.FieldValue.arrayRemove(userId),
    });
  }

  return { success: true, action };
});

/**
 * endChill — Host ends their chill early
 */
exports.endChill = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError("unauthenticated", "Login requerido.");

  const { chillId } = data;
  const chillRef = db.collection("chills").doc(chillId);
  const chillDoc = await chillRef.get();
  if (!chillDoc.exists) throw new HttpsError("not-found", "Chill no encontrado.");
  if (chillDoc.data().host_uid !== auth.uid && auth.token.role !== "admin") {
    throw new HttpsError("permission-denied", "Solo el anfitrión puede cerrar.");
  }

  await chillRef.update({ status: "ended" });
  return { success: true };
});

/**
 * cleanupExpiredChills — Scheduled function: deletes expired chills
 */
exports.cleanupExpiredChills = onSchedule("every 30 minutes", async () => {
  const now = admin.firestore.Timestamp.now();
  const expired = await db.collection("chills")
    .where("expires_at", "<=", now)
    .where("status", "in", ["active", "full"])
    .get();

  const batch = db.batch();
  expired.docs.forEach((doc) => {
    batch.update(doc.ref, { status: "ended" });
  });

  if (!expired.empty) {
    await batch.commit();
    console.log(`Marked ${expired.size} expired chills as ended.`);
  }
});

/**
 * checkFranchiseTrigger — Disparador Automático (El Caballo de Troya)
 */
exports.checkFranchiseTrigger = onDocumentWritten("venues/{venueId}", async (event) => {
  const after = event.data.after;
  if (!after.exists) return; // Se borró

  const data = after.data();
  // Solo nos importa si está activo y tiene ciudad
  if (!data.isActive || !data.cityId) return;

  const cityId = data.cityId;
  
  // 1. Contar cuántos locales activos hay en esa ciudad
  const venuesSnap = await db.collection("venues")
    .where("cityId", "==", cityId)
    .where("isActive", "==", true)
    .count()
    .get();
  
  const activeCount = venuesSnap.data().count;

  if (activeCount >= 2) {
    // 2. Comprobar si la ciudad tiene City Manager asignado
    const cityRef = db.collection("cities").doc(cityId);
    const citySnap = await cityRef.get();
    
    let hasManager = false;
    if (citySnap.exists) {
      const cData = citySnap.data();
      if (cData.partnerId || cData.managerId) {
        hasManager = true;
      }
    }

    if (!hasManager) {
      // 3. Activar el flag de "readyForFranchise"
      await cityRef.set({
        readyForFranchise: true,
        activeVenuesCount: activeCount,
        slug: cityId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      console.log(`Franchise trigger activated for ${cityId} with ${activeCount} venues!`);
    } else if (citySnap.exists) {
       // Actualizar conteo si ya hay manager pero queremos tener la métrica
       await cityRef.update({
         activeVenuesCount: activeCount,
         readyForFranchise: false,
         updatedAt: admin.firestore.FieldValue.serverTimestamp()
       });
    }
  }
});

