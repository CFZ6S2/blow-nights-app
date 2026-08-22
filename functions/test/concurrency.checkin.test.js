const { initializeTestEnvironment } = require("@firebase/rules-unit-testing");
const { readFileSync } = require("fs");
const { resolve } = require("path");

process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";

jest.mock("firebase-functions/v2/https", () => {
  const { HttpsError } = jest.requireActual("firebase-functions/v2/https");
  return { HttpsError, onCall: (_opts, handler) => handler };
});

const { admin, db } = require("../lib/init");

const PROJECT_ID = "blow-nights-concurrency-test";
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
});

// Import function directly
// But wait, the function is wrapped in onCall
const venues = require("../modules/venues");
// Actually, firebase-functions/v2/https onCall returns a handler. We can invoke it directly if we mock the request format.

describe("Check-in Concurrency (Extreme Conditions)", () => {
  it("Should handle 50 concurrent check-ins correctly and serialize transactions", async () => {
    const uid = "user_concurrent";
    
    // Setup venues
    await db.collection("venues").doc("venueA").set({ name: "Venue A", isActive: true, currentCount: 0 });
    await db.collection("venues").doc("venueB").set({ name: "Venue B", isActive: true, currentCount: 0 });
    
    // Simulate 50 concurrent requests alternating venues
    const requests = [];
    for (let i = 0; i < 50; i++) {
      const venueId = i % 2 === 0 ? "venueA" : "venueB";
      
      const req = {
        data: { venueId, visibility: "public", anonymous: false },
        auth: { uid }
      };
      
      // venues.checkInUser is an onCall handler. In test environments, it's a function we can call with (req)
      requests.push(venues.checkInUser(req).catch(e => e));
    }
    
    await Promise.all(requests);
    
    // Validate state
    const venueA = (await db.collection("venues").doc("venueA").get()).data();
    const venueB = (await db.collection("venues").doc("venueB").get()).data();
    const checkin = await db.collection("checkins").doc(uid).get();
    
    // Total count should be exactly 1
    expect(venueA.currentCount + venueB.currentCount).toBe(1);
    
    // No negative counts
    expect(venueA.currentCount).toBeGreaterThanOrEqual(0);
    expect(venueB.currentCount).toBeGreaterThanOrEqual(0);
    
    // Checkin document exists and matches
    expect(checkin.exists).toBe(true);
    const finalVenueId = checkin.data().venueId;
    if (finalVenueId === "venueA") {
      expect(venueA.currentCount).toBe(1);
      expect(venueB.currentCount).toBe(0);
    } else {
      expect(venueA.currentCount).toBe(0);
      expect(venueB.currentCount).toBe(1);
    }
  }, 60000); // 60s timeout
});
