// Delete all venue documents of type 'cruising' or 'public_cruising' and verify removal
const { admin, db } = require('./functions/lib/init.js');

async function deleteCruising() {
  const snapshot = await db.collection('venues')
    .where('type', 'in', ['cruising', 'public_cruising'])
    .get();
  if (snapshot.empty) {
    console.log('No cruising venues found.');
    return;
  }
  console.log(`Found ${snapshot.size} cruising venues. Deleting...`);
  for (const doc of snapshot.docs) {
    await doc.ref.delete();
    console.log(`Deleted ${doc.id}`);
  }
}

// Verify that no cruising venues remain
async function verifyDeletion() {
  const afterSnap = await db.collection('venues')
    .where('type', 'in', ['cruising', 'public_cruising'])
    .get();
  if (afterSnap.empty) {
    console.log('Verification: No cruising venues remain.');
  } else {
    console.log(`Verification: Still ${afterSnap.size} cruising venues present:`);
    afterSnap.docs.forEach(d => console.log(`- ${d.id}: ${d.data().name}`));
  }
}

async function run() {
  await deleteCruising();
  await verifyDeletion();
}

run()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
