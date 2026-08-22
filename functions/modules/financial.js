const { onSchedule } = require("firebase-functions/v2/scheduler");
const { admin, db } = require("../lib/init");
const { getStripe } = require("./stripe");

exports.dailyStripeReconciliation = onSchedule("every day 04:00", async (event) => {
  const stripe = getStripe();
  if (!stripe) {
    console.error("Stripe not configured.");
    return;
  }

  const now = admin.firestore.Timestamp.now();
  const twoDaysAgo = admin.firestore.Timestamp.fromMillis(now.toMillis() - 48 * 60 * 60 * 1000);
  
  const splitsSnapshot = await db.collection("territorial_splits")
    .where("timestamp", ">=", twoDaysAgo)
    .get();

  for (const doc of splitsSnapshot.docs) {
    const split = doc.data();
    const splitId = split.splitId;
    let mismatch = false;
    let mismatchReasons = [];

    const sumPayouts = split.payouts.reduce((sum, p) => sum + p.amountCents, 0);
    if (sumPayouts !== split.amountCents) {
      mismatch = true;
      mismatchReasons.push(`sumPayouts (${sumPayouts}) !== amountCents (${split.amountCents})`);
    }

    for (let i = 0; i < split.payouts.length; i++) {
      const payout = split.payouts[i];
      if (payout.role === 'central') continue;

      if (payout.status === 'paid' || payout.status === 'partial') {
        try {
          const transfers = await stripe.transfers.list({
            transfer_group: splitId,
            limit: 10,
          });

          const matchingTransfer = transfers.data.find(t => t.amount === payout.amountCents);
          if (!matchingTransfer) {
            mismatch = true;
            mismatchReasons.push(`Transfer not found in Stripe for ${payout.role} amount ${payout.amountCents}`);
          }
        } catch (error) {
          mismatch = true;
          mismatchReasons.push(`Stripe API error checking transfer for ${payout.role}: ${error.message}`);
        }
      }
    }

    if (mismatch) {
      console.error(`Mismatch found for split ${splitId}:`, mismatchReasons);
      await db.collection("financial_audits").add({
        splitId,
        splitData: split,
        mismatchReasons,
        status: "needs_manual_review",
        detectedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      await db.collection("financial_audits").add({
        splitId,
        status: "ok",
        detectedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  }
  console.log("Reconciliation finished.");
});
