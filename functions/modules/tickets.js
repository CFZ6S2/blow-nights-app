const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { admin, db, getStripe } = require("../lib/init");
const { startTimer } = require("../lib/perf");

exports.createTicketCheckout = onCall({ enforceAppCheck: false, secrets: ["STRIPE_SECRET_KEY"] }, async (request) => {
  const timer = startTimer("createTicketCheckout");
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
  const venueData = venueDoc.data();
  if (venueData?.subscriptionTier !== "ticketing") {
    throw new HttpsError("failed-precondition", "El local necesita el plan Ticketing para vender entradas.");
  }
  const stripeAccountId = venueData?.stripeAccountId;
  if (!stripeAccountId) throw new HttpsError("failed-precondition", "El local no tiene Stripe configurado.");

  const ticketPriceCents = Math.round(tierPrice * 100);
  const platformFeeCents = 100;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [{
      price_data: {
        currency: "eur",
        product_data: { name: `${eventTitle} - ${tierName}` },
        unit_amount: ticketPriceCents,
      },
      quantity: 1,
    }],
    mode: "payment",
    payment_intent_data: {
      application_fee_amount: platformFeeCents,
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
      platform: origin?.includes('darknights') ? 'darknights' : (data.platform || 'blownights'),
    },
  }, { stripeAccount: stripeAccountId });

  timer.stop({ venueId, eventId, ticketType });
  return { sessionId: session.id, url: session.url };
});

exports.purchaseVenueTicket = onCall({ enforceAppCheck: false, secrets: ["STRIPE_SECRET_KEY"] }, async (request) => {
  const { data, auth } = request;
  if (!auth) throw new HttpsError("unauthenticated", "Login requerido.");

  const stripe = getStripe();
  if (!stripe) throw new HttpsError("failed-precondition", "Stripe no configurado.");

  const { venueId, ticketType, origin } = data;
  if (!venueId || !ticketType) {
    throw new HttpsError("invalid-argument", "venueId y ticketType son obligatorios.");
  }

  const venueDoc = await db.collection("venues").doc(venueId).get();
  if (!venueDoc.exists) throw new HttpsError("not-found", "Local no encontrado.");
  const venueData = venueDoc.data();

  const pricing = venueData.ticketPricing?.[ticketType];
  if (!pricing) throw new HttpsError("not-found", "Tipo de entrada no encontrado.");

  const stripeAccountId = venueData.stripeAccountId;
  if (!stripeAccountId) throw new HttpsError("failed-precondition", "El local no tiene Stripe configurado.");

  const ticketPriceCents = pricing.amount || 0;
  const platformFeeCents = 100;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [{
      price_data: {
        currency: "eur",
        product_data: { name: `${venueData.name} - ${pricing.name || ticketType}` },
        unit_amount: ticketPriceCents,
      },
      quantity: 1,
    }],
    mode: "payment",
    payment_intent_data: {
      application_fee_amount: platformFeeCents,
    },
    success_url: `${origin}/wallet?success=true`,
    cancel_url: `${origin}/wallet?canceled=true`,
    metadata: {
      firebaseUID: auth.uid,
      giftUserId: data.giftUserId || null,
      venueId,
      ticketType,
      type: "ticket",
      platform: origin?.includes('darknights') ? 'darknights' : (data.platform || 'blownights'),
    },
  }, { stripeAccount: stripeAccountId });

  return { sessionId: session.id, url: session.url };
});

exports.purchasePublicVenueTicket = onCall({ enforceAppCheck: false, secrets: ["STRIPE_SECRET_KEY"] }, async (request) => {
  const { data } = request;
  
  const stripe = getStripe();
  if (!stripe) throw new HttpsError("failed-precondition", "Stripe no configurado.");

  const { venueId, ticketType, origin } = data;
  if (!venueId || !ticketType) {
    throw new HttpsError("invalid-argument", "venueId y ticketType son obligatorios.");
  }

  const venueDoc = await db.collection("venues").doc(venueId).get();
  if (!venueDoc.exists) throw new HttpsError("not-found", "Local no encontrado.");
  const venueData = venueDoc.data();

  const pricing = venueData.ticketPricing?.[ticketType];
  if (!pricing) throw new HttpsError("not-found", "Tipo de entrada no encontrado.");

  const stripeAccountId = venueData.stripeAccountId;
  if (!stripeAccountId) throw new HttpsError("failed-precondition", "El local no tiene Stripe configurado.");

  const ticketPriceCents = pricing.amount || 0;
  const platformFeeCents = 100;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    customer_creation: 'always',
    line_items: [{
      price_data: {
        currency: "eur",
        product_data: { name: `${venueData.name} - ${pricing.name || ticketType}` },
        unit_amount: ticketPriceCents,
      },
      quantity: 1,
    }],
    mode: "payment",
    payment_intent_data: {
      application_fee_amount: platformFeeCents,
    },
    success_url: `${origin}/entradas?success=true`,
    cancel_url: `${origin}/${venueData.slug || venueId}/entradas?canceled=true`,
    metadata: {
      venueId,
      ticketType,
      giftUserId: data.giftUserId || null,
      type: "public_ticket",
      platform: origin?.includes('darknights') ? 'darknights' : (data.platform || 'blownights'),
    },
  }, { stripeAccount: stripeAccountId });

  return { sessionId: session.id, url: session.url };
});

exports.purchaseIndependentEventTicket = onCall({ enforceAppCheck: false, secrets: ["STRIPE_SECRET_KEY"] }, async (request) => {
  const { data, auth } = request;
  if (!auth) throw new HttpsError("unauthenticated", "Login requerido.");

  const stripe = getStripe();
  if (!stripe) throw new HttpsError("failed-precondition", "Stripe no configurado.");

  const { eventId, ticketType, origin } = data;
  if (!eventId || !ticketType) {
    throw new HttpsError("invalid-argument", "eventId y ticketType son obligatorios.");
  }

  let tierPrice = 0;
  let tierName = "";
  let eventTitle = "";
  let stripeAccountId = null;
  let organizerId = null;

  await db.runTransaction(async (transaction) => {
    const eventDocTx = await transaction.get(db.collection("events").doc(eventId));
    if (!eventDocTx.exists) throw new HttpsError("not-found", "Evento no encontrado.");
    const eventData = eventDocTx.data();
    eventTitle = eventData.title;
    organizerId = eventData.organizerId;

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
  });

  const organizerDoc = await db.collection("users").doc(organizerId).get();
  stripeAccountId = organizerDoc.data()?.stripeAccountId;
  
  if (!stripeAccountId) {
    throw new HttpsError("failed-precondition", "El organizador no tiene Stripe configurado.");
  }

  const ticketPriceCents = Math.round(tierPrice * 100);
  const platformFeeCents = 100;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [{
      price_data: {
        currency: "eur",
        product_data: { name: `${eventTitle} - ${tierName}` },
        unit_amount: ticketPriceCents,
      },
      quantity: 1,
    }],
    mode: "payment",
    payment_intent_data: {
      application_fee_amount: platformFeeCents,
    },
    success_url: `${origin}/wallet?success=true`,
    cancel_url: `${origin}/wallet?canceled=true`,
    metadata: {
      firebaseUID: auth.uid,
      eventId,
      venueId: eventId,
      ticketType,
      type: "ticket",
      isIndependent: "true",
      platform: origin?.includes('darknights') ? 'darknights' : (data.platform || 'blownights'),
    },
  }, { stripeAccount: stripeAccountId });

  return { sessionId: session.id, url: session.url };
});

exports.validateTicket = onCall({ enforceAppCheck: false }, async (request) => {
  const timer = startTimer("validateTicket");
  const { data, auth } = request;
  if (!auth) throw new HttpsError("unauthenticated", "Login requerido.");

  const { qrToken } = data;
  if (!qrToken) throw new HttpsError("invalid-argument", "qrToken es obligatorio.");

  let searchToken = qrToken;
  let isDynamic = false;
  let ticketId = null;
  let timestamp = null;
  let signature = null;

  if (qrToken.startsWith("dyn:")) {
    const parts = qrToken.split(":");
    if (parts.length === 4) {
      isDynamic = true;
      ticketId = parts[1];
      timestamp = parseInt(parts[2], 10);
      signature = parts[3];
      searchToken = null;
    }
  }

  let ticketDoc;
  let ticket;

  if (isDynamic) {
    ticketDoc = await db.collection("tickets").doc(ticketId).get();
    if (!ticketDoc.exists) throw new HttpsError("not-found", "Entrada no encontrada.");
    ticket = ticketDoc.data();

    const now = Date.now();
    if (now - timestamp > 60000 || timestamp > now + 5000) {
      throw new HttpsError("failed-precondition", "El código QR ha caducado. Pide al cliente que enseñe el código actual.");
    }

    const privateDoc = await ticketDoc.ref.collection("private").doc("secrets").get();
    if (!privateDoc.exists) throw new HttpsError("failed-precondition", "Esta entrada no tiene secretos configurados.");
    const secretKey = privateDoc.data().secretKey;

    const crypto = require("crypto");
    if (!secretKey) throw new HttpsError("failed-precondition", "Esta entrada no soporta QR dinámico.");
    
    const expectedSignature = crypto.createHmac("sha256", secretKey)
      .update(`${ticketId}:${timestamp}`)
      .digest("hex");
      
    if (signature !== expectedSignature) {
      throw new HttpsError("invalid-argument", "Firma del QR inválida. Posible captura de pantalla falsa.");
    }
  } else {
    const secretsSnap = await db.collectionGroup("private")
      .where("qrToken", "==", searchToken)
      .limit(1)
      .get();

    if (secretsSnap.empty) {
      throw new HttpsError("not-found", "Entrada no encontrada.");
    }
    const secretDoc = secretsSnap.docs[0];
    ticketDoc = await secretDoc.ref.parent.parent.get();
    ticket = ticketDoc.data();
  }

  const venueDoc = await db.collection("venues").doc(ticket.venueId).get();
  const venue = venueDoc.exists ? venueDoc.data() : null;
  const callerIsAdmin = auth.token.role === 'admin' || auth.token.role === 'superadmin';
  if (!venue || (venue.ownerId !== auth.uid && !callerIsAdmin)) {
    throw new HttpsError("permission-denied", "No tienes permiso para validar entradas de este local.");
  }

  const result = await db.runTransaction(async (transaction) => {
    const freshDoc = await transaction.get(ticketDoc.ref);
    const freshTicket = freshDoc.data();

    if (freshTicket.status === "used") {
      return { valid: false, reason: "already_used", message: "Esta entrada ya ha sido utilizada." };
    }
    if (freshTicket.status === "cancelled") {
      return { valid: false, reason: "cancelled", message: "Esta entrada ha sido cancelada." };
    }

    transaction.update(ticketDoc.ref, {
      status: "used",
      usedAt: admin.firestore.FieldValue.serverTimestamp(),
      validatedBy: auth.uid,
    });

    return { valid: true, ticketId: ticketDoc.id, ticketType: freshTicket.ticketType, userId: freshTicket.userId };
  });

  if (!result.valid) return result;

  const userDoc = await db.collection("users").doc(result.userId).get();
  const userData = userDoc.data();

  timer.stop({ valid: true });
  return {
    valid: true,
    message: "Entrada válida. Acceso permitido.",
    ticket: {
      id: result.ticketId,
      ticketType: result.ticketType,
      userName: userData?.nick || "Usuario",
      userPhoto: userData?.fotoUrl || "",
    },
  };
});

exports.validateTicketByDoorToken = onCall({ enforceAppCheck: false }, async (request) => {
  const { data } = request;
  const { qrToken, doorAccessToken, eventId, venueId } = data;

  if (!qrToken || !doorAccessToken || !eventId || !venueId) {
    throw new HttpsError("invalid-argument", "Missing parameters.");
  }

  let eventSnap;
  if (venueId === eventId) {
    eventSnap = await db.collection("events").doc(eventId).get();
  } else {
    eventSnap = await db.collection("venues").doc(venueId).collection("events").doc(eventId).get();
  }
  
  if (!eventSnap.exists) throw new HttpsError("not-found", "Evento no encontrado.");
  const event = eventSnap.data();
  const tokenInDb = event.scanner_token || event.door_access_token;
  if (tokenInDb !== doorAccessToken) {
    throw new HttpsError("permission-denied", "Token de puerta inválido.");
  }

  const secretsSnap = await db.collectionGroup("private").where("qrToken", "==", qrToken).limit(1).get();
  if (secretsSnap.empty) return { valid: false, message: "ENTRADA NO ENCONTRADA" };

  const secretDoc = secretsSnap.docs[0];
  const ticketDoc = await secretDoc.ref.parent.parent.get();
  const ticket = ticketDoc.data();

  if (ticket.venueId !== venueId) {
    return { valid: false, message: "PERTENECE A OTRO LOCAL" };
  }
  if (ticket.eventId !== eventId) {
    return { valid: false, message: "PERTENECE A OTRO EVENTO" };
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

exports.generateDirectPromoterTicket = onCall({ enforceAppCheck: false }, async (request) => {
  const timer = startTimer("generateDirectPromoterTicket");
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
  const pathParts = promoterDoc.ref.path.split('/');
  
  let venueId, eventIdActual;
  let isIndependent = false;

  if (pathParts.length >= 6 && pathParts[0] === 'venues') {
    venueId = pathParts[1];
    eventIdActual = pathParts[3];
  } else if (pathParts.length >= 4 && pathParts[0] === 'events') {
    eventIdActual = pathParts[1];
    venueId = eventIdActual; // Fallback
    isIndependent = true;
  } else {
    throw new HttpsError('internal', 'Ruta de promotor no reconocida');
  }

  if (eventIdActual !== eventId) {
    throw new HttpsError('invalid-argument', 'El evento no coincide con el promotor');
  }

  const maxTickets = promoter.max_tickets || 200;

  const issuedSnap = await db.collection("tickets")
    .where("rrpp_id", "==", promoterDoc.id)
    .where("eventId", "==", eventId)
    .where("channel", "==", "rrpp_direct")
    .count().get();
  if (issuedSnap.data().count >= maxTickets) {
    throw new HttpsError('resource-exhausted', `Límite de ${maxTickets} entradas alcanzado.`);
  }

  let eventRef;
  if (isIndependent) {
    eventRef = db.collection('events').doc(eventId);
  } else {
    eventRef = db.collection('venues').doc(venueId).collection('events').doc(eventId);
  }
  const eventDoc = await eventRef.get();

  if (!eventDoc.exists) {
    throw new HttpsError('not-found', 'Evento no encontrado.');
  }
  const eventData = eventDoc.data();
  
  let venueName = venueId;
  if (isIndependent) {
    venueName = 'Evento Independiente';
  } else {
    const venueDoc = await db.collection('venues').doc(venueId).get();
    if (venueDoc.exists) venueName = venueDoc.data().name;
  }

  const crypto = require("crypto");
  const qrToken = crypto.randomBytes(32).toString("hex");
  const secretKey = crypto.randomBytes(16).toString("hex");
  const pinCode = Math.floor(1000 + Math.random() * 9000).toString();

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
    secretKey,
    pinCode,
    flyerUrl: eventData.flyerUrl || null,
    eventTitle: eventData.title || eventData.name || 'Evento RRPP',
    venueName: venueName,
    eventDate: eventData.date || null,
    eventTime: eventData.time || null,
    tierName: tierId || 'Entrada General',
    status: 'valid',
    purchasedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const ticketRef = db.collection("tickets").doc();
  const quotaRef = promoter.userId ? db.collection("users").doc(promoter.userId) : promoterDoc.ref;

  await db.runTransaction(async (tx) => {
    const quotaDoc = await tx.get(quotaRef);
    if (!quotaDoc.exists) {
      throw new HttpsError('not-found', 'Usuario o RRPP no encontrado para verificar cuota.');
    }
    const currentQuota = quotaDoc.data().qr_quota || 0;
    if (currentQuota <= 0) {
      throw new HttpsError('resource-exhausted', 'Saldo de QRs agotado. Por favor recarga tu saldo.');
    }

    tx.update(quotaRef, { qr_quota: currentQuota - 1 });
    const { qrToken, secretKey, ...publicPayload } = ticketPayload;
    tx.set(ticketRef, publicPayload);
    const privateRef = ticketRef.collection("private").doc("secrets");
    tx.set(privateRef, { qrToken, secretKey });
  });

  timer.stop({ eventId });
  return {
    success: true,
    ticketId: ticketRef.id,
    qrToken: qrToken,
    clientName: ticketPayload.client_name
  };
});

exports.closePromoterList = onCall({ enforceAppCheck: false }, async (request) => {
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

exports.liquidatePromoter = onCall({ enforceAppCheck: false }, async (request) => {
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

exports.getPromoterStats = onCall({ enforceAppCheck: false }, async (request) => {
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
  const pathParts = promoterDoc.ref.path.split('/');
  
  let eventId, venueId;
  let isIndependent = false;

  if (pathParts.length >= 6 && pathParts[0] === 'venues') {
    venueId = pathParts[1];
    eventId = pathParts[3];
  } else if (pathParts.length >= 4 && pathParts[0] === 'events') {
    eventId = pathParts[1];
    venueId = eventId; // Fallback
    isIndependent = true;
  } else {
    throw new HttpsError('internal', 'Ruta de promotor no reconocida');
  }

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

  let userQuota = 0;
  if (promoter.userId) {
    const userDoc = await db.collection("users").doc(promoter.userId).get();
    if (userDoc.exists) userQuota = userDoc.data().qr_quota || 0;
  } else {
    userQuota = promoter.qr_quota || 0;
  }

  let eventData = {};
  let venueData = {};

  if (isIndependent) {
    const eventDoc = await db.collection("events").doc(eventId).get();
    if (eventDoc.exists) eventData = eventDoc.data();
    venueData = { name: "Evento Independiente" };
  } else {
    const eventDoc = await db.collection(`venues/${venueId}/events`).doc(eventId).get();
    if (eventDoc.exists) eventData = eventDoc.data();
    const venueDoc = await db.collection("venues").doc(venueId).get();
    if (venueDoc.exists) venueData = venueDoc.data();
  }

  return {
    promoter: {
      id: promoterDoc.id,
      name: promoter.name,
      code: promoter.code,
      venueId,
      eventId,
      is_closed: promoter.is_closed || false,
      qr_quota: userQuota,
      liquidated_by_rrpp: promoter.liquidated_by_rrpp || false,
      liquidated_by_venue: promoter.liquidated_by_venue || false,
    },
    event: {
      title: eventData.title || '',
      date: eventData.date || '',
      time: eventData.time || null,
      ticketType: eventData.ticketType || 'general',
    },
    venue: {
      name: venueData.name || '',
    },
    stats: {
      totalSold,
      totalCommission: 0,
      totalEntered
    }
  };
});

exports.generateOrganizerQRTicket = onCall({ enforceAppCheck: false }, async (request) => {
  const timer = startTimer("generateOrganizerQRTicket");
  const { data, auth } = request;
  if (!auth) throw new HttpsError('unauthenticated', 'Login requerido.');

  const { eventId, clientName, tierId } = data;
  if (!eventId) throw new HttpsError('invalid-argument', 'Falta el eventId.');

  const organizerId = auth.uid;

  const eventDoc = await db.collection('events').doc(eventId).get();
  if (!eventDoc.exists) throw new HttpsError('not-found', 'Evento no encontrado.');
  
  const eventData = eventDoc.data();
  if (eventData.organizerId !== organizerId) {
     throw new HttpsError('permission-denied', 'No eres el organizador de este evento.');
  }

  const crypto = require('crypto');
  const qrToken = crypto.randomBytes(32).toString('hex');
  const secretKey = crypto.randomBytes(16).toString('hex');
  const pinCode = Math.floor(1000 + Math.random() * 9000).toString();

  const ticketPayload = {
    userId: null,
    venueId: eventId, // Para eventos independientes usamos eventId como venueId
    eventId: eventId,
    venueOwnerId: organizerId,
    cityId: eventData.cityId || '',
    ticketType: tierId || 'general',
    client_name: clientName || 'Invitado',
    channel: 'organizer_direct',
    rrpp_commission: 0,
    qrToken,
    secretKey,
    pinCode,
    flyerUrl: eventData.flyerUrl || null,
    eventTitle: eventData.title || eventData.name || 'Evento',
    venueName: 'Evento Independiente',
    eventDate: eventData.date || null,
    eventTime: eventData.time || null,
    tierName: tierId || 'Entrada General',
    status: 'valid',
    isIndependent: true,
    purchasedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const ticketRef = db.collection('tickets').doc();
  const quotaRef = db.collection('users').doc(organizerId);

  await db.runTransaction(async (tx) => {
    const quotaDoc = await tx.get(quotaRef);
    if (!quotaDoc.exists) {
      throw new HttpsError('not-found', 'Organizador no encontrado.');
    }
    const currentQuota = quotaDoc.data().qr_quota || 0;
    if (currentQuota <= 0) {
      throw new HttpsError('resource-exhausted', 'Saldo de QRs agotado. Por favor recarga tu saldo.');
    }

    tx.update(quotaRef, { qr_quota: currentQuota - 1 });
    const { qrToken, secretKey, ...publicPayload } = ticketPayload;
    tx.set(ticketRef, publicPayload);
    const privateRef = ticketRef.collection("private").doc("secrets");
    tx.set(privateRef, { qrToken, secretKey });
  });

  timer.stop({ eventId });
  return {
    success: true,
    ticketId: ticketRef.id,
    qrToken: qrToken,
    clientName: ticketPayload.client_name
  };
});
