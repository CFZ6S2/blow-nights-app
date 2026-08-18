const { onDocumentCreated, onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { geohashForLocation } = require("geofire-common");
const { admin, db } = require("../lib/init");

exports.updateGeohash = onDocumentWritten("locations/{userId}", async (event) => {
  const data = event.data?.after?.data();
  if (!data || !data.lat || !data.lng) return null;

  const geohash = geohashForLocation([data.lat, data.lng]);
  if (data.geohash === geohash) return null;

  return event.data.after.ref.update({
    geohash: geohash,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
});

exports.cleanupAvailability = onSchedule("every 5 minutes", async (event) => {
  const now = admin.firestore.Timestamp.now();
  const expiredUsers = await db.collection("users")
    .where("disponibleHasta", "<", now)
    .get();

  const chunks = [];
  for (let i = 0; i < expiredUsers.docs.length; i += 500) {
    chunks.push(expiredUsers.docs.slice(i, i + 500));
  }
  await Promise.all(chunks.map(chunk => {
    const batch = db.batch();
    chunk.forEach(doc => batch.update(doc.ref, { disponibleHasta: null }));
    return batch.commit();
  }));
});

exports.cleanupExpiredCheckins = onSchedule({
  schedule: "0 14 * * *",
  timeZone: "Europe/Madrid",
}, async () => {
  const now = admin.firestore.Timestamp.now();
  const expired = await db.collection("checkins")
    .where("expiresAt", "<", now)
    .get();

  if (expired.empty) return;

  const batchSize = 500;
  let ops = [];
  for (const doc of expired.docs) {
    ops.push(doc.ref.delete());
    if (ops.length >= batchSize) {
      await Promise.all(ops);
      ops = [];
    }
  }
  if (ops.length) await Promise.all(ops);
  console.log(`Cleaned up ${expired.size} expired checkins.`);
});

exports.onCheckinCreated = onDocumentCreated("checkins/{checkinId}", async (event) => {
  const data = event.data?.data();
  if (!data?.venueId) return null;
  const venueRef = db.collection("venues").doc(data.venueId);
  const venueSnap = await venueRef.get();
  if (!venueSnap.exists) return null;
  return venueRef.update({
    currentCount: admin.firestore.FieldValue.increment(1),
  });
});

exports.checkFranchiseTrigger = onDocumentWritten("venues/{venueId}", async (event) => {
  const after = event.data.after;
  if (!after.exists) return;

  const before = event.data.before;
  const data = after.data();
  if (!data.isActive || !data.cityId) return;

  if (before.exists) {
    const prev = before.data();
    if (prev.isActive === data.isActive && prev.cityId === data.cityId) return;
  }

  const cityId = data.cityId;

  const venuesSnap = await db.collection("venues")
    .where("cityId", "==", cityId)
    .where("isActive", "==", true)
    .count()
    .get();

  const activeCount = venuesSnap.data().count;

  if (activeCount >= 2) {
    const cityRef = db.collection("cities").doc(cityId);
    const citySnap = await cityRef.get();

    let hasManager = false;
    if (citySnap.exists) {
      const cData = citySnap.data();
      if (cData.partnerId || cData.managerId) {
        hasManager = true;
      }
    }

    if (!hasManager) {
      await cityRef.set({
        readyForFranchise: true,
        activeVenuesCount: activeCount,
        slug: cityId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      console.log(`Franchise trigger activated for ${cityId} with ${activeCount} venues!`);
    } else if (citySnap.exists) {
      await cityRef.update({
        activeVenuesCount: activeCount,
        readyForFranchise: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  }
});
