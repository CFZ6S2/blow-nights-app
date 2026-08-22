const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getStripe } = require("../lib/init");

exports.setupStripeProducts = onCall({ secrets: ["STRIPE_SECRET_KEY"] }, async (request) => {
  const { auth } = request;
  if (!auth) throw new HttpsError("unauthenticated", "Login requerido.");

  const stripe = getStripe();
  if (!stripe) throw new HttpsError("failed-precondition", "Stripe no configurado.");

  const results = {};

  // User Membership - Plus (10€/mes, 90€/año)
  const plusProduct = await stripe.products.create({
    name: "Blow Nights Plus",
    description: "Membresía Plus: chat gratis con matches, perfil destacado",
  });
  const plusMonthly = await stripe.prices.create({
    product: plusProduct.id,
    unit_amount: 1000,
    currency: "eur",
    recurring: { interval: "month" },
  });
  const plusYearly = await stripe.prices.create({
    product: plusProduct.id,
    unit_amount: 9000,
    currency: "eur",
    recurring: { interval: "year" },
  });
  results.STRIPE_PRICE_USER_PLUS_MONTHLY = plusMonthly.id;
  results.STRIPE_PRICE_USER_PLUS_YEARLY = plusYearly.id;

  // User Membership - Black (20€/mes, 180€/año)
  const blackProduct = await stripe.products.create({
    name: "Blow Nights Black",
    description: "Membresía Black: todo Plus + crear Chills, modo VIP",
  });
  const blackMonthly = await stripe.prices.create({
    product: blackProduct.id,
    unit_amount: 2000,
    currency: "eur",
    recurring: { interval: "month" },
  });
  const blackYearly = await stripe.prices.create({
    product: blackProduct.id,
    unit_amount: 18000,
    currency: "eur",
    recurring: { interval: "year" },
  });
  results.STRIPE_PRICE_USER_BLACK_MONTHLY = blackMonthly.id;
  results.STRIPE_PRICE_USER_BLACK_YEARLY = blackYearly.id;

  // Black 8h Pass (5€ one-time)
  const black8hProduct = await stripe.products.create({
    name: "Blow Nights Black 8h",
    description: "Pase Black de 8 horas",
  });
  const black8h = await stripe.prices.create({
    product: black8hProduct.id,
    unit_amount: 500,
    currency: "eur",
  });
  results.STRIPE_PRICE_USER_BLACK_8H = black8h.id;

  // Venue - Básico (30€/mes)
  const basicoProduct = await stripe.products.create({
    name: "Venue Básico",
    description: "Suscripción venue básica: ficha, QR check-in, Live Sense",
  });
  const basico = await stripe.prices.create({
    product: basicoProduct.id,
    unit_amount: 3000,
    currency: "eur",
    recurring: { interval: "month" },
  });
  results.STRIPE_PRICE_BASICO = basico.id;

  // Venue - Promo (60€/mes)
  const promoProduct = await stripe.products.create({
    name: "Venue Promo",
    description: "Suscripción venue promo: básico + promociones destacadas",
  });
  const promo = await stripe.prices.create({
    product: promoProduct.id,
    unit_amount: 6000,
    currency: "eur",
    recurring: { interval: "month" },
  });
  results.STRIPE_PRICE_PROMO = promo.id;

  // Venue - Ticketing (100€/mes)
  const ticketingProduct = await stripe.products.create({
    name: "Venue Ticketing",
    description: "Suscripción venue ticketing: promo + venta de entradas integrada",
  });
  const ticketing = await stripe.prices.create({
    product: ticketingProduct.id,
    unit_amount: 10000,
    currency: "eur",
    recurring: { interval: "month" },
  });
  results.STRIPE_PRICE_TICKETING = ticketing.id;

  return results;
});

exports.createTestPromoCode = onCall({ secrets: ["STRIPE_SECRET_KEY"] }, async (request) => {
  const { auth } = request;
  if (!auth) throw new HttpsError("unauthenticated", "Login requerido.");

  const stripe = getStripe();
  if (!stripe) throw new HttpsError("failed-precondition", "Stripe no configurado.");

  const coupon = await stripe.coupons.create({
    percent_off: 100,
    duration: "forever",
    name: "TEST 100% OFF",
  });

  const promoCode = await stripe.promotionCodes.create({
    promotion: { type: "coupon", coupon: coupon.id },
    code: "TEST100",
    max_redemptions: 50,
  });

  return { couponId: coupon.id, promoCodeId: promoCode.id, code: "TEST100" };
});
