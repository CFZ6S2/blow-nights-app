const { onCall, HttpsError, onRequest } = require("firebase-functions/v2/https");
const { admin, db, getStripe } = require("../lib/init");

async function territorialSplit(stripe, db, { amountCents, cityId, sourceType, relatedId, currency = 'eur', splitId = null, platform = 'blownights' }) {
  if (platform === 'darknights') {
    console.log(`Skipping territorial split for DarkNights (splitId: ${splitId}) - 100% retained by platform`);
    return;
  }
  if (!cityId || amountCents <= 0) return;
  try {
    const cityDoc = await db.collection('cities').doc(cityId).get();
    if (!cityDoc.exists) return;
    const cityData = cityDoc.data();
    const partnerStripeId = cityData.partner_stripe_account_id || null;
    const ambassadorId = cityData.ambassadorId || null;

    let ambassadorStripe = null;
    if (ambassadorId) {
      const ambassadorDoc = await db.collection('users').doc(ambassadorId).get();
      ambassadorStripe = ambassadorDoc.exists ? ambassadorDoc.data()?.stripeAccountId : null;
    }

    let poolCents = amountCents;
    const ambassadorCents = Math.round(amountCents * 0.25);
    let ambassadorPaid = false;

    const finalSplitId = splitId || db.collection('territorial_splits').doc().id;
    const ledgerRef = db.collection('territorial_splits').doc(finalSplitId);

    const isProcessed = await db.runTransaction(async (t) => {
      const doc = await t.get(ledgerRef);
      if (doc.exists) {
        const docData = doc.data();
        if (docData.status === 'processing') {
          const now = Date.now();
          const startedAt = docData.timestamp ? docData.timestamp.toMillis() : now;
          if (now - startedAt > 5 * 60 * 1000) { // 5 minutes timeout
            t.update(ledgerRef, { timestamp: admin.firestore.FieldValue.serverTimestamp() });
            return false;
          }
        }
        return true;
      }
      t.set(ledgerRef, { status: 'processing', timestamp: admin.firestore.FieldValue.serverTimestamp() });
      return false;
    });

    if (isProcessed) {
      console.log('Split already processed:', finalSplitId);
      return;
    }

    const ledgerData = {
      splitId: finalSplitId,
      amountCents,
      cityId,
      sourceType,
      relatedId: relatedId || null,
      currency,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      payouts: []
    };

    if (ambassadorId) {
      const payoutInfo = { role: 'ambassador', userId: ambassadorId, amountCents: ambassadorCents };
      if (ambassadorStripe) {
        try {
          await stripe.transfers.create({
            amount: ambassadorCents,
            currency,
            destination: ambassadorStripe,
            description: `Ambassador 25% ${sourceType} ${relatedId || ''}`,
            transfer_group: finalSplitId,
          });
          payoutInfo.status = 'paid';
          ambassadorPaid = true;
        } catch (err) {
          console.error('Error transfer Ambassador:', err);
          payoutInfo.status = 'failed';
          payoutInfo.error = err.message;
        }
      } else {
        payoutInfo.status = 'pending_payout';
        payoutInfo.error = 'No Stripe connected';
      }
      ledgerData.payouts.push(payoutInfo);
      poolCents -= ambassadorCents;
    }

    let cityManagerCents = 0;
    if (partnerStripeId) {
      cityManagerCents = Math.ceil(poolCents / 2);
       const payoutInfo = { role: 'city_manager', amountCents: cityManagerCents };
       try {
          await stripe.transfers.create({
            amount: cityManagerCents,
            currency,
            destination: partnerStripeId,
            description: `CityManager ${sourceType} ${relatedId || ''}`,
            transfer_group: finalSplitId,
          });
          payoutInfo.status = 'paid';
       } catch (err) {
          console.error('Error transfer City Manager:', err);
          payoutInfo.status = 'failed';
          payoutInfo.error = err.message;
       }
       ledgerData.payouts.push(payoutInfo);
    }

    const centralCents = amountCents - (ambassadorId ? ambassadorCents : 0) - cityManagerCents;
    ledgerData.payouts.push({ role: 'central', amountCents: centralCents, status: 'retained' });
    
    const failedPayouts = ledgerData.payouts.filter(p => p.status === 'failed').length;
    const pendingPayouts = ledgerData.payouts.filter(p => p.status === 'pending_payout').length;
    const paidPayouts = ledgerData.payouts.filter(p => p.status === 'paid' || p.status === 'retained').length;

    if (failedPayouts > 0) {
      ledgerData.status = paidPayouts > 0 ? 'partial' : 'failed';
    } else if (pendingPayouts > 0) {
      ledgerData.status = paidPayouts > 0 ? 'partial' : 'pending';
    } else {
      ledgerData.status = 'completed';
    }

    await ledgerRef.update(ledgerData);
  } catch(e) {
    console.error('Error en territorialSplit', e);
  }
}

exports.createCheckoutSession = onCall({ secrets: ["STRIPE_SECRET_KEY"] }, async (request) => {
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

    const platform = origin?.includes('darknights') ? 'darknights' : (data.platform || 'blownights');
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/premium?success=true`,
      cancel_url: `${origin}/premium?canceled=true`,
      metadata: { firebaseUID: uid, platform }
    });

    return { sessionId: session.id, url: session.url };
  } catch (error) {
    throw new HttpsError("internal", error.message);
  }
});

exports.createVenueSubscriptionCheckout = onCall({ secrets: ["STRIPE_SECRET_KEY"] }, async (request) => {
  const { data, auth } = request;
  if (!auth) throw new HttpsError("unauthenticated", "Login requerido.");

  const stripe = getStripe();
  if (!stripe) throw new HttpsError("failed-precondition", "Stripe no configurado.");

  const { venueId, tier, origin } = data;
  const uid = auth.uid;

  if (!venueId || !tier) {
    throw new HttpsError("invalid-argument", "venueId y tier son obligatorios.");
  }

  const venueDoc = await db.collection("venues").doc(venueId).get();
  if (!venueDoc.exists) throw new HttpsError("not-found", "Local no encontrado.");
  if (venueDoc.data().ownerId !== uid) {
    throw new HttpsError("permission-denied", "Solo el propietario puede suscribir el local.");
  }

  let customerId = venueDoc.data().stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: auth.token.email,
      metadata: { firebaseUID: uid, venueId }
    });
    customerId = customer.id;
    await db.collection("venues").doc(venueId).update({ stripeCustomerId: customerId });
  }

  let amount = 0;
  let name = "";
  let priceId = null;

  if (tier === "basico") { 
    amount = 3000; name = "Venue - Básico"; 
    priceId = process.env.STRIPE_PRICE_BASICO;
  } else if (tier === "promo") { 
    amount = 6000; name = "Venue - Promo"; 
    priceId = process.env.STRIPE_PRICE_PROMO;
  } else if (tier === "ticketing") { 
    amount = 10000; name = "Venue - Ticketing"; 
    priceId = process.env.STRIPE_PRICE_TICKETING;
  } else {
    throw new HttpsError("invalid-argument", "Tier inválido.");
  }

  try {
    const lineItem = priceId ? {
      price: priceId,
      quantity: 1,
    } : {
      price_data: {
        currency: "eur",
        product_data: { name },
        unit_amount: amount,
        recurring: { interval: "month" },
      },
      quantity: 1,
    };

    const platform = origin?.includes('darknights') ? 'darknights' : (data.platform || 'blownights');
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [lineItem],
      mode: "subscription",
      success_url: `${origin}/venue-admin?venueId=${venueId}&success=true`,
      cancel_url: `${origin}/venue-admin?venueId=${venueId}&canceled=true`,
      metadata: { type: "venue_subscription", venueId, tier, firebaseUID: uid, cityId: venueDoc.data().cityId || "", platform }
    });
    return { sessionId: session.id, url: session.url };
  } catch (error) {
    throw new HttpsError("internal", error.message);
  }
});

exports.createChillPassCheckout = onCall({ secrets: ["STRIPE_SECRET_KEY"] }, async (request) => {
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
        metadata: { firebaseUID: uid, type: "chill_pass", duration: "48h", city_slug: citySlug || "", platform: origin?.includes('darknights') ? 'darknights' : (data.platform || 'blownights') },
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
        metadata: { firebaseUID: uid, type: "chill_vip", city_slug: citySlug || "", platform: origin?.includes('darknights') ? 'darknights' : (data.platform || 'blownights') },
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
        metadata: { firebaseUID: uid, type: "chill_vip", city_slug: citySlug || "", platform: origin?.includes('darknights') ? 'darknights' : (data.platform || 'blownights') },
      });
      return { sessionId: session.id, url: session.url };
    } else {
      throw new HttpsError("invalid-argument", "passType debe ser weekend, monthly o quarterly.");
    }
  } catch (error) {
    throw new HttpsError("internal", error.message);
  }
});

exports.createPingCheckoutSession = onCall({ secrets: ["STRIPE_SECRET_KEY"] }, async (request) => {
  const { data, auth } = request;
  if (!auth) throw new HttpsError("unauthenticated", "Login requerido.");

  const stripe = getStripe();
  if (!stripe) throw new HttpsError("failed-precondition", "Stripe no configurado.");

  const { type, origin, citySlug } = data;
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
    let creditsAmount = 0;

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
    } else if (type === "qr_credits_pack_25") {
      creditsAmount = 50;
      priceData = {
        currency: "eur",
        product_data: { name: "Pack 50 Entradas QR" },
        unit_amount: 2500, // 25.00 EUR
      };
    } else if (type === "qr_credits_pack_50") {
      creditsAmount = 100;
      priceData = {
        currency: "eur",
        product_data: { name: "Pack 100 Entradas QR" },
        unit_amount: 5000, // 50.00 EUR
      };
    } else {
      throw new HttpsError("invalid-argument", "Tipo de pase no válido.");
    }

    const platform = origin?.includes('darknights') ? 'darknights' : (data.platform || 'blownights');
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card", "apple_pay", "google_pay"],
      line_items: [{
        price_data: priceData,
        quantity: 1,
      }],
      mode: "payment",
      success_url: type.startsWith("qr_credits") ? `${origin}/rrpp/comprar-creditos?success=true` : `${origin}/premium?success=true`,
      cancel_url: type.startsWith("qr_credits") ? `${origin}/rrpp/comprar-creditos?canceled=true` : `${origin}/premium?canceled=true`,
      metadata: { 
        firebaseUID: uid, 
        type: type.startsWith("qr_credits_pack") ? "qr_credits_pack" : type, 
        city_slug: citySlug || "",
        creditsAmount: creditsAmount.toString(),
        platform
      },
    });
    return { sessionId: session.id, url: session.url };
  } catch (error) {
    throw new HttpsError("internal", error.message);
  }
});

exports.createStripeConnectAccount = onCall({ secrets: ["STRIPE_SECRET_KEY"] }, async (request) => {
  const { data, auth } = request;
  if (!auth) throw new HttpsError("unauthenticated", "Login requerido.");

  const stripe = getStripe();
  if (!stripe) throw new HttpsError("failed-precondition", "Stripe no configurado.");

  const { venueId, email } = data;
  if (!venueId) throw new HttpsError("invalid-argument", "venueId es requerido.");

  const venueRef = db.collection("venues").doc(venueId);
  const venueSnap = await venueRef.get();
  if (!venueSnap.exists) throw new HttpsError("not-found", "Local no encontrado.");

  const venue = venueSnap.data();
  if (venue.ownerId !== auth.uid) {
    throw new HttpsError("permission-denied", "Solo el propietario del local puede crear una cuenta Stripe.");
  }

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

exports.createStripeAccountLink = onCall({ secrets: ["STRIPE_SECRET_KEY"] }, async (request) => {
  const { data, auth } = request;
  if (!auth) throw new HttpsError("unauthenticated", "Login requerido.");

  if (!data.venueId) throw new HttpsError("invalid-argument", "venueId es obligatorio.");
  const venueSnap = await db.collection("venues").doc(data.venueId).get();
  if (!venueSnap.exists) throw new HttpsError("not-found", "Venue no encontrado.");
  const venue = venueSnap.data();
  if (venue.ownerId !== auth.uid) {
    throw new HttpsError("permission-denied", "No eres el propietario de este venue.");
  }
  if (!venue.stripeAccountId) {
    throw new HttpsError("failed-precondition", "Este venue no tiene cuenta Stripe.");
  }

  const stripe = getStripe();
  const accountLink = await stripe.accountLinks.create({
    account: venue.stripeAccountId,
    refresh_url: `${data.origin}/business/stripe?refresh=true`,
    return_url: `${data.origin}/business/stripe?return=true`,
    type: 'account_onboarding',
  });
  return { url: accountLink.url };
});

exports.createQRPackageCheckout = onCall({ secrets: ["STRIPE_SECRET_KEY"] }, async (request) => {
  const { data } = request;
  const stripe = getStripe();
  if (!stripe) throw new HttpsError("failed-precondition", "Stripe no configurado.");

  const { token, quantity, origin, purchaseType } = data;
  const firebaseUID = request.auth?.uid;
  if (!quantity || !firebaseUID) throw new HttpsError("invalid-argument", "Parámetros inválidos o usuario no autenticado.");

  const isOrganizer = purchaseType === 'organizer';
  const unitPrice = isOrganizer ? 100 : 50;
  const typeStr = isOrganizer ? "qr_credits_pack" : "rrpp_qr_pack";
  const nameStr = isOrganizer ? `Pack ${quantity} QRs Organizador - Blow Nights` : `Paquete de ${quantity} QRs RRPP - Blow Nights`;
  const successUrlPath = isOrganizer ? "/organizer/register" : "/rrpp/comprar-creditos";

  try {
    const platform = origin?.includes('darknights') ? 'darknights' : (data.platform || 'blownights');
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card", "apple_pay", "google_pay"],
      line_items: [{
        price_data: {
          currency: "eur",
          product_data: { name: nameStr },
          unit_amount: unitPrice * quantity,
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: `${origin}${successUrlPath}?success=true`,
      cancel_url: `${origin}${successUrlPath}?canceled=true`,
      metadata: { type: typeStr, promoterToken: token || "", firebaseUID, quantity: quantity.toString(), platform },
    });
    return { url: session.url };
  } catch (error) {
    throw new HttpsError("internal", error.message);
  }
});

exports.stripeWebhook = onRequest({ secrets: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"] }, async (req, res) => {
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

  const eventRef = db.collection("processed_stripe_events").doc(event.id);
  try {
    await db.runTransaction(async (tx) => {
      const eventDoc = await tx.get(eventRef);
      if (eventDoc.exists) throw new Error("DUPLICATE");
      tx.set(eventRef, { processedAt: admin.firestore.FieldValue.serverTimestamp(), type: event.type });
    });
  } catch (e) {
    if (e.message === "DUPLICATE") return res.json({ received: true, duplicate: true });
    throw e;
  }

  if (event.type === "checkout.session.completed") {
    if (session.metadata?.type === "rrpp_qr_pack" || session.metadata?.type === "qr_credits_pack") {
      const quantityStr = session.metadata.quantity || session.metadata.creditsAmount || "0";
      const quantity = parseInt(quantityStr);
      const uid = session.metadata.firebaseUID;
      if (uid) {
        await db.collection("users").doc(uid).update({
          qr_quota: admin.firestore.FieldValue.increment(quantity)
        });

        try {
          const userDoc = await db.collection("users").doc(uid).get();
          const cityId = userDoc.exists ? userDoc.data().cityId : null;
          if (cityId) {
             const isOrganizer = session.metadata?.type === "qr_credits_pack";
             const amountCents = isOrganizer ? (100 * quantity) : (50 * quantity);
             const sourceType = isOrganizer ? "organizer_qr_credits" : "rrpp_qr_pack";
             await territorialSplit(stripe, db, { amountCents, cityId, sourceType, relatedId: uid, splitId: session.id, platform: session.metadata?.platform || 'blownights' });
          }
        } catch (e) {
          console.error("Error al despachar territorialSplit de QRs:", e);
        }
      }
    } else if (session.metadata?.type === "venue_subscription") {
      const venueId = session.metadata.venueId;
      const tier = session.metadata.tier;
      if (venueId && tier) {
        await db.collection("venues").doc(venueId).update({
          subscriptionTier: tier,
          subscriptionStatus: "active",
          isActive: true,
          stripeSubscriptionId: session.subscription,
        });

        const cityId = session.metadata.cityId;
        if (cityId && session.amount_total > 0) {
          await territorialSplit(stripe, db, { amountCents: session.amount_total, cityId, sourceType: "venue_saas", relatedId: venueId, splitId: session.id, platform: session.metadata?.platform || 'blownights' });
        }
      }
    } else if (firebaseUID || session.metadata?.type === "public_ticket") {
     const isTicket = session.metadata?.type === "ticket" || session.metadata?.type === "public_ticket";
     const isPublicTicket = session.metadata?.type === "public_ticket";
     const isChillPass = session.metadata?.type === "chill_pass";
     const isChillVip = session.metadata?.type === "chill_vip";
     const isUserMembership = session.metadata?.type === "user_membership";
     const isBlackBoost = session.metadata?.type === "black_boost";

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

      const citySlug = session.metadata?.city_slug;
      if (citySlug && session.amount_total > 0) {
        const sourceType = session.metadata?.type || "chill_pass";
        await territorialSplit(stripe, db, { amountCents: session.amount_total, cityId: citySlug, sourceType, relatedId: firebaseUID, splitId: session.id, platform: session.metadata?.platform || 'blownights' });
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

      const citySlug = session.metadata?.city_slug;
      if (citySlug && session.amount_total > 0) {
        const sourceType = session.metadata?.type || "chill_pass";
        await territorialSplit(stripe, db, { amountCents: session.amount_total, cityId: citySlug, sourceType, relatedId: firebaseUID, splitId: session.id, platform: session.metadata?.platform || 'blownights' });
      }
    } else if (isTicket) {
      const crypto = require("crypto");
      const qrToken = crypto.randomBytes(32).toString("hex");
      const pinCode = Math.floor(1000 + Math.random() * 9000).toString();
      const venueId = session.metadata.venueId;
      const eventId = session.metadata.eventId;
      const rrppId = session.metadata.rrppId;
      const reservationId = session.metadata.reservationId;
      const isIndependent = session.metadata.isIndependent === "true";

      let venueOwnerId = null;
      let cityId = "";

      if (isIndependent) {
        const eventDoc = await db.collection("events").doc(eventId).get();
        if (eventDoc.exists) {
          venueOwnerId = eventDoc.data().organizerId;
          cityId = eventDoc.data().cityId || "";
        }
      } else if (venueId) {
        const venueDoc = await db.collection("venues").doc(venueId).get();
        if (venueDoc.exists) {
          venueOwnerId = venueDoc.data().ownerId;
          cityId = venueDoc.data().cityId || "";
        }
      }

      let rrppCommission = 0;
      if (rrppId && venueId && !isIndependent) {
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
        userId: session.metadata.giftUserId || firebaseUID || null,
        customerEmail: session.customer_details?.email || session.customer_email || null,
        venueId,
        eventId: eventId || null,
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
        isIndependent,
      });

      if (reservationId && venueId && eventId && !isIndependent) {
        await db.collection("venues").doc(venueId).collection("events").doc(eventId).collection("reservations").doc(reservationId).update({
          status: "completed"
        });
      }

      const PLATFORM_FEE_CENTS = 100;
      if (cityId) {
        await territorialSplit(stripe, db, { amountCents: PLATFORM_FEE_CENTS, cityId, sourceType: "venue_ticketing_fee", relatedId: eventId || venueId, splitId: session.id, platform: session.metadata?.platform || 'blownights' });
      }
    } else {
      await db.collection("users").doc(firebaseUID).update({ premium: true });
      await db.collection("subscriptions").doc(firebaseUID).update({
        status: "active",
        subscriptionId: session.subscription,
        renewalDate: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  }
}
  

  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object;
    if (invoice.subscription) {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
      const isVenueSub = subscription.metadata?.type === "venue_subscription";
      const isUserSub = subscription.metadata?.type === "user_membership";
      const citySlug = subscription.metadata?.city_slug || subscription.metadata?.cityId;
      
      if (citySlug && invoice.amount_paid > 0) {
        if (isVenueSub) {
          const venueId = subscription.metadata?.venueId;
          const tier = subscription.metadata?.tier;
          await territorialSplit(stripe, db, { amountCents: invoice.amount_paid, cityId: citySlug, sourceType: "venue_subscription_renewal", relatedId: venueId, splitId: invoice.id, platform: subscription.metadata?.platform || 'blownights' });
        } else if (isUserSub) {
          const firebaseUID = subscription.metadata?.firebaseUID;
          await territorialSplit(stripe, db, { amountCents: invoice.amount_paid, cityId: citySlug, sourceType: "user_membership_renewal", relatedId: firebaseUID, splitId: invoice.id, platform: subscription.metadata?.platform || 'blownights' });
          
          if (firebaseUID) {
            await db.collection("subscriptions").doc(firebaseUID).update({
              renewalDate: admin.firestore.FieldValue.serverTimestamp()
            });
          }
        }
      }
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const customer = await stripe.customers.retrieve(session.customer);
    const uid = customer.metadata?.firebaseUID;
    const venueId = customer.metadata?.venueId;
    
    if (venueId) {
      await db.collection("venues").doc(venueId).update({
        subscriptionStatus: "canceled",
        subscriptionTier: admin.firestore.FieldValue.delete()
      });
    } else if (uid) {
      const subDoc = await db.collection("subscriptions").doc(uid).get();
      const isPromoMember = subDoc.exists && subDoc.data()?.promoMember === true;

      if (!isPromoMember) {
        await db.collection("users").doc(uid).update({ premium: false });
        const existingClaims = (await admin.auth().getUser(uid)).customClaims || {};
        await admin.auth().setCustomUserClaims(uid, { ...existingClaims, premium: false });
      }
      await db.collection("subscriptions").doc(uid).update({ status: isPromoMember ? "promo_lifetime" : "canceled" });
    }
  }

  res.json({ received: true });
});

exports.createStripePortalSession = onCall({ secrets: ["STRIPE_SECRET_KEY"] }, async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError("unauthenticated", "Necesitas estar logueado");

  const { venueId } = data;
  let customerId = null;

  if (venueId) {
    const venueDoc = await db.collection("venues").doc(venueId).get();
    if (!venueDoc.exists) throw new HttpsError("not-found", "Local no encontrado");
    if (venueDoc.data().ownerId !== auth.uid) throw new HttpsError("permission-denied", "No tienes permisos");
    customerId = venueDoc.data().stripeCustomerId;
  } else {
    const userDoc = await db.collection("subscriptions").doc(auth.uid).get();
    customerId = userDoc.exists ? userDoc.data().stripeCustomerId : null;
  }

  if (!customerId) {
    throw new HttpsError("failed-precondition", "No tienes una suscripción activa o método de pago.");
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: venueId ? `${process.env.NEXT_PUBLIC_URL || "https://blownights.com"}/venue-admin` : `${process.env.NEXT_PUBLIC_URL || "https://blownights.com"}/premium`,
    });
    return { url: session.url };
  } catch (error) {
    console.error("Stripe Portal Error:", error);
    throw new HttpsError("internal", error.message);
  }
});
