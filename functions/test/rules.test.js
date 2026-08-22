const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require("@firebase/rules-unit-testing");
const { readFileSync } = require("fs");
const { resolve } = require("path");

const PROJECT_ID = "blow-nights-rules-test";
const RULES = readFileSync(resolve(__dirname, "../../firestore.rules"), "utf8");

let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: RULES },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

function authedDb(uid, claims = {}) {
  return testEnv.authenticatedContext(uid, claims).firestore();
}

function unauthDb() {
  return testEnv.unauthenticatedContext().firestore();
}

function adminDb() {
  return authedDb("admin-uid", { role: "admin" });
}

async function seed(fn) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await fn(ctx.firestore());
  });
}

// ── Users ──

describe("users", () => {
  test("unauthenticated user cannot read profiles", async () => {
    const db = unauthDb();
    await assertFails(db.collection("users").doc("user1").get());
  });

  test("authenticated user can read another profile", async () => {
    await seed(async (db) => { await db.collection("users").doc("user1").set({ nick: "test" }); });

    const db = authedDb("user2");
    await assertSucceeds(db.collection("users").doc("user1").get());
  });

  test("user can update own profile with safe fields", async () => {
    await seed(async (db) => { await db.collection("users").doc("user1").set({ nick: "old", edad: 21 }); });

    const db = authedDb("user1");
    await assertSucceeds(db.collection("users").doc("user1").update({ nick: "new" }));
  });

  test("user cannot set own role", async () => {
    await seed(async (db) => { await db.collection("users").doc("user1").set({ nick: "test" }); });

    const db = authedDb("user1");
    await assertFails(db.collection("users").doc("user1").update({ role: "admin" }));
  });

  test("user cannot set own premium", async () => {
    await seed(async (db) => { await db.collection("users").doc("user1").set({ nick: "test" }); });

    const db = authedDb("user1");
    await assertFails(db.collection("users").doc("user1").update({ premium: true }));
  });

  test("user cannot set isAdmin", async () => {
    await seed(async (db) => { await db.collection("users").doc("user1").set({ nick: "test" }); });

    const db = authedDb("user1");
    await assertFails(db.collection("users").doc("user1").update({ isAdmin: true }));
  });

  test("user cannot update another user's profile", async () => {
    await seed(async (db) => { await db.collection("users").doc("user2").set({ nick: "test" }); });

    const db = authedDb("user1");
    await assertFails(db.collection("users").doc("user2").update({ nick: "hacked" }));
  });

  test("admin can update any profile", async () => {
    await seed(async (db) => { await db.collection("users").doc("user1").set({ nick: "test" }); });
    const admin = adminDb();
    await assertSucceeds(admin.collection("users").doc("user1").update({ nick: "admin-edit" }));
  });

  test("list query limited to 20", async () => {
    const db = authedDb("user1");
    await assertFails(db.collection("users").limit(21).get());
  });

  test("list query up to 20 succeeds", async () => {
    const db = authedDb("user1");
    await assertSucceeds(db.collection("users").limit(20).get());
  });

  test("user cannot set age under 18", async () => {
    await seed(async (db) => { await db.collection("users").doc("user1").set({ nick: "test", edad: 20 }); });

    const db = authedDb("user1");
    await assertFails(db.collection("users").doc("user1").update({ edad: 17 }));
  });

  test("user can set age 18+", async () => {
    await seed(async (db) => { await db.collection("users").doc("user1").set({ nick: "test", edad: 20 }); });

    const db = authedDb("user1");
    await assertSucceeds(db.collection("users").doc("user1").update({ edad: 18 }));
  });
});

// ── Matches ──

describe("matches", () => {
  test("only participants can read matches", async () => {
    await seed(async (db) => { await db.collection("matches").doc("m1").set({ users: ["u1", "u2"] }); });

    const db1 = authedDb("u1");
    await assertSucceeds(db1.collection("matches").doc("m1").get());

    const db3 = authedDb("u3");
    await assertFails(db3.collection("matches").doc("m1").get());
  });

  test("clients cannot create matches", async () => {
    const db = authedDb("u1");
    await assertFails(db.collection("matches").doc("m1").set({ users: ["u1", "u2"] }));
  });
});

// ── Verifications ──

describe("verifications", () => {
  test("user can create own verification with pending status", async () => {
    const db = authedDb("user1");
    await assertSucceeds(
      db.collection("verifications").doc("user1").set({
        status: "pending",
        photoUrl: "https://example.com/photo.jpg",
      })
    );
  });

  test("user cannot create verification with approved status", async () => {
    const db = authedDb("user1");
    await assertFails(
      db.collection("verifications").doc("user1").set({
        status: "approved",
        photoUrl: "https://example.com/photo.jpg",
      })
    );
  });

  test("user cannot update own verification", async () => {
    await seed(async (db) => { await db.collection("verifications").doc("user1").set({ status: "pending" }); });

    const db = authedDb("user1");
    await assertFails(db.collection("verifications").doc("user1").update({ status: "approved" }));
  });

  test("admin can update verification", async () => {
    await seed(async (db) => { await db.collection("verifications").doc("user1").set({ status: "pending" }); });
    const admin = adminDb();
    await assertSucceeds(admin.collection("verifications").doc("user1").update({ status: "approved" }));
  });
});

// ── Chills ──

describe("chills", () => {
  test("anyone can read a chill by ID", async () => {
    await seed(async (db) => {
      await db.collection("chills").doc("c1").set({ host_uid: "host1", title: "Test Chill", accepted_users: [] });
    });

    const db = unauthDb();
    await assertSucceeds(db.collection("chills").doc("c1").get());
  });

  test("only authenticated users can list chills", async () => {
    await assertFails(unauthDb().collection("chills").get());
    await assertSucceeds(authedDb("u1").collection("chills").get());
  });

  test("premium user can create a chill as host", async () => {
    const db = authedDb("host1", { premium: true });
    await assertSucceeds(
      db.collection("chills").doc("c1").set({
        host_uid: "host1",
        title: "My Chill",
        accepted_users: [],
        pending_users: [],
        denied_users: [],
        status: "active",
      })
    );
  });

  test("non-premium user without pass cannot create a chill", async () => {
    const db = authedDb("host1");
    await assertFails(
      db.collection("chills").doc("c1").set({
        host_uid: "host1",
        title: "My Chill",
        accepted_users: [],
      })
    );
  });

  test("user cannot create chill as another host", async () => {
    const db = authedDb("host1", { premium: true });
    await assertFails(
      db.collection("chills").doc("c1").set({
        host_uid: "host2",
        title: "Spoofed",
        accepted_users: [],
      })
    );
  });

  test("only host can update a chill", async () => {
    await seed(async (db) => {
      await db.collection("chills").doc("c1").set({ host_uid: "host1", title: "Test", accepted_users: [] });
    });

    const hostDb = authedDb("host1");
    await assertSucceeds(hostDb.collection("chills").doc("c1").update({ title: "Updated" }));

    const otherDb = authedDb("other");
    await assertFails(otherDb.collection("chills").doc("c1").update({ title: "Hacked" }));
  });
});

// ── Chills Private Subcollection ──

describe("chills/private", () => {
  beforeEach(async () => {
    await seed(async (db) => {
      await db.collection("chills").doc("c1").set({ host_uid: "host1", accepted_users: ["u1"] });
      await db.collection("chills").doc("c1").collection("private").doc("info").set({ exact_address: "Calle Test 123" });
    });
  });

  test("host can read private info", async () => {
    const db = authedDb("host1");
    await assertSucceeds(db.collection("chills").doc("c1").collection("private").doc("info").get());
  });

  test("accepted user can read private info", async () => {
    const db = authedDb("u1");
    await assertSucceeds(db.collection("chills").doc("c1").collection("private").doc("info").get());
  });

  test("non-accepted user cannot read private info", async () => {
    const db = authedDb("u2");
    await assertFails(db.collection("chills").doc("c1").collection("private").doc("info").get());
  });

  test("no client can write to private subcollection", async () => {
    const db = authedDb("host1");
    await assertFails(
      db.collection("chills").doc("c1").collection("private").doc("info").set({ exact_address: "hacked" })
    );
  });
});

// ── Chill Requests ──

describe("chill_requests", () => {
  test("anyone can read a chill request by ID", async () => {
    await seed(async (db) => {
      await db.collection("chill_requests").doc("r1").set({ user_uid: "u1", chill_id: "c1", status: "pending" });
    });

    const db = unauthDb();
    await assertSucceeds(db.collection("chill_requests").doc("r1").get());
  });

  test("listing chill_requests is denied", async () => {
    const db = authedDb("u1");
    await assertFails(db.collection("chill_requests").get());
  });

  test("user can create own request", async () => {
    const db = authedDb("u1");
    await assertSucceeds(
      db.collection("chill_requests").doc("r1").set({ user_uid: "u1", chill_id: "c1", status: "pending" })
    );
  });

  test("user cannot create request as another user", async () => {
    const db = authedDb("u1");
    await assertFails(
      db.collection("chill_requests").doc("r1").set({ user_uid: "u2", chill_id: "c1", status: "pending" })
    );
  });

  test("owner can update/delete own request", async () => {
    await seed(async (db) => {
      await db.collection("chill_requests").doc("r1").set({ user_uid: "u1", status: "pending" });
    });

    const db = authedDb("u1");
    await assertSucceeds(db.collection("chill_requests").doc("r1").update({ status: "cancelled" }));
    await assertSucceeds(db.collection("chill_requests").doc("r1").delete());
  });

  test("other user cannot update/delete request", async () => {
    await seed(async (db) => {
      await db.collection("chill_requests").doc("r1").set({ user_uid: "u1", status: "pending" });
    });

    const db = authedDb("u2");
    await assertFails(db.collection("chill_requests").doc("r1").update({ status: "accepted" }));
    await assertFails(db.collection("chill_requests").doc("r1").delete());
  });
});

// ── Tickets ──

describe("tickets", () => {
  beforeEach(async () => {
    await seed(async (db) => {
      await db.collection("tickets").doc("t1").set({ userId: "u1", venueOwnerId: "v1", eventId: "e1" });
    });
  });

  test("ticket owner can read own ticket", async () => {
    const db = authedDb("u1");
    await assertSucceeds(db.collection("tickets").doc("t1").get());
  });

  test("venue owner can read ticket", async () => {
    const db = authedDb("v1");
    await assertSucceeds(db.collection("tickets").doc("t1").get());
  });

  test("unrelated user cannot read ticket", async () => {
    const db = authedDb("stranger");
    await assertFails(db.collection("tickets").doc("t1").get());
  });

  test("clients cannot create tickets", async () => {
    const db = authedDb("u1");
    await assertFails(db.collection("tickets").doc("t2").set({ userId: "u1", venueOwnerId: "v1" }));
  });
});

// ── Partner Applications ──

describe("partner_applications", () => {
  test("user can create own application", async () => {
    const db = authedDb("u1");
    await assertSucceeds(
      db.collection("partner_applications").doc("app1").set({ userId: "u1", message: "I want to be a partner" })
    );
  });

  test("user cannot create application for another user", async () => {
    const db = authedDb("u1");
    await assertFails(
      db.collection("partner_applications").doc("app1").set({ userId: "u2", message: "Spoofed" })
    );
  });

  test("user can read own application", async () => {
    await seed(async (db) => { await db.collection("partner_applications").doc("app1").set({ userId: "u1" }); });

    const db = authedDb("u1");
    await assertSucceeds(db.collection("partner_applications").doc("app1").get());
  });

  test("user cannot update/delete own application", async () => {
    await seed(async (db) => { await db.collection("partner_applications").doc("app1").set({ userId: "u1" }); });

    const db = authedDb("u1");
    await assertFails(db.collection("partner_applications").doc("app1").update({ status: "approved" }));
    await assertFails(db.collection("partner_applications").doc("app1").delete());
  });
});

// ── Promotions ──

describe("promotions", () => {
  test("any authenticated user can read promotions", async () => {
    await seed(async (db) => {
      await db.collection("promotions").doc("p1").set({ venueOwnerId: "v1", cityId: "madrid" });
    });

    const db = authedDb("u1");
    await assertSucceeds(db.collection("promotions").doc("p1").get());
  });

  test("venue owner can create promotion", async () => {
    const db = authedDb("v1");
    await assertSucceeds(
      db.collection("promotions").doc("p1").set({ venueOwnerId: "v1", cityId: "madrid", title: "Happy Hour" })
    );
  });

  test("venue owner can delete own promotion", async () => {
    await seed(async (db) => {
      await db.collection("promotions").doc("p1").set({ venueOwnerId: "v1", cityId: "madrid" });
    });

    const db = authedDb("v1");
    await assertSucceeds(db.collection("promotions").doc("p1").delete());
  });

  test("other user cannot delete promotion", async () => {
    await seed(async (db) => {
      await db.collection("promotions").doc("p1").set({ venueOwnerId: "v1", cityId: "madrid" });
    });

    const db = authedDb("u1");
    await assertFails(db.collection("promotions").doc("p1").delete());
  });
});

// ── Settings ──

describe("settings", () => {
  test("anyone can read platform settings", async () => {
    await seed(async (db) => { await db.collection("settings").doc("platform").set({ maintenance: false }); });

    const db = unauthDb();
    await assertSucceeds(db.collection("settings").doc("platform").get());
  });

  test("non-admin cannot write settings", async () => {
    await seed(async (db) => { await db.collection("settings").doc("platform").set({ maintenance: false }); });

    const db = authedDb("u1");
    await assertFails(db.collection("settings").doc("platform").update({ maintenance: true }));
  });
});
