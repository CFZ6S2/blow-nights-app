// functions/modules/membership.js
// Handles user membership subscription checkout and one‑time Black 8h boost

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { admin, db, getStripe } = require('../lib/init');

/**
 * Create a Checkout Session for a membership tier (Free is default, no Stripe).
 * Expected data: { tier: 'plus'|'black', period: 'monthly'|'yearly', origin }
 */
exports.createUserMembershipCheckout = onCall({ enforceAppCheck: true }, async (request) => {
  const { data, auth } = request;
  if (!auth) throw new HttpsError('unauthenticated', 'Login requerido.');
  const { tier, period, origin } = data;
  if (!tier || !period) throw new HttpsError('invalid-argument', 'Tier and period are required.');

  const stripe = getStripe();
  if (!stripe) throw new HttpsError('failed-precondition', 'Stripe no configurado.');

  const uid = auth.uid;
  const email = auth.token.email;

  // Determine price ID from env vars
  const priceEnvMap = {
    plus: {
      monthly: process.env.STRIPE_PRICE_USER_PLUS_MONTHLY,
      yearly: process.env.STRIPE_PRICE_USER_PLUS_YEARLY,
    },
    black: {
      monthly: process.env.STRIPE_PRICE_USER_BLACK_MONTHLY,
      yearly: process.env.STRIPE_PRICE_USER_BLACK_YEARLY,
    },
  };
  const priceId = priceEnvMap[tier]?.[period];
  if (!priceId) throw new HttpsError('invalid-argument', 'Precio no encontrado para tier/periodo.');

  // Ensure a Stripe customer exists for the user
  let customerId = null;
  const subDoc = await db.collection('subscriptions').doc(uid).get();
  if (subDoc.exists) customerId = subDoc.data().stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({ email, metadata: { firebaseUID: uid } });
    customerId = customer.id;
    await db.collection('subscriptions').doc(uid).set({ stripeCustomerId: customerId, status: 'incomplete' }, { merge: true });
  }

  // Create Checkout Session (subscription mode)
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: `${origin}/premium?success=true`,
    cancel_url: `${origin}/premium?canceled=true`,
    metadata: { firebaseUID: uid, type: 'user_membership', tier, period },
  });

  return { sessionId: session.id, url: session.url };
});

/**
 * One‑time checkout for the Black 8h pass (5 €).
 * Expected data: { origin }
 */
exports.createBlack8hCheckout = onCall({ enforceAppCheck: true }, async (request) => {
  const { data, auth } = request;
  if (!auth) throw new HttpsError('unauthenticated', 'Login requerido.');
  const { origin } = data;
  const stripe = getStripe();
  if (!stripe) throw new HttpsError('failed-precondition', 'Stripe no configurado.');
  const uid = auth.uid;

  // Ensure customer exists
  let customerId = null;
  const subDoc = await db.collection('subscriptions').doc(uid).get();
  if (subDoc.exists) customerId = subDoc.data().stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: auth.token.email, metadata: { firebaseUID: uid } });
    customerId = customer.id;
    await db.collection('subscriptions').doc(uid).set({ stripeCustomerId: customerId, status: 'incomplete' }, { merge: true });
  }

  const priceId = process.env.STRIPE_PRICE_USER_BLACK_8H;
  if (!priceId) throw new HttpsError('failed-precondition', 'Precio Black 8h no configurado.');

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'payment',
    success_url: `${origin}/premium?black8h_success=true`,
    cancel_url: `${origin}/premium?black8h_canceled=true`,
    metadata: { firebaseUID: uid, type: 'black_boost' },
  });

  return { sessionId: session.id, url: session.url };
});
