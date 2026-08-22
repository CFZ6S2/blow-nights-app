const { initializeTestEnvironment } = require("@firebase/rules-unit-testing");
const { readFileSync } = require("fs");
const { resolve } = require("path");

process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
const { admin, db } = require("../lib/init");

const stripeModule = require("../modules/stripe");
// stripeModule exports territorialSplit? Wait, stripeModule might only export HTTP functions. Let's check.
// I will mock Stripe entirely.
const mockStripe = {
  transfers: {
    create: jest.fn(async (params, options) => {
      // Simulate network delay
      await new Promise(r => setTimeout(r, 50));
      return { id: `tr_${Math.random().toString(36).substring(7)}`, ...params };
    })
  }
};

const PROJECT_ID = "blow-nights-stripe-test";
const RULES = readFileSync(resolve(__dirname, "../../firestore.rules"), "utf8");
let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: RULES, host: "127.0.0.1", port: 8080 },
  });
}, 30000);

afterAll(async () => {
  if (testEnv) await testEnv.cleanup();
});

afterEach(async () => {
  if (testEnv) await testEnv.clearFirestore();
  jest.clearAllMocks();
});

describe("Stripe Financial Integrity (Go-Live Gate)", () => {
  
  test("1. Webhook duplicado: Idempotencia estricta en concurrencia", async () => {
    // Setup City and CM
    await db.collection("cities").doc("madrid").set({
      name: "Madrid",
      partner_stripe_account_id: "acct_CM123",
      ambassadorId: "ambassador_1"
    });
    
    await db.collection("users").doc("ambassador_1").set({
      stripeAccountId: "acct_AMB123"
    });
    
    // Simulate Duplicate Webhook by firing territorialSplit twice concurrently
    const amountCents = 1000; // 10 EUR
    const splitId = "evt_payment_intent_123";
    
    const call1 = stripeModule.territorialSplit(mockStripe, db, {
      amountCents,
      cityId: "madrid",
      sourceType: "ticket",
      splitId
    });
    
    const call2 = stripeModule.territorialSplit(mockStripe, db, {
      amountCents,
      cityId: "madrid",
      sourceType: "ticket",
      splitId
    });
    
    await Promise.all([call1, call2]);
    
    // VERIFICATIONS
    // 1. Stripe should only be called twice (1 for CM, 1 for Ambassador), not 4 times
    expect(mockStripe.transfers.create).toHaveBeenCalledTimes(2);
    
    // 2. Only ONE document should exist in territorial_splits with that ID
    const splitsSnap = await db.collection("territorial_splits").where("splitId", "==", splitId).get();
    expect(splitsSnap.size).toBe(1);
    
    // 3. The status should be 'completed'
    const docData = splitsSnap.docs[0].data();
    expect(docData.status).toBe("completed");
  }, 30000);

  test("2. Ambassador sin Stripe conectado: Retención como pending_payout", async () => {
    // Setup City but Ambassador has NO Stripe account
    await db.collection("cities").doc("barcelona").set({
      name: "Barcelona",
      partner_stripe_account_id: "acct_CM456",
      ambassadorId: "ambassador_2"
    });
    
    // Ambassador user exists but no stripeAccountId
    await db.collection("users").doc("ambassador_2").set({
      name: "Ambassador without Stripe"
    });
    
    const amountCents = 2000; // 20 EUR
    const splitId = "evt_payment_intent_456";
    
    await stripeModule.territorialSplit(mockStripe, db, {
      amountCents,
      cityId: "barcelona",
      sourceType: "ticket",
      splitId
    });
    
    // Stripe transfers should only fire for the CM (1 time)
    expect(mockStripe.transfers.create).toHaveBeenCalledTimes(1);
    
    const splitDoc = await db.collection("territorial_splits").doc(splitId).get();
    const docData = splitDoc.data();
    
    // Check payouts array
    const ambPayout = docData.payouts.find(p => p.role === "ambassador");
    expect(ambPayout).toBeDefined();
    expect(ambPayout.amountCents).toBe(500); // 25% of 2000
    expect(ambPayout.status).toBe("pending_payout");
    expect(ambPayout.error).toBe("No Stripe connected");
    
    expect(docData.status).toBe("partial");
  });

  test("3. Reconciliación Unitaria: La suma de céntimos debe ser exacta y cuadrar el split", async () => {
    await db.collection("cities").doc("valencia").set({
      name: "Valencia",
      partner_stripe_account_id: "acct_CM789",
      ambassadorId: "ambassador_3"
    });
    await db.collection("users").doc("ambassador_3").set({ stripeAccountId: "acct_AMB789" });
    
    // Test a weird amount to trigger rounding logic (e.g. 10.33 EUR)
    const amountCents = 1033;
    const splitId = "evt_payment_intent_789";
    
    await stripeModule.territorialSplit(mockStripe, db, {
      amountCents,
      cityId: "valencia",
      sourceType: "ticket",
      splitId
    });
    
    const splitDoc = await db.collection("territorial_splits").doc(splitId).get();
    const docData = splitDoc.data();
    
    const ambPayout = docData.payouts.find(p => p.role === "ambassador");
    const cmPayout = docData.payouts.find(p => p.role === "city_manager");
    const centralPayout = docData.payouts.find(p => p.role === "central");
    
    // Math.round(1033 * 0.25) = 258
    expect(ambPayout.amountCents).toBe(258);
    // Math.round(1033 * 0.375) = 387
    expect(cmPayout.amountCents).toBe(387);
    // Resto: 1033 - 258 - 387 = 388
    expect(centralPayout.amountCents).toBe(388);
    
    const total = ambPayout.amountCents + cmPayout.amountCents + centralPayout.amountCents;
    expect(total).toBe(amountCents);
    
    // Ningún importe puede ser negativo
    expect(ambPayout.amountCents).toBeGreaterThan(0);
    expect(cmPayout.amountCents).toBeGreaterThan(0);
    expect(centralPayout.amountCents).toBeGreaterThan(0);
    
    expect(docData.status).toBe("completed");
  });
});
