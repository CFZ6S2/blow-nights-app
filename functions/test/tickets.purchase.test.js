let mockDb, mockStripeInstance;

jest.mock("firebase-functions/v2/https", () => {
  const { HttpsError } = jest.requireActual("firebase-functions/v2/https");
  return { HttpsError, onCall: (_opts, handler) => handler };
});

let mockStripeEnabled = true;

jest.mock("../lib/init", () => {
  const { buildDb, mockStripe } = require("./helpers/mocks");
  mockDb = buildDb();
  mockStripeInstance = mockStripe();
  return {
    admin: {
      firestore: { FieldValue: { serverTimestamp: () => "TIMESTAMP", increment: (n) => `INCREMENT(${n})` } },
    },
    db: mockDb,
    getStripe: () => mockStripeEnabled ? mockStripeInstance : null,
  };
});

const { HttpsError } = require("firebase-functions/v2/https");
const { mockDocSnap, mockQuerySnap } = require("./helpers/mocks");
const tickets = require("../modules/tickets");

const AUTH = { uid: "user1", token: {} };

describe("purchaseVenueTicket", () => {
  beforeEach(() => jest.clearAllMocks());

  const call = (data, auth = AUTH) => tickets.purchaseVenueTicket({ data, auth });

  test("rejects unauthenticated requests", async () => {
    await expect(call({ venueId: "v1", ticketType: "vip" }, null))
      .rejects.toThrow(HttpsError);
    await expect(call({ venueId: "v1", ticketType: "vip" }, null))
      .rejects.toMatchObject({ code: "unauthenticated" });
  });

  test("rejects missing params", async () => {
    await expect(call({})).rejects.toMatchObject({ code: "invalid-argument" });
    await expect(call({ venueId: "v1" })).rejects.toMatchObject({ code: "invalid-argument" });
  });

  test("rejects when Stripe is not configured", async () => {
    mockStripeEnabled = false;

    await expect(call({ venueId: "v1", ticketType: "vip" }))
      .rejects.toMatchObject({ code: "failed-precondition" });

    mockStripeEnabled = true;
  });

  test("rejects when venue not found", async () => {
    mockDb.collection("venues").doc("v1").get.mockResolvedValue(
      mockDocSnap(null, "v1", "venues/v1")
    );

    await expect(call({ venueId: "v1", ticketType: "vip" }))
      .rejects.toMatchObject({ code: "not-found" });
  });

  test("rejects when ticket type not found in pricing", async () => {
    mockDb.collection("venues").doc("v1").get.mockResolvedValue(
      mockDocSnap({ name: "Club X", ticketPricing: {}, stripeAccountId: "acct_123" }, "v1", "venues/v1")
    );

    await expect(call({ venueId: "v1", ticketType: "vip" }))
      .rejects.toMatchObject({ code: "not-found" });
  });

  test("rejects when venue has no stripeAccountId", async () => {
    mockDb.collection("venues").doc("v1").get.mockResolvedValue(
      mockDocSnap({
        name: "Club X",
        ticketPricing: { vip: { amount: 1500, name: "VIP" } },
        stripeAccountId: null,
      }, "v1", "venues/v1")
    );

    await expect(call({ venueId: "v1", ticketType: "vip" }))
      .rejects.toMatchObject({ code: "failed-precondition" });
  });

  test("creates Stripe checkout with correct params and returns session", async () => {
    mockDb.collection("venues").doc("v1").get.mockResolvedValue(
      mockDocSnap({
        name: "Club X",
        ticketPricing: { vip: { amount: 1500, name: "VIP" } },
        stripeAccountId: "acct_venue_1",
      }, "v1", "venues/v1")
    );

    const result = await call({ venueId: "v1", ticketType: "vip", origin: "https://app.com" });

    expect(result).toEqual({ sessionId: "cs_test_123", url: "https://checkout.stripe.com/pay/cs_test_123" });

    expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: [expect.objectContaining({
          price_data: expect.objectContaining({
            currency: "eur",
            unit_amount: 1500,
            product_data: { name: "Club X - VIP" },
          }),
          quantity: 1,
        })],
        payment_intent_data: { application_fee_amount: 100 },
        metadata: expect.objectContaining({
          firebaseUID: "user1",
          venueId: "v1",
          ticketType: "vip",
          type: "ticket",
        }),
      }),
      { stripeAccount: "acct_venue_1" }
    );
  });
});

describe("purchaseIndependentEventTicket", () => {
  beforeEach(() => jest.clearAllMocks());

  const call = (data, auth = AUTH) => tickets.purchaseIndependentEventTicket({ data, auth });

  test("rejects unauthenticated requests", async () => {
    await expect(call({ eventId: "e1", ticketType: "general" }, null))
      .rejects.toMatchObject({ code: "unauthenticated" });
  });

  test("rejects missing params", async () => {
    await expect(call({})).rejects.toMatchObject({ code: "invalid-argument" });
  });

  test("rejects sold-out tier", async () => {
    const eventSnap = mockDocSnap({
      title: "Fiesta",
      organizerId: "org1",
      ticket_tiers: [{ id: "general", name: "General", price: 15, quota: 50, sold: 50 }],
    }, "e1", "events/e1");

    mockDb.runTransaction.mockImplementation(async (fn) => {
      const tx = { get: jest.fn(async () => eventSnap), update: jest.fn() };
      return fn(tx);
    });

    await expect(call({ eventId: "e1", ticketType: "general" }))
      .rejects.toMatchObject({ code: "resource-exhausted" });
  });

  test("creates checkout and increments sold count", async () => {
    const eventSnap = mockDocSnap({
      title: "Fiesta",
      organizerId: "org1",
      ticket_tiers: [{ id: "general", name: "General", price: 15, quota: 100, sold: 10 }],
    }, "e1", "events/e1");

    let capturedTx;
    mockDb.runTransaction.mockImplementation(async (fn) => {
      capturedTx = { get: jest.fn(async () => eventSnap), update: jest.fn() };
      return fn(capturedTx);
    });

    mockDb.collection("users").doc("org1").get.mockResolvedValue(
      mockDocSnap({ stripeAccountId: "acct_org_1" }, "org1", "users/org1")
    );

    const result = await call({ eventId: "e1", ticketType: "general", origin: "https://app.com" });

    expect(result.sessionId).toBe("cs_test_123");

    expect(capturedTx.update).toHaveBeenCalledWith(
      eventSnap.ref,
      { ticket_tiers: [{ id: "general", name: "General", price: 15, quota: 100, sold: 11 }] }
    );

    expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [expect.objectContaining({
          price_data: expect.objectContaining({ unit_amount: 1500 }),
        })],
        payment_intent_data: { application_fee_amount: 100 },
        metadata: expect.objectContaining({ isIndependent: "true" }),
      }),
      { stripeAccount: "acct_org_1" }
    );
  });

  test("rejects when organizer has no Stripe account", async () => {
    const eventSnap = mockDocSnap({
      title: "Fiesta",
      organizerId: "org1",
      ticket_tiers: [{ id: "general", name: "General", price: 15, quota: 100, sold: 0 }],
    }, "e1", "events/e1");

    mockDb.runTransaction.mockImplementation(async (fn) => {
      const tx = { get: jest.fn(async () => eventSnap), update: jest.fn() };
      return fn(tx);
    });

    mockDb.collection("users").doc("org1").get.mockResolvedValue(
      mockDocSnap({ stripeAccountId: null }, "org1", "users/org1")
    );

    await expect(call({ eventId: "e1", ticketType: "general", origin: "https://app.com" }))
      .rejects.toMatchObject({ code: "failed-precondition" });
  });
});
