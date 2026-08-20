const { onCall, HttpsError, onRequest } = require("firebase-functions/v2/https");
const { admin, db, getStripe } = require("../lib/init");

async function executePayoutCascade(stripe, amountCents, cityId, description, transferGroup, type, relatedId, userId, db, admin) {
  if (!cityId || amountCents <= 0) return;
  try {
    const cityDoc = await db.collection("cities").doc(cityId).get();
    if (!cityDoc.exists) return;
    const cityData = cityDoc.data();
    const partnerStripeId = cityData.partner_stripe_account_id || null;
    const ambassadorId = cityData.ambassadorId || null;

    const ambassadorCents = Math.round(amountCents * 0.25);
    let ambassadorPaid = false;

    if (ambassadorId) {
      const ambassadorDoc = await db.collection("users").doc(ambassadorId).get();
      const ambassadorStripe = ambassadorDoc.exists ? ambassadorDoc.data()?.stripeAccountId : null;
      if (ambassadorStripe) {
        const transferData = {
          amount: ambassadorCents,
          currency: "eur",
          destination: ambassadorStripe,
          description: `Ambassador 25% ${description}`,
          transfer_group: transferGroup,
        };
        try {
          await stripe.transfers.create(transferData);
          await db.collection("users").doc(ambassadorId).collection("earnings").add({
            amount: ambassadorCents / 100,
            type: type,
            cityId,
            relatedId: relatedId || null,
            userId: userId || null,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          });
          ambassadorPaid = true;
        } catch (err) {
          console.error("Error en transfer Ambassador:", err);
          await db.collection("pending_transfers").add({ ...transferData, status: "pending", error: err.message, timestamp: admin.firestore.FieldValue.serverTimestamp() });
        }
      }
    }

    const cityManagerCents = Math.ceil((amountCents - ambassadorCents) / 2);

    if (partnerStripeId) {
      const transferData = {
        amount: cityManagerCents,
        currency: "eur",
        destination: partnerStripeId,
        description: `CityManager 50% ${description}`,
        transfer_group: transferGroup,
      };
      try {
        await stripe.transfers.create(transferData);
        await db.collection("cities").doc(cityId).collection("earnings").add({
          amount: cityManagerCents / 100,
          type: type,
          relatedId: relatedId || null,
          userId: userId || null,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (err) {
        console.error("Error en transfer City Manager:", err);
        await db.collection("pending_transfers").add({ ...transferData, status: "pending", error: err.message, timestamp: admin.firestore.FieldValue.serverTimestamp() });
      }
    }
  } catch(e) {
    console.error("Error en executePayoutCascade", e);
  }
}

exports.createCheckoutSession = onCall({ enforceAppCheck: true }, async (request) => {
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

exports.createVenueSubscriptionCheckout = onCall({ enforceAppCheck: true }, async (request) => {
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

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [lineItem],
      mode: "subscription",
      success_url: `${origin}/venue-admin?venueId=${venueId}&success=true`,
      cancel_url: `${origin}/venue-admin?venueId=${venueId}&canceled=true`,
      metadata: { type: "venue_subscription", venueId, tier, firebaseUID: uid, cityId: venueDoc.data().cityId || "" }
    });
    return { sessionId: session.id, url: session.url };
  } catch (error) {
    throw new HttpsError("internal", error.message);
  }
});

exports.createChillPassCheckout = onCall({ enforceAppCheck: true }, async (request) => {
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

exports.createPingCheckoutSession = onCall({ enforceAppCheck: true }, async (request) => {
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
        creditsAmount: creditsAmount.toString()
      },
    });
    return { sessionId: session.id, url: session.url };
  } catch (error) {
    throw new HttpsError("internal", error.message);
  }
});

exports.createStripeConnectAccount = onCall({ enforceAppCheck: true }, async (request) => {
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

exports.createStripeAccountLink = onCall({ enforceAppCheck: true }, async (request) => {
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

exports.createQRPackageCheckout = onCall({ enforceAppCheck: true }, async (request) => {
  const { data } = request;
  const stripe = getStripe();
  if (!stripe) throw new HttpsError("failed-precondition", "Stripe no configurado.");

  const { token, quantity, origin } = data;
  const firebaseUID = request.auth?.uid;
  if (!quantity || !firebaseUID) throw new HttpsError("invalid-argument", "Parámetros inválidos o usuario no autenticado.");

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card", "apple_pay", "google_pay"],
      line_items: [{
        price_data: {
          currency: "eur",
          product_data: { name: `Paquete de ${quantity} QRs - Blow Nights` },
          unit_amount: 50 * quantity, // 0.50€ por QR (50 cents)
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: `${origin}/rrpp/comprar-creditos?success=true`,
      cancel_url: `${origin}/rrpp/comprar-creditos?canceled=true`,
      metadata: { type: "rrpp_qr_pack", promoterToken: token || "", firebaseUID, quantity: quantity.toString() },
    });
    return { url: session.url };
  } catch (error) {
    throw new HttpsError("internal", error.message);
  }
});

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

        // 50/50 split con city manager (0.25€ por QR)
        try {
          const userDoc = await db.collection("users").doc(uid).get();
          const cityId = userDoc.exists ? userDoc.data().cityId : null;
          if (cityId) {
            const cityDoc = await db.collection("cities").doc(cityId).get();
            const cityManagerStripe = cityDoc.exists ? cityDoc.data()?.partner_stripe_account_id : null;
            if (cityManagerStripe) {
              const managerCut = 25 * quantity; // 0.25€ por QR
              const transferData = {
                amount: managerCut,
                currency: "eur",
                destination: cityManagerStripe,
                description: `QR pack - ${uid}`,
                transfer_group: session.id,
              };
              try {
                await stripe.transfers.create(transferData);
                await db.collection("cities").doc(cityId).collection("earnings").add({
                  amount: managerCut / 100,
                  type: "qr_pack_fee",
                  userId: uid,
                  timestamp: admin.firestore.FieldValue.serverTimestamp(),
                });
              } catch (err) {
                console.error("Error en transfer City Manager por QR pack:", err);
                await db.collection("pending_transfers").add({ ...transferData, status: "pending", error: err.message, timestamp: admin.firestore.FieldValue.serverTimestamp() });
              }
            }
          }
        } catch (e) {
          console.error("Error leyendo datos para transfer City Manager:", e);
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
          try {
            const cityDoc = await db.collection("cities").doc(cityId).get();
            if (!cityDoc.exists) throw new Error("City doc not found");
            const cityData = cityDoc.data();
            const partnerStripeId = cityData.partner_stripe_account_id || null;
            const ambassadorId = cityData.ambassadorId || null;

            const ambassadorCents = Math.round(session.amount_total * 0.25);
            let ambassadorPaid = false;

            if (ambassadorId) {
              try {
                const ambassadorDoc = await db.collection("users").doc(ambassadorId).get();
                const ambassadorStripe = ambassadorDoc.exists ? ambassadorDoc.data()?.stripeAccountId : null;
                if (ambassadorStripe) {
                  const transferData = {
                    amount: ambassadorCents,
                    currency: "eur",
                    destination: ambassadorStripe,
                    description: `Ambassador 25% venue sub ${tier} - ${cityId}`,
                    transfer_group: session.id,
                  };
                  try {
                    await stripe.transfers.create(transferData);
                    await db.collection("users").doc(ambassadorId).collection("earnings").add({
                      amount: ambassadorCents / 100,
                      type: "venue_subscription",
                      cityId,
                      venueId,
                      timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    });
                    ambassadorPaid = true;
                  } catch (err) {
                    console.error("Error en transfer Ambassador venue sub:", err);
                    await db.collection("pending_transfers").add({ ...transferData, status: "pending", error: err.message, timestamp: admin.firestore.FieldValue.serverTimestamp() });
                  }
                }
              } catch (e) {
                console.error("Error leyendo datos de Ambassador:", e);
              }
            }

            const poolCents = ambassadorPaid ? session.amount_total - ambassadorCents : session.amount_total;
            const cityManagerCents = Math.ceil(poolCents / 2);

            if (partnerStripeId) {
              const transferData = {
                amount: cityManagerCents,
                currency: "eur",
                destination: partnerStripeId,
                description: `50% venue sub ${tier} - ${venueId}`,
                transfer_group: session.id,
              };
              try {
                await stripe.transfers.create(transferData);
                await db.collection("cities").doc(cityId).collection("earnings").add({
                  amount: cityManagerCents / 100,
                  type: "venue_subscription",
                  venueId,
                  tier,
                  timestamp: admin.firestore.FieldValue.serverTimestamp(),
                });
              } catch (err) {
                console.error("Error en transfer City Manager venue sub:", err);
                await db.collection("pending_transfers").add({ ...transferData, status: "pending", error: err.message, timestamp: admin.firestore.FieldValue.serverTimestamp() });
              }
            }
          } catch (e) {
            console.error("Error procesando reparto venue sub:", e);
          }
        }
      }
    } else if (firebaseUID) {
     const isTicket = session.metadata?.type === "ticket";
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
        try {
          const cityDoc = await db.collection("cities").doc(citySlug).get();
          const partnerStripeId = cityDoc.exists ? cityDoc.data()?.partner_stripe_account_id : null;
          if (partnerStripeId) {
            const partnerCutCents = Math.round(session.amount_total * 0.50);
            const transferData = {
              amount: partnerCutCents,
              currency: "eur",
              destination: partnerStripeId,
              description: `40% suscripcion VIP - ${session.customer_email || firebaseUID}`,
              metadata: { city: citySlug, firebaseUID },
            };
            try {
              await stripe.transfers.create(transferData);
            } catch (err) {
              console.error("Error en transfer 40% al socio local:", err);
              await db.collection("pending_transfers").add({ ...transferData, status: "pending", error: err.message, timestamp: admin.firestore.FieldValue.serverTimestamp() });
            }
          }
        } catch (e) {
          console.error("Error leyendo datos del socio local:", e);
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

      const citySlug = session.metadata?.city_slug;
      if (citySlug && session.amount_total > 0) {
        try {
          const cityDoc = await db.collection("cities").doc(citySlug).get();
          const partnerStripeId = cityDoc.exists ? cityDoc.data()?.partner_stripe_account_id : null;
          if (partnerStripeId) {
            const partnerCutCents = Math.round(session.amount_total * 0.50);
            const amountEur = partnerCutCents / 100;
            const transferData = {
              amount: partnerCutCents,
              currency: "eur",
              destination: partnerStripeId,
              description: `40% ${type === 'ping_pack' ? 'Pack Toques' : 'Pase Fuego'} - ${firebaseUID}`,
              metadata: { city: citySlug, firebaseUID, type },
            };

            try {
              await stripe.transfers.create(transferData);
              await db.collection("cities").doc(citySlug).collection("earnings").add({
                amount: amountEur,
                type: type === 'ping_pack' ? 'micro_ping' : 'vip_night',
                userId: firebaseUID,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
              });
            } catch (err) {
              console.error("Error en transfer 40% de pings al socio local:", err);
              await db.collection("pending_transfers").add({ ...transferData, status: "pending", error: err.message, timestamp: admin.firestore.FieldValue.serverTimestamp() });
            }
          }
        } catch (e) {
          console.error("Error leyendo datos del socio local:", e);
        }
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
        userId: firebaseUID,
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
        try {
          const cityDoc = await db.collection("cities").doc(cityId).get();
          if (!cityDoc.exists) throw new Error("City doc not found");
          const cityData = cityDoc.data();
          const partnerStripeId = cityData.partner_stripe_account_id || null;
          const ambassadorId = cityData.ambassadorId || null;

          const ambassadorCents = Math.round(PLATFORM_FEE_CENTS * 0.25);
          let ambassadorPaid = false;

          if (ambassadorId) {
            try {
              const ambassadorDoc = await db.collection("users").doc(ambassadorId).get();
              const ambassadorStripe = ambassadorDoc.exists ? ambassadorDoc.data()?.stripeAccountId : null;
              if (ambassadorStripe) {
                const transferData = {
                  amount: ambassadorCents,
                  currency: "eur",
                  destination: ambassadorStripe,
                  description: `Ambassador 25% ticket ${eventId} - ${cityId}`,
                  transfer_group: session.id,
                };
                try {
                  await stripe.transfers.create(transferData);
                  await db.collection("users").doc(ambassadorId).collection("earnings").add({
                    amount: ambassadorCents / 100,
                    type: "ticket_fee",
                    cityId,
                    venueId,
                    eventId,
                    userId: firebaseUID,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                  });
                  ambassadorPaid = true;
                } catch (err) {
                  console.error("Error en transfer Ambassador:", err);
                  await db.collection("pending_transfers").add({ ...transferData, status: "pending", error: err.message, timestamp: admin.firestore.FieldValue.serverTimestamp() });
                }
              }
            } catch (e) {
              console.error("Error leyendo datos de Ambassador:", e);
            }
          }

          const poolAfterAmbassador = ambassadorPaid ? PLATFORM_FEE_CENTS - ambassadorCents : PLATFORM_FEE_CENTS;
          const cityManagerCents = Math.ceil(poolAfterAmbassador / 2);

          if (partnerStripeId) {
            const transferData = {
              amount: cityManagerCents,
              currency: "eur",
              destination: partnerStripeId,
              description: `CityManager ${cityId} ticket ${eventId}`,
              transfer_group: session.id,
            };
            try {
              await stripe.transfers.create(transferData);
              await db.collection("cities").doc(cityId).collection("earnings").add({
                amount: cityManagerCents / 100,
                type: "ticket_fee",
                venueId,
                eventId,
                userId: firebaseUID,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
              });
            } catch (err) {
              console.error("Error en transfer City Manager:", err);
              await db.collection("pending_transfers").add({ ...transferData, status: "pending", error: err.message, timestamp: admin.firestore.FieldValue.serverTimestamp() });
            }
          }
        } catch (e) {
          console.error("Error procesando reparto ticket:", e);
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
          await executePayoutCascade(stripe, invoice.amount_paid, citySlug, `Renovación venue sub ${tier} - ${venueId}`, invoice.id, "venue_subscription_renewal", venueId, null, db, admin);
        } else if (isUserSub) {
          const firebaseUID = subscription.metadata?.firebaseUID;
          await executePayoutCascade(stripe, invoice.amount_paid, citySlug, `Renovación Suscripción Plus - ${firebaseUID}`, invoice.id, "user_membership_renewal", null, firebaseUID, db, admin);
          
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

exports.createStripePortalSession = onCall({ enforceAppCheck: true }, async (request) => {
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
