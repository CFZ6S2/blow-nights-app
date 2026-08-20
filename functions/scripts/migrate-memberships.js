const admin = require('firebase-admin');

// Ensure you run this script with FIREBASE_CONFIG or service account credentials.
// Or run via `npx firebase-tools exec scripts/migrate-memberships.js` (if configured)

const db = admin.firestore();

async function migrate() {
  console.log("Starting membership migration...");
  
  const usersSnapshot = await db.collection("users").get();
  let updatedCount = 0;
  
  for (const doc of usersSnapshot.docs) {
    const data = doc.data();
    let updates = {};
    
    // Existing premium user? -> Black tier
    if (data.premium === true) {
      updates.membershipTier = "black";
      updates.membershipStatus = "active";
    } else {
      // Free user by default
      if (!data.membershipTier) {
        updates.membershipTier = "free";
      }
    }
    
    // If promoMember -> ensure lifetime properties
    if (data.promoMember === true) {
      updates.membershipTier = "black";
      updates.membershipStatus = "active";
      updates.membershipExpiration = null; 
      updates.premium = true;
    }

    if (Object.keys(updates).length > 0) {
      await doc.ref.update(updates);
      
      // Update custom claims if they are now Black/Promo
      if (updates.membershipTier === 'black') {
        try {
          const authUser = await admin.auth().getUser(doc.id);
          const existingClaims = authUser.customClaims || {};
          if (!existingClaims.premium) {
            await admin.auth().setCustomUserClaims(doc.id, { ...existingClaims, premium: true });
          }
        } catch (e) {
          console.error(`Failed to update claims for ${doc.id}: ${e.message}`);
        }
      }
      updatedCount++;
    }
  }
  
  console.log(`Migration completed. Updated ${updatedCount} users.`);
}

migrate().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
