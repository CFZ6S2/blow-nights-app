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
const { mockDocSnap, mockQuerySnap } = require("./helpers/mocks");
const tickets = require("../modules/tickets");

const OWNER_AUTH = { uid: "owner1", token: {} };
const ADMIN_AUTH = { uid: "admin1", token: { role: "admin" } };
const STRANGER_AUTH = { uid: "stranger1", token: {} };

describe("validateTicket", () => {
  beforeEach(() => jest.clearAllMocks());

  const call = (data, auth = OWNER_AUTH) => tickets.validateTicket({ data, auth });

  test("rejects unauthenticated requests", async () => {
    await expect(call({ qrToken: "abc" }, null))
      .rejects.toMatchObject({ code: "unauthenticated" });
  });

  test("rejects missing qrToken", async () => {
    await expect(call({})).rejects.toMatchObject({ code: "invalid-argument" });
  });

  test("rejects when ticket not found", async () => {
    const ticketQuery = {
      where: () => ticketQuery,
      limit: () => ({ get: jest.fn(async () => mockQuerySnap([])) }),
    };
    mockDb.collection = jest.fn((path) => {
      if (path === "tickets") return ticketQuery;
      const { buildDb } = require("./helpers/mocks");
      return buildDb().collection(path);
    });

    await expect(call({ qrToken: "nonexistent" }))
      .rejects.toMatchObject({ code: "not-found" });
  });

  test("rejects when caller is not venue owner and not admin", async () => {
    const ticketSnap = mockDocSnap(
      { qrToken: "tok1", venueId: "v1", status: "valid", userId: "buyer1", ticketType: "vip" },
      "t1", "tickets/t1"
    );
    const venueSnap = mockDocSnap({ ownerId: "owner1" }, "v1", "venues/v1");

    const secretSnap = mockDocSnap({ qrToken: "tok1" }, "secrets", "tickets/t1/private/secrets");
    secretSnap.ref.parent = { parent: { get: jest.fn(async () => ticketSnap) } };

    const secretQuery = {
      where: () => secretQuery,
      limit: () => ({ get: jest.fn(async () => mockQuerySnap([secretSnap])) }),
    };
    mockDb.collectionGroup = jest.fn((id) => {
      if (id === "private") return secretQuery;
      return { where: () => ({ limit: () => ({ get: jest.fn(async () => mockQuerySnap([])) }) }) };
    });
    mockDb.collection = jest.fn((path) => {
      if (path === "venues") return { doc: jest.fn(() => ({ get: jest.fn(async () => venueSnap) })) };
      const { buildDb } = require("./helpers/mocks");
      return buildDb().collection(path);
    });

    await expect(call({ qrToken: "tok1" }, STRANGER_AUTH))
      .rejects.toMatchObject({ code: "permission-denied" });
  });

  test("allows admin to validate tickets from any venue", async () => {
    const ticketSnap = mockDocSnap(
      { qrToken: "tok1", venueId: "v1", status: "valid", userId: "buyer1", ticketType: "vip" },
      "t1", "tickets/t1"
    );
    const venueSnap = mockDocSnap({ ownerId: "owner1" }, "v1", "venues/v1");
    const userSnap = mockDocSnap({ nick: "Buyer", fotoUrl: "https://photo.jpg" }, "buyer1", "users/buyer1");

    const secretSnap = mockDocSnap({ qrToken: "tok1" }, "secrets", "tickets/t1/private/secrets");
    secretSnap.ref.parent = { parent: { get: jest.fn(async () => ticketSnap) } };

    const secretQuery = {
      where: () => secretQuery,
      limit: () => ({ get: jest.fn(async () => mockQuerySnap([secretSnap])) }),
    };
    mockDb.collectionGroup = jest.fn((id) => {
      if (id === "private") return secretQuery;
      return { where: () => ({ limit: () => ({ get: jest.fn(async () => mockQuerySnap([])) }) }) };
    });
    mockDb.collection = jest.fn((path) => {
      if (path === "venues") return { doc: jest.fn(() => ({ get: jest.fn(async () => venueSnap) })) };
      if (path === "users") return { doc: jest.fn(() => ({ get: jest.fn(async () => userSnap) })) };
      const { buildDb } = require("./helpers/mocks");
      return buildDb().collection(path);
    });

    mockDb.runTransaction.mockImplementation(async (fn) => {
      const freshSnap = mockDocSnap(
        { status: "valid", ticketType: "vip", userId: "buyer1" },
        "t1", "tickets/t1"
      );
      const tx = { get: jest.fn(async () => freshSnap), update: jest.fn() };
      return fn(tx);
    });

    const result = await call({ qrToken: "tok1" }, ADMIN_AUTH);

    expect(result.valid).toBe(true);
    expect(result.ticket.userName).toBe("Buyer");
    expect(result.ticket.userPhoto).toBe("https://photo.jpg");
  });

  test("marks valid ticket as used and returns user info", async () => {
    const ticketSnap = mockDocSnap(
      { qrToken: "tok1", venueId: "v1", status: "valid", userId: "buyer1", ticketType: "general" },
      "t1", "tickets/t1"
    );
    const venueSnap = mockDocSnap({ ownerId: "owner1" }, "v1", "venues/v1");
    const userSnap = mockDocSnap({ nick: "Carlos", fotoUrl: "https://pic.jpg" }, "buyer1", "users/buyer1");

    const secretSnap = mockDocSnap({ qrToken: "tok1" }, "secrets", "tickets/t1/private/secrets");
    secretSnap.ref.parent = { parent: { get: jest.fn(async () => ticketSnap) } };

    const secretQuery = {
      where: () => secretQuery,
      limit: () => ({ get: jest.fn(async () => mockQuerySnap([secretSnap])) }),
    };
    mockDb.collectionGroup = jest.fn((id) => {
      if (id === "private") return secretQuery;
      return { where: () => ({ limit: () => ({ get: jest.fn(async () => mockQuerySnap([])) }) }) };
    });
    mockDb.collection = jest.fn((path) => {
      if (path === "venues") return { doc: jest.fn(() => ({ get: jest.fn(async () => venueSnap) })) };
      if (path === "users") return { doc: jest.fn(() => ({ get: jest.fn(async () => userSnap) })) };
      const { buildDb } = require("./helpers/mocks");
      return buildDb().collection(path);
    });

    let capturedTx;
    mockDb.runTransaction.mockImplementation(async (fn) => {
      const freshSnap = mockDocSnap(
        { status: "valid", ticketType: "general", userId: "buyer1" },
        "t1", "tickets/t1"
      );
      capturedTx = { get: jest.fn(async () => freshSnap), update: jest.fn() };
      return fn(capturedTx);
    });

    const result = await call({ qrToken: "tok1" });

    expect(result).toEqual({
      valid: true,
      message: "Entrada válida. Acceso permitido.",
      ticket: {
        id: "t1",
        ticketType: "general",
        userName: "Carlos",
        userPhoto: "https://pic.jpg",
      },
    });

    expect(capturedTx.update).toHaveBeenCalledWith(
      ticketSnap.ref,
      expect.objectContaining({
        status: "used",
        usedAt: "TIMESTAMP",
        validatedBy: "owner1",
      })
    );
  });

  test("rejects already-used ticket", async () => {
    const ticketSnap = mockDocSnap(
      { qrToken: "tok1", venueId: "v1", status: "used", userId: "buyer1", ticketType: "vip" },
      "t1", "tickets/t1"
    );
    const venueSnap = mockDocSnap({ ownerId: "owner1" }, "v1", "venues/v1");

    const secretSnap = mockDocSnap({ qrToken: "tok1" }, "secrets", "tickets/t1/private/secrets");
    secretSnap.ref.parent = { parent: { get: jest.fn(async () => ticketSnap) } };

    const secretQuery = {
      where: () => secretQuery,
      limit: () => ({ get: jest.fn(async () => mockQuerySnap([secretSnap])) }),
    };
    mockDb.collectionGroup = jest.fn((id) => {
      if (id === "private") return secretQuery;
      return { where: () => ({ limit: () => ({ get: jest.fn(async () => mockQuerySnap([])) }) }) };
    });
    mockDb.collection = jest.fn((path) => {
      if (path === "venues") return { doc: jest.fn(() => ({ get: jest.fn(async () => venueSnap) })) };
      const { buildDb } = require("./helpers/mocks");
      return buildDb().collection(path);
    });

    mockDb.runTransaction.mockImplementation(async (fn) => {
      const freshSnap = mockDocSnap({ status: "used" }, "t1", "tickets/t1");
      const tx = { get: jest.fn(async () => freshSnap), update: jest.fn() };
      return fn(tx);
    });

    const result = await call({ qrToken: "tok1" });

    expect(result.valid).toBe(false);
    expect(result.reason).toBe("already_used");
  });

  test("rejects cancelled ticket", async () => {
    const ticketSnap = mockDocSnap(
      { qrToken: "tok1", venueId: "v1", status: "cancelled", userId: "buyer1", ticketType: "vip" },
      "t1", "tickets/t1"
    );
    const venueSnap = mockDocSnap({ ownerId: "owner1" }, "v1", "venues/v1");

    const secretSnap = mockDocSnap({ qrToken: "tok1" }, "secrets", "tickets/t1/private/secrets");
    secretSnap.ref.parent = { parent: { get: jest.fn(async () => ticketSnap) } };

    const secretQuery = {
      where: () => secretQuery,
      limit: () => ({ get: jest.fn(async () => mockQuerySnap([secretSnap])) }),
    };
    mockDb.collectionGroup = jest.fn((id) => {
      if (id === "private") return secretQuery;
      return { where: () => ({ limit: () => ({ get: jest.fn(async () => mockQuerySnap([])) }) }) };
    });
    mockDb.collection = jest.fn((path) => {
      if (path === "venues") return { doc: jest.fn(() => ({ get: jest.fn(async () => venueSnap) })) };
      const { buildDb } = require("./helpers/mocks");
      return buildDb().collection(path);
    });

    mockDb.runTransaction.mockImplementation(async (fn) => {
      const freshSnap = mockDocSnap({ status: "cancelled" }, "t1", "tickets/t1");
      const tx = { get: jest.fn(async () => freshSnap), update: jest.fn() };
      return fn(tx);
    });

    const result = await call({ qrToken: "tok1" });

    expect(result.valid).toBe(false);
    expect(result.reason).toBe("cancelled");
  });
});
