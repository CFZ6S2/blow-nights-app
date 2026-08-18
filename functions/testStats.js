const { admin, db } = require('./lib/init');

async function testGetPromoterStats() {
  const token = 'FFP0I0';

  try {
    const promotersQuery = await db.collectionGroup('promoters')
      .where('access_token', '==', token)
      .limit(1)
      .get();

    if (promotersQuery.empty) throw new Error('not-found');

    const promoterDoc = promotersQuery.docs[0];
    const promoter = promoterDoc.data();
    const eventId = promoterDoc.ref.parent.parent.id;
    const venueId = promoterDoc.ref.parent.parent.parent.parent.id;

    const ticketsQuery = await db.collection("tickets")
      .where("eventId", "==", eventId)
      .where("rrpp_id", "==", promoterDoc.id)
      .get();

    let totalSold = 0;
    let totalEntered = 0;

    ticketsQuery.forEach(doc => {
      const t = doc.data();
      if (t.status === "valid" || t.status === "used") totalSold++;
      if (t.status === "used") totalEntered++;
    });

    let userQuota = 0;
    if (promoter.userId) {
      const userDoc = await db.collection("users").doc(promoter.userId).get();
      if (userDoc.exists) userQuota = userDoc.data().qr_quota || 0;
    } else {
      userQuota = promoter.qr_quota || 0;
    }

    console.log("Success! Data:");
    console.log({
      id: promoterDoc.id,
      name: promoter.name,
      code: promoter.code,
      venueId,
      eventId,
      is_closed: promoter.is_closed || false,
      qr_quota: userQuota,
      totalSold,
      totalEntered
    });
  } catch (error) {
    console.error("Error thrown:", error);
  }
}

testGetPromoterStats().catch(console.error);
