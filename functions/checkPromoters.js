const { admin, db } = require('./lib/init');

async function checkPromoters() {
  const snapshot = await db.collectionGroup('promoters').get();
  console.log(`Found ${snapshot.size} promoter documents.`);
  snapshot.forEach(doc => {
    console.log(`Promoter ID: ${doc.id}`);
    console.log(`- eventId: ${doc.ref.parent.parent ? doc.ref.parent.parent.id : 'N/A'}`);
    console.log(`- access_token: ${doc.data().access_token}`);
    console.log(`- userId: ${doc.data().userId}`);
  });
}

checkPromoters().catch(console.error);
