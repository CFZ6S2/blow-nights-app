const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { admin, db, getStripe } = require("../lib/init");

exports.createTicketCheckout = onCall({ enforceAppCheck: true }, async (request) => {
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
  const platformFeeCents = 100;

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

exports.validateTicket = onCall({ enforceAppCheck: true }, async (request) => {
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

exports.validateTicketByDoorToken = onCall({ enforceAppCheck: true }, async (request) => {
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

  const result = await db.runTransaction(async (transaction) => {
    const freshDoc = await transaction.get(ticketDoc.ref);
    const freshTicket = freshDoc.data();

    if (freshTicket.status === "used") {
      return { valid: false, message: "YA ESCANEADA" };
    }
    if (freshTicket.status === "cancelled") {
      return { valid: false, message: "ENTRADA CANCELADA" };
    }

    transaction.update(ticketDoc.ref, {
      status: "used",
      usedAt: admin.firestore.FieldValue.serverTimestamp(),
      validatedBy: `door_scanner_${eventId}`,
    });

    return { valid: true };
  });

  if (!result.valid) return result;

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

exports.generateDirectPromoterTicket = onCall({ enforceAppCheck: true }, async (request) => {
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

  const maxTickets = promoter.max_tickets || 200;
  const issuedSnap = await db.collection("tickets")
    .where("rrpp_id", "==", promoterDoc.id)
    .where("eventId", "==", eventId)
    .where("channel", "==", "rrpp_direct")
    .count().get();
  if (issuedSnap.data().count >= maxTickets) {
    throw new HttpsError('resource-exhausted', `Límite de ${maxTickets} entradas alcanzado.`);
  }

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

exports.closePromoterList = onCall({ enforceAppCheck: true }, async (request) => {
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

exports.liquidatePromoter = onCall({ enforceAppCheck: true }, async (request) => {
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

exports.getPromoterStats = onCall({ enforceAppCheck: true }, async (request) => {
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
