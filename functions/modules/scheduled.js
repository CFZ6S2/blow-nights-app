const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const db = admin.firestore();

exports.autoCompleteEventsAndSubscriptions = onSchedule("every day 04:00", async (event) => {
  const now = admin.firestore.Timestamp.now();
  const yesterday = new admin.firestore.Timestamp(now.seconds - 86400, 0); // 24h ago

  console.log("Running scheduled maintenance: autoCompleteEventsAndSubscriptions");

  // 1. Auto-complete past independent events
  const pastEventsQuery = await db.collection("events")
    .where("start_date", "<", yesterday)
    .where("status", "==", "active")
    .get();

  const batch = db.batch();
  let count = 0;

  for (const doc of pastEventsQuery.docs) {
    batch.update(doc.ref, {
      status: "completed",
      completedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Close all RRPPs for this event
    const promotersQuery = await doc.ref.collection("promoters").where("is_closed", "==", false).get();
    promotersQuery.forEach(p => {
      batch.update(p.ref, {
        is_closed: true,
        closed_at: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    count++;
    if (count >= 400) {
      await batch.commit();
      count = 0;
    }
  }

  // 2. Fallback for expired venue subscriptions (in case webhook failed)
  // Check venues with a subscription tier but no updates in 32 days
  const thirtyTwoDaysAgo = new admin.firestore.Timestamp(now.seconds - (32 * 86400), 0);
  const venuesQuery = await db.collection("venues")
    .where("subscriptionTier", "in", ["basico", "promo", "ticketing"])
    .get();

  for (const doc of venuesQuery.docs) {
    const data = doc.data();
    // Assuming we have a lastRenewal date, if we don't, we can't accurately expire them here safely.
    // In Stripe, we rely on webhooks. This is just a placeholder logic if we had lastRenewal.
  }

  if (count > 0) {
    await batch.commit();
  }

  console.log(`Scheduled maintenance completed. Auto-completed ${pastEventsQuery.size} events.`);
});
