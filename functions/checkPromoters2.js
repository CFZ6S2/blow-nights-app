const { admin, db } = require('./lib/init');

async function checkPromoters() {
  const snapshot = await db.collectionGroup('promoters').get();
  console.log(`Found ${snapshot.size} promoter documents.`);
  snapshot.forEach(doc => {
    console.log(`Promoter ID: ${doc.id}`);
    const parent = doc.ref.parent;
    const event = parent ? parent.parent : null;
    const eventsColl = event ? event.parent : null;
    const venue = eventsColl ? eventsColl.parent : null;
    console.log(`- eventId: ${event ? event.id : 'N/A'}`);
    console.log(`- venueId: ${venue ? venue.id : 'N/A'}`);
  });
}

checkPromoters().catch(console.error);
