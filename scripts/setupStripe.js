const fs = require('fs');
const path = require('path');
const stripe = require('../functions/node_modules/stripe')(process.env.STRIPE_SECRET_KEY);

async function createAll() {
  console.log('Creating products and prices in Stripe LIVE mode...');

  async function createProduct(name) {
    console.log(`Creating product: ${name}`);
    return await stripe.products.create({ name });
  }

  async function createPrice(productId, amountCents, interval) {
    console.log(`Creating price for ${productId}: ${amountCents} cents, ${interval}`);
    const params = {
      product: productId,
      unit_amount: amountCents,
      currency: 'eur',
    };
    if (interval !== 'one-time') {
      params.recurring = { interval };
    }
    return await stripe.prices.create(params);
  }

  try {
    // Users
    const plusProd = await createProduct('Blow Nights - Plus');
    const blackProd = await createProduct('Blow Nights - Black');
    const black8hProd = await createProduct('Blow Nights - Black 8 Horas');

    // Venues
    const basicoProd = await createProduct('Blow Nights - Local Básico');
    const promoProd = await createProduct('Blow Nights - Local Promo');
    const ticketingProd = await createProduct('Blow Nights - Local Ticketing');

    // Prices
    const pricePlusMonthly = await createPrice(plusProd.id, 499, 'month');
    const pricePlusYearly = await createPrice(plusProd.id, 3999, 'year');
    const priceBlackMonthly = await createPrice(blackProd.id, 1999, 'month');
    const priceBlackYearly = await createPrice(blackProd.id, 14999, 'year');
    const priceBlack8h = await createPrice(black8hProd.id, 499, 'one-time');

    const priceBasico = await createPrice(basicoProd.id, 3000, 'month');
    const pricePromo = await createPrice(promoProd.id, 5000, 'month');
    const priceTicketing = await createPrice(ticketingProd.id, 10000, 'month');

    const envContent = `SENTRY_DSN=https://e32c07a7115b035de6d43aa72bc0080b@o4511943654506496.ingest.us.sentry.io/4511943732297728
SENTRY_ENVIRONMENT=production

# Membresías Usuario
STRIPE_PRICE_USER_PLUS_MONTHLY=${pricePlusMonthly.id}
STRIPE_PRICE_USER_PLUS_YEARLY=${pricePlusYearly.id}
STRIPE_PRICE_USER_BLACK_MONTHLY=${priceBlackMonthly.id}
STRIPE_PRICE_USER_BLACK_YEARLY=${priceBlackYearly.id}
STRIPE_PRICE_USER_BLACK_8H=${priceBlack8h.id}

# Membresías Venue
STRIPE_PRICE_BASICO=${priceBasico.id}
STRIPE_PRICE_PROMO=${pricePromo.id}
STRIPE_PRICE_TICKETING=${priceTicketing.id}
`;

    fs.writeFileSync(path.join(__dirname, '..', 'functions', '.env'), envContent);
    console.log('Done! Configured functions/.env with Live Stripe IDs.');
  } catch (error) {
    console.error('Error in setup script:', error);
  }
}

createAll();
