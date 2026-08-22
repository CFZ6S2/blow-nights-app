const { initializeTestEnvironment, assertSucceeds, assertFails } = require("@firebase/rules-unit-testing");
const { readFileSync } = require("fs");
const { resolve } = require("path");

const PROJECT_ID = "gay-meet-app-mvp-26";
const RULES = readFileSync(resolve(__dirname, "../../storage.rules"), "utf8");
const FIRESTORE_RULES = readFileSync(resolve(__dirname, "../../firestore.rules"), "utf8");

let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    storage: { rules: RULES, host: "127.0.0.1", port: 9199 },
    firestore: { rules: FIRESTORE_RULES, host: "127.0.0.1", port: 8080 },
  });
}, 30000);

afterAll(async () => {
  if (testEnv) await testEnv.cleanup();
});

afterEach(async () => {
  if (testEnv) {
    await testEnv.clearStorage();
    await testEnv.clearFirestore();
  }
});

// Setup mock documents in Firestore required for storage rules (cross-service validation)
async function setupFirestoreDocs() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await db.collection("venues").doc("VENUE_A").set({ ownerId: "owner_a" });
    await db.collection("venues").doc("VENUE_B").set({ ownerId: "owner_b" });
    
    await db.collection("events").doc("EVENT_A").set({ organizerId: "owner_a" });
    await db.collection("events").doc("EVENT_B").set({ organizerId: "owner_b" });
  });
}

describe("Storage Cross-Ownership & Hardening", () => {
  beforeEach(async () => {
    await setupFirestoreDocs();
  });

  const getStorage = (uid) => {
    if (!uid) return testEnv.unauthenticatedContext().storage();
    return testEnv.authenticatedContext(uid).storage();
  };

  const uploadFile = (storage, path, contentType = "image/jpeg", size = 1024) => {
    const ref = storage.ref(path);
    // Create dummy data
    const content = new Uint8Array(size);
    return ref.put(content, { contentType });
  };

  test("Owner A -> /venues/A/... ✅ Permitido", async () => {
    const storage = getStorage("owner_a");
    await assertSucceeds(uploadFile(storage, "/venues/VENUE_A/events/test_event/photo.jpg"));
  });

  test("Owner A -> /venues/B/... ❌ Denegado", async () => {
    const storage = getStorage("owner_a");
    await assertFails(uploadFile(storage, "/venues/VENUE_B/events/test_event/photo.jpg"));
  });

  test("Usuario normal -> /venues/A/... ❌ Denegado", async () => {
    const storage = getStorage("random_user");
    await assertFails(uploadFile(storage, "/venues/VENUE_A/events/test_event/photo.jpg"));
  });

  test("Owner A -> /events/A/... si es suyo ✅ Permitido", async () => {
    const storage = getStorage("owner_a");
    await assertSucceeds(uploadFile(storage, "/events/EVENT_A/photo.jpg"));
  });

  test("Owner A -> /events/B/... ❌ Denegado", async () => {
    const storage = getStorage("owner_a");
    await assertFails(uploadFile(storage, "/events/EVENT_B/photo.jpg"));
  });

  test("Usuario autenticado -> .exe (malware) ❌ Denegado", async () => {
    const storage = getStorage("owner_a");
    await assertFails(uploadFile(storage, "/venues/VENUE_A/events/test_event/malware.exe", "application/x-msdownload"));
  });

  test("Owner -> archivo > límite (11MB) ❌ Denegado", async () => {
    const storage = getStorage("owner_a");
    // Upload size > 10MB
    await assertFails(uploadFile(storage, "/venues/VENUE_A/events/test_event/huge.jpg", "image/jpeg", 11 * 1024 * 1024));
  });

  test("Usuario no autenticado ❌ Denegado", async () => {
    const storage = getStorage(null);
    await assertFails(uploadFile(storage, "/venues/VENUE_A/events/test_event/photo.jpg"));
  });

  test("Path arbitrario fuera de los permitidos ❌ Denegado", async () => {
    const storage = getStorage("owner_a");
    await assertFails(uploadFile(storage, "/some_random_folder/photo.jpg"));
  });
  
  test("Owner A attempt to overwrite Owner B's file ❌ Denegado", async () => {
    // Owner B writes their own file
    const storageB = getStorage("owner_b");
    await assertSucceeds(uploadFile(storageB, "/venues/VENUE_B/events/test_event/photo.jpg"));
    
    // Owner A tries to overwrite it
    const storageA = getStorage("owner_a");
    await assertFails(uploadFile(storageA, "/venues/VENUE_B/events/test_event/photo.jpg"));
    
    // Owner A tries to delete it
    await assertFails(storageA.ref("/venues/VENUE_B/events/test_event/photo.jpg").delete());
  });
});
