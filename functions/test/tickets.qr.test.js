let mockDb;

jest.mock("firebase-functions/v2/https", () => {
  const { HttpsError } = jest.requireActual("firebase-functions/v2/https");
  return { HttpsError, onCall: (_opts, handler) => handler };
});

jest.mock("../lib/init", () => {
  const { buildDb } = require("./helpers/mocks");
  mockDb = buildDb();
  return {
    admin: {
      firestore: { FieldValue: { serverTimestamp: () => "TIMESTAMP", increment: (n) => `INCREMENT(${n})` } },
    },
    db: mockDb,
    getStripe: () => null,
  };
});

const { HttpsError } = require("firebase-functions/v2/https");
const { mockDocSnap, mockQuerySnap, mockCountSnap } = require("./helpers/mocks");
const tickets = require("../modules/tickets");

describe("generateOrganizerQRTicket", () => {
  beforeEach(() => jest.clearAllMocks());

  const AUTH = { uid: "org1", token: {} };
  const call = (data, auth = AUTH) => tickets.generateOrganizerQRTicket({ data, auth });

  test("rejects unauthenticated requests", async () => {
    await expect(call({ eventId: "e1" }, null))
      .rejects.toMatchObject({ code: "unauthenticated" });
  });

  test("rejects missing eventId", async () => {
    await expect(call({})).rejects.toMatchObject({ code: "invalid-argument" });
  });

  test("rejects when event not found", async () => {
    mockDb.collection("events").doc("e1").get.mockResolvedValue(
      mockDocSnap(null, "e1", "events/e1")
    );

    await expect(call({ eventId: "e1" })).rejects.toMatchObject({ code: "not-found" });
  });

  test("rejects when caller is not the organizer", async () => {
    mockDb.collection("events").doc("e1").get.mockResolvedValue(
      mockDocSnap({ organizerId: "someone_else", cityId: "bcn" }, "e1", "events/e1")
    );

    await expect(call({ eventId: "e1" })).rejects.toMatchObject({ code: "permission-denied" });
  });

  test("rejects when qr_quota is exhausted", async () => {
    mockDb.collection("events").doc("e1").get.mockResolvedValue(
      mockDocSnap({ organizerId: "org1", cityId: "bcn", title: "Party" }, "e1", "events/e1")
    );

    const quotaSnap = mockDocSnap({ qr_quota: 0 }, "org1", "users/org1");
    mockDb.runTransaction.mockImplementation(async (fn) => {
      const tx = { get: jest.fn(async () => quotaSnap), update: jest.fn(), set: jest.fn() };
      return fn(tx);
    });

    await expect(call({ eventId: "e1" })).rejects.toMatchObject({ code: "resource-exhausted" });
  });

  test("generates ticket, decrements quota, and returns token", async () => {
    mockDb.collection("events").doc("e1").get.mockResolvedValue(
      mockDocSnap({
        organizerId: "org1",
        cityId: "bcn",
        title: "Summer Party",
        date: "2026-08-25",
        time: "23:00",
        flyerUrl: "https://storage/flyer.jpg",
      }, "e1", "events/e1")
    );

    const quotaSnap = mockDocSnap({ qr_quota: 5 }, "org1", "users/org1");
    let capturedTx;
    mockDb.runTransaction.mockImplementation(async (fn) => {
      capturedTx = { get: jest.fn(async () => quotaSnap), update: jest.fn(), set: jest.fn() };
      return fn(capturedTx);
    });

    const result = await call({ eventId: "e1", clientName: "Juan", tierId: "vip" });

    expect(result.success).toBe(true);
    expect(result.ticketId).toBeDefined();
    expect(result.qrToken).toBeDefined();
    expect(result.qrToken).toHaveLength(64);
    expect(result.clientName).toBe("Juan");

    expect(capturedTx.update).toHaveBeenCalledWith(
      expect.anything(),
      { qr_quota: 4 }
    );

    expect(capturedTx.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventId: "e1",
        channel: "organizer_direct",
        client_name: "Juan",
        ticketType: "vip",
        status: "valid",
        isIndependent: true,
      })
    );
  });

  test("defaults clientName to 'Invitado' and tierId to 'general'", async () => {
    mockDb.collection("events").doc("e1").get.mockResolvedValue(
      mockDocSnap({ organizerId: "org1", cityId: "bcn", title: "Party" }, "e1", "events/e1")
    );

    const quotaSnap = mockDocSnap({ qr_quota: 3 }, "org1", "users/org1");
    let capturedTx;
    mockDb.runTransaction.mockImplementation(async (fn) => {
      capturedTx = { get: jest.fn(async () => quotaSnap), update: jest.fn(), set: jest.fn() };
      return fn(capturedTx);
    });

    const result = await call({ eventId: "e1" });

    expect(result.clientName).toBe("Invitado");
    expect(capturedTx.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        ticketType: "general",
        client_name: "Invitado",
        tierName: "Entrada General",
      })
    );
  });
});

describe("generateDirectPromoterTicket", () => {
  beforeEach(() => jest.clearAllMocks());

  const call = (data) => tickets.generateDirectPromoterTicket({ data });

  test("rejects missing params", async () => {
    await expect(call({})).rejects.toMatchObject({ code: "invalid-argument" });
    await expect(call({ promoterToken: "tok" })).rejects.toMatchObject({ code: "invalid-argument" });
  });

  test("rejects invalid promoter token", async () => {
    const queryResult = mockQuerySnap([]);
    mockDb.collectionGroup = jest.fn(() => ({
      where: () => ({
        where: () => ({
          limit: () => ({
            get: jest.fn(async () => queryResult),
          }),
        }),
      }),
    }));

    await expect(call({ promoterToken: "bad_token", eventId: "e1" }))
      .rejects.toMatchObject({ code: "permission-denied" });
  });

  test("rejects when max tickets reached", async () => {
    const promoterSnap = mockDocSnap(
      { access_token: "tok1", is_closed: false, name: "Pedro", max_tickets: 10, userId: "u1" },
      "promo1",
      "events/e1/promoters/promo1"
    );

    mockDb.collectionGroup = jest.fn(() => ({
      where: () => ({
        where: () => ({
          limit: () => ({
            get: jest.fn(async () => mockQuerySnap([promoterSnap])),
          }),
        }),
      }),
    }));

    const countQuery = {
      where: () => countQuery,
      count: () => ({ get: jest.fn(async () => mockCountSnap(10)) }),
    };
    mockDb.collection = jest.fn((path) => {
      if (path === "tickets") return { ...countQuery, doc: jest.fn() };
      const { buildDb } = require("./helpers/mocks");
      return buildDb().collection(path);
    });

    await expect(call({ promoterToken: "tok1", eventId: "e1" }))
      .rejects.toMatchObject({ code: "resource-exhausted" });
  });

  test("generates ticket for independent event promoter", async () => {
    const promoterSnap = mockDocSnap(
      { access_token: "tok1", is_closed: false, name: "Pedro", max_tickets: 100, userId: "u1" },
      "promo1",
      "events/e1/promoters/promo1"
    );

    mockDb.collectionGroup = jest.fn(() => ({
      where: () => ({
        where: () => ({
          limit: () => ({
            get: jest.fn(async () => mockQuerySnap([promoterSnap])),
          }),
        }),
      }),
    }));

    const autoTicketRef = { 
      id: "ticket_auto_1", 
      path: "tickets/ticket_auto_1",
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({ path: "tickets/ticket_auto_1/private/secrets" }))
      }))
    };

    const countQuery = {
      where: () => countQuery,
      count: () => ({ get: jest.fn(async () => mockCountSnap(5)) }),
    };

    const eventSnap = mockDocSnap(
      { title: "Fiesta BCN", cityId: "bcn", date: "2026-09-01", time: "22:00", ownerId: "owner1" },
      "e1",
      "events/e1"
    );

    const quotaSnap = mockDocSnap({ qr_quota: 10 }, "u1", "users/u1");

    let capturedTx;
    mockDb.collection = jest.fn((path) => {
      if (path === "tickets") {
        return {
          ...countQuery,
          doc: jest.fn(() => autoTicketRef),
        };
      }
      if (path === "events") {
        return {
          doc: jest.fn(() => ({
            get: jest.fn(async () => eventSnap),
            id: "e1",
            path: "events/e1",
          })),
        };
      }
      if (path === "users") {
        return {
          doc: jest.fn(() => ({
            get: jest.fn(async () => quotaSnap),
            id: "u1",
            path: "users/u1",
          })),
        };
      }
      const { buildDb } = require("./helpers/mocks");
      return buildDb().collection(path);
    });

    mockDb.runTransaction.mockImplementation(async (fn) => {
      capturedTx = {
        get: jest.fn(async () => quotaSnap),
        update: jest.fn(),
        set: jest.fn(),
      };
      return fn(capturedTx);
    });

    const result = await call({
      promoterToken: "tok1",
      eventId: "e1",
      clientName: "Maria",
      tierId: "vip",
    });

    expect(result.success).toBe(true);
    expect(result.qrToken).toBeDefined();
    expect(result.clientName).toBe("Maria");

    expect(capturedTx.update).toHaveBeenCalledWith(
      expect.anything(),
      { qr_quota: 9 }
    );

    expect(capturedTx.set).toHaveBeenCalledWith(
      autoTicketRef,
      expect.objectContaining({
        channel: "rrpp_direct",
        rrpp_id: "promo1",
        promoter_name: "Pedro",
        client_name: "Maria",
        status: "valid",
      })
    );
  });
});
