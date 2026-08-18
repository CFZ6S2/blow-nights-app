const admin = require('firebase-admin');

try {
  admin.initializeApp();
} catch (e) {}

const db = admin.firestore();

async function cleanAll() {
  console.log('Starting cleanup...');

  // 1. Delete all tickets
  const ticketsSnap = await db.collection('tickets').get();
  console.log(`Found ${ticketsSnap.size} tickets to delete.`);
  if (ticketsSnap.size > 0) {
    const batch1 = db.batch();
    ticketsSnap.forEach(doc => {
      batch1.delete(doc.ref);
    });
    await batch1.commit();
    console.log(`Deleted ${ticketsSnap.size} tickets.`);
  }

  // 2. Delete all events from all venues
  const venuesSnap = await db.collection('venues').get();
  let eventsCount = 0;
  let promotersCount = 0;
  
  for (const venueDoc of venuesSnap.docs) {
    // Delete events
    const eventsSnap = await venueDoc.ref.collection('events').get();
    if (!eventsSnap.empty) {
      const batch2 = db.batch();
      eventsSnap.forEach(eventDoc => {
        batch2.delete(eventDoc.ref);
        eventsCount++;
      });
      await batch2.commit();
    }
    
    // Delete promoters
    const promotersSnap = await venueDoc.ref.collection('promoters').get();
    if (!promotersSnap.empty) {
      const batch3 = db.batch();
      promotersSnap.forEach(promoterDoc => {
        batch3.delete(promoterDoc.ref);
        promotersCount++;
      });
      await batch3.commit();
    }
  }
  
  console.log(`Deleted ${eventsCount} events.`);
  console.log(`Deleted ${promotersCount} promoter links.`);
  console.log('Cleanup complete!');
}

cleanAll().catch(console.error);
