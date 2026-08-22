const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require("@firebase/rules-unit-testing");
const { readFileSync } = require("fs");
const { resolve } = require("path");

const PROJECT_ID = "blow-nights-isolation-test";
const RULES = readFileSync(resolve(__dirname, "../../firestore.rules"), "utf8");

let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: RULES, host: "127.0.0.1", port: 8080 },
  });
}, 30000);

afterAll(async () => {
  await testEnv.cleanup();
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

function authedDb(uid, claims = {}) {
  return testEnv.authenticatedContext(uid, claims).firestore();
}

async function seed(fn) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await fn(ctx.firestore());
  });
}

// ── Venue Owner A → Venue B (DENIED) ──

describe("venue isolation: owner cross-access", () => {
  const VENUE_A = { name: "Club A", cityId: "madrid", ownerId: "ownerA", isActive: true };
  const VENUE_B = { name: "Club B", cityId: "madrid", ownerId: "ownerB", isActive: true };

  beforeEach(async () => {
    await seed(async (db) => {
      await db.collection("venues").doc("venueA").set(VENUE_A);
      await db.collection("venues").doc("venueB").set(VENUE_B);
    });
  });

  test("owner A can update own venue", async () => {
    const db = authedDb("ownerA");
    await assertSucceeds(db.collection("venues").doc("venueA").update({ name: "Club A Updated" }));
  });

  test("owner A CANNOT update venue B", async () => {
    const db = authedDb("ownerA");
    await assertFails(db.collection("venues").doc("venueB").update({ name: "Hacked" }));
  });

  test("owner A CANNOT delete venue B", async () => {
    const db = authedDb("ownerA");
    await assertFails(db.collection("venues").doc("venueB").delete());
  });

  test("owner A CANNOT read venue B private event data", async () => {
    await seed(async (db) => {
      await db.collection("venues").doc("venueB").collection("events").doc("e1").set({ title: "Party B" });
      await db.collection("venues").doc("venueB").collection("events").doc("e1")
        .collection("private").doc("secrets").set({ scanner_token: "SECRET" });
    });

    const db = authedDb("ownerA");
    await assertFails(
      db.collection("venues").doc("venueB").collection("events").doc("e1")
        .collection("private").doc("secrets").get()
    );
  });

  test("owner A CANNOT write to venue B events", async () => {
    await seed(async (db) => {
      await db.collection("venues").doc("venueB").set({ ...VENUE_B, subscriptionTier: "ticketing" });
      await db.collection("venues").doc("venueB").collection("events").doc("e1").set({ title: "Party B" });
    });

    const db = authedDb("ownerA");
    await assertFails(
      db.collection("venues").doc("venueB").collection("events").doc("e1").update({ title: "Hijacked" })
    );
  });

  test("owner A CANNOT manage venue B promoters", async () => {
    await seed(async (db) => {
      await db.collection("venues").doc("venueB").collection("events").doc("e1")
        .collection("promoters").doc("p1").set({ userId: "rrpp1", name: "RRPP", code: "ABC" });
    });

    const db = authedDb("ownerA");
    await assertFails(
      db.collection("venues").doc("venueB").collection("events").doc("e1")
        .collection("promoters").doc("p1").get()
    );
  });
});

// ── City Manager Madrid → Venue Barcelona (DENIED) ──

describe("cityManager cross-city isolation", () => {
  beforeEach(async () => {
    await seed(async (db) => {
      await db.collection("cities").doc("madrid").set({ name: "Madrid" });
      await db.collection("cities").doc("barcelona").set({ name: "Barcelona" });
      await db.collection("venues").doc("vMadrid").set({ name: "Madrid Club", cityId: "madrid", ownerId: "ownerM" });
      await db.collection("venues").doc("vBarcelona").set({ name: "BCN Club", cityId: "barcelona", ownerId: "ownerB" });
      await db.collection("cities").doc("madrid").collection("earnings").doc("e1").set({ amount: 100 });
      await db.collection("cities").doc("barcelona").collection("earnings").doc("e1").set({ amount: 200 });
    });
  });

  test("CM Madrid can read Madrid earnings", async () => {
    const db = authedDb("cmMadrid", { role: "cityAdmin", cityId: "madrid" });
    await assertSucceeds(db.collection("cities").doc("madrid").collection("earnings").doc("e1").get());
  });

  test("CM Madrid CANNOT read Barcelona earnings", async () => {
    const db = authedDb("cmMadrid", { role: "cityAdmin", cityId: "madrid" });
    await assertFails(db.collection("cities").doc("barcelona").collection("earnings").doc("e1").get());
  });

  test("CM Madrid CANNOT update Barcelona venue", async () => {
    const db = authedDb("cmMadrid", { role: "cityAdmin", cityId: "madrid" });
    await assertFails(db.collection("venues").doc("vBarcelona").update({ name: "Hijacked" }));
  });

  test("CM Madrid can update Madrid venue", async () => {
    const db = authedDb("cmMadrid", { role: "cityAdmin", cityId: "madrid" });
    await assertSucceeds(db.collection("venues").doc("vMadrid").update({ name: "Madrid Club v2" }));
  });

  test("CM CANNOT write to earnings (backend only)", async () => {
    const db = authedDb("cmMadrid", { role: "cityAdmin", cityId: "madrid" });
    await assertFails(
      db.collection("cities").doc("madrid").collection("earnings").doc("fake").set({ amount: 999 })
    );
  });

  test("CM CANNOT delete earnings", async () => {
    const db = authedDb("cmMadrid", { role: "cityAdmin", cityId: "madrid" });
    await assertFails(
      db.collection("cities").doc("madrid").collection("earnings").doc("e1").delete()
    );
  });
});

// ── RRPP → Financial data (DENIED) ──

describe("RRPP financial isolation", () => {
  beforeEach(async () => {
    await seed(async (db) => {
      await db.collection("territorial_splits").doc("s1").set({ amount: 500, status: "completed" });
      await db.collection("financial_audits").doc("a1").set({ result: "pass" });
      await db.collection("processed_stripe_events").doc("evt1").set({ processed: true });
      await db.collection("venues").doc("v1").set({ name: "Club", cityId: "madrid", ownerId: "owner1" });
    });
  });

  test("RRPP CANNOT read territorial_splits", async () => {
    const db = authedDb("rrpp1", { role: "rrpp" });
    await assertFails(db.collection("territorial_splits").doc("s1").get());
  });

  test("RRPP CANNOT read financial_audits", async () => {
    const db = authedDb("rrpp1", { role: "rrpp" });
    await assertFails(db.collection("financial_audits").doc("a1").get());
  });

  test("RRPP CANNOT read processed_stripe_events", async () => {
    const db = authedDb("rrpp1", { role: "rrpp" });
    await assertFails(db.collection("processed_stripe_events").doc("evt1").get());
  });

  test("RRPP CANNOT update venue settings", async () => {
    const db = authedDb("rrpp1", { role: "rrpp" });
    await assertFails(db.collection("venues").doc("v1").update({ name: "Hacked" }));
  });
});

// ── Door → Financial data (DENIED) ──

describe("door financial isolation", () => {
  beforeEach(async () => {
    await seed(async (db) => {
      await db.collection("territorial_splits").doc("s1").set({ amount: 500 });
      await db.collection("financial_audits").doc("a1").set({ result: "pass" });
      await db.collection("users").doc("doorUser").collection("earnings").doc("e1").set({ amount: 50 });
    });
  });

  test("door CANNOT read territorial_splits", async () => {
    const db = authedDb("doorUser", { role: "door" });
    await assertFails(db.collection("territorial_splits").doc("s1").get());
  });

  test("door CANNOT read financial_audits", async () => {
    const db = authedDb("doorUser", { role: "door" });
    await assertFails(db.collection("financial_audits").doc("a1").get());
  });

  test("door can read own earnings", async () => {
    const db = authedDb("doorUser", { role: "door" });
    await assertSucceeds(db.collection("users").doc("doorUser").collection("earnings").doc("e1").get());
  });

  test("door CANNOT read other user earnings", async () => {
    await seed(async (db) => {
      await db.collection("users").doc("otherUser").collection("earnings").doc("e1").set({ amount: 100 });
    });

    const db = authedDb("doorUser", { role: "door" });
    await assertFails(db.collection("users").doc("otherUser").collection("earnings").doc("e1").get());
  });
});

// ── Ledger immutability ──

describe("ledger immutability", () => {
  beforeEach(async () => {
    await seed(async (db) => {
      await db.collection("tickets").doc("t1").set({
        userId: "u1", venueOwnerId: "v1", eventId: "e1", amount: 10, status: "valid",
      });
      await db.collection("checkins").doc("c1").set({ userId: "u1", eventId: "e1" });
      await db.collection("validation_logs").doc("vl1").set({ ticketId: "t1", result: "valid" });
      await db.collection("territorial_splits").doc("s1").set({ amount: 500 });
      await db.collection("financial_audits").doc("a1").set({ result: "pass" });
      await db.collection("users").doc("u1").collection("earnings").doc("e1").set({ amount: 100 });
    });
  });

  test("admin CANNOT delete tickets", async () => {
    const db = authedDb("admin-uid", { role: "admin" });
    await assertFails(db.collection("tickets").doc("t1").delete());
  });

  test("nobody can create tickets from client", async () => {
    const db = authedDb("u1");
    await assertFails(db.collection("tickets").doc("t2").set({ userId: "u1", amount: 0 }));
  });

  test("admin CANNOT write to checkins", async () => {
    const db = authedDb("admin-uid", { role: "admin" });
    await assertFails(db.collection("checkins").doc("c1").update({ userId: "hacked" }));
  });

  test("admin CANNOT delete checkins", async () => {
    const db = authedDb("admin-uid", { role: "admin" });
    await assertFails(db.collection("checkins").doc("c1").delete());
  });

  test("admin CANNOT write to validation_logs", async () => {
    const db = authedDb("admin-uid", { role: "admin" });
    await assertFails(db.collection("validation_logs").doc("vl1").update({ result: "hacked" }));
  });

  test("admin CANNOT write to territorial_splits", async () => {
    const db = authedDb("admin-uid", { role: "admin" });
    await assertFails(db.collection("territorial_splits").doc("s1").update({ amount: 999 }));
  });

  test("admin CANNOT write to financial_audits", async () => {
    const db = authedDb("admin-uid", { role: "admin" });
    await assertFails(db.collection("financial_audits").doc("a1").update({ result: "hacked" }));
  });

  test("user CANNOT write to own earnings", async () => {
    const db = authedDb("u1");
    await assertFails(db.collection("users").doc("u1").collection("earnings").doc("e1").update({ amount: 999 }));
  });
});

// ── Role escalation prevention ──

describe("role escalation prevention", () => {
  beforeEach(async () => {
    await seed(async (db) => {
      await db.collection("users").doc("u1").set({ nick: "test", role: "user" });
      await db.collection("cities").doc("madrid").set({ name: "Madrid" });
      await db.collection("cities").doc("barcelona").set({ name: "Barcelona" });
    });
  });

  test("user cannot set own role to admin", async () => {
    const db = authedDb("u1");
    await assertFails(db.collection("users").doc("u1").update({ role: "admin" }));
  });

  test("user cannot set own role to superadmin", async () => {
    const db = authedDb("u1");
    await assertFails(db.collection("users").doc("u1").update({ role: "superadmin" }));
  });

  test("user cannot set own role to cityAdmin", async () => {
    const db = authedDb("u1");
    await assertFails(db.collection("users").doc("u1").update({ role: "cityAdmin" }));
  });

  test("user cannot set own verified status", async () => {
    const db = authedDb("u1");
    await assertFails(db.collection("users").doc("u1").update({ verified: true }));
  });

  test("user cannot escalate to isVIPNight", async () => {
    const db = authedDb("u1");
    await assertFails(db.collection("users").doc("u1").update({ isVIPNight: true }));
  });

  test("RRPP cannot modify cities", async () => {
    const db = authedDb("rrpp1", { role: "rrpp" });
    await assertFails(db.collection("cities").doc("madrid").update({ name: "Hacked" }));
  });

  test("cityAdmin cannot modify other city", async () => {
    const db = authedDb("cmMadrid", { role: "cityAdmin", cityId: "madrid" });
    await assertFails(db.collection("cities").doc("barcelona").update({ name: "Hacked" }));
  });
});
