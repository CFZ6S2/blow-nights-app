const fs = require('fs');
let code = fs.readFileSync('functions/modules/stripe.js', 'utf8');

const helperCode = `
async function executePayoutCascade(stripe, amountCents, cityId, description, transferGroup, type, relatedId, userId, db, admin) {
  if (!cityId || amountCents <= 0) return;
  try {
    const cityDoc = await db.collection("cities").doc(cityId).get();
    if (!cityDoc.exists) return;
    const cityData = cityDoc.data();
    const partnerStripeId = cityData.partner_stripe_account_id || null;
    const ambassadorId = cityData.ambassadorId || null;

    const ambassadorCents = Math.round(amountCents * 0.25);
    let ambassadorPaid = false;

    if (ambassadorId) {
      const ambassadorDoc = await db.collection("users").doc(ambassadorId).get();
      const ambassadorStripe = ambassadorDoc.exists ? ambassadorDoc.data()?.stripeAccountId : null;
      if (ambassadorStripe) {
        const transferData = {
          amount: ambassadorCents,
          currency: "eur",
          destination: ambassadorStripe,
          description: \`Ambassador 25% \${description}\`,
          transfer_group: transferGroup,
        };
        try {
          await stripe.transfers.create(transferData);
          await db.collection("users").doc(ambassadorId).collection("earnings").add({
            amount: ambassadorCents / 100,
            type: type,
            cityId,
            relatedId: relatedId || null,
            userId: userId || null,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          });
          ambassadorPaid = true;
        } catch (err) {
          console.error("Error en transfer Ambassador:", err);
          await db.collection("pending_transfers").add({ ...transferData, status: "pending", error: err.message, timestamp: admin.firestore.FieldValue.serverTimestamp() });
        }
      }
    }

    const cityManagerCents = Math.ceil((amountCents - ambassadorCents) / 2);

    if (partnerStripeId) {
      const transferData = {
        amount: cityManagerCents,
        currency: "eur",
        destination: partnerStripeId,
        description: \`CityManager 50% \${description}\`,
        transfer_group: transferGroup,
      };
      try {
        await stripe.transfers.create(transferData);
        await db.collection("cities").doc(cityId).collection("earnings").add({
          amount: cityManagerCents / 100,
          type: type,
          relatedId: relatedId || null,
          userId: userId || null,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (err) {
        console.error("Error en transfer City Manager:", err);
        await db.collection("pending_transfers").add({ ...transferData, status: "pending", error: err.message, timestamp: admin.firestore.FieldValue.serverTimestamp() });
      }
    }
  } catch(e) {
    console.error("Error en executePayoutCascade", e);
  }
}
`;

if (!code.includes('executePayoutCascade')) {
  code = code.replace(/const \{ admin, db, getStripe \} = require\('\.\.\/lib\/init'\);/, 
    `const { admin, db, getStripe } = require('../lib/init');\n\n` + helperCode);
}

// 1. Refactor venue_subscription
code = code.replace(
  /const ambassadorCents = Math\.round\(session\.amount_total \* 0\.25\);[\s\S]*?console\.error\("Error procesando reparto venue sub:", e\);\n\s*\}\n\s*\}/m,
  `await executePayoutCascade(stripe, session.amount_total, cityId, \`venue sub \${tier} - \${venueId}\`, session.id, "venue_subscription", venueId, firebaseUID, db, admin);`
);

// 2. Refactor isChillPass / isChillVip
code = code.replace(
  /const citySlug = session\.metadata\?\.city_slug;\n\s*if \(citySlug && session\.amount_total > 0\) \{[\s\S]*?console\.error\("Error leyendo datos del socio local:", e\);\n\s*\}\n\s*\}/m,
  `const citySlug = session.metadata?.city_slug;\n      if (citySlug && session.amount_total > 0) {\n        await executePayoutCascade(stripe, session.amount_total, citySlug, \`suscripcion VIP - \${firebaseUID}\`, session.id, isChillPass ? "chill_pass" : "chill_vip", null, firebaseUID, db, admin);\n      }`
);

// 3. Refactor ping_pack / vip_night
code = code.replace(
  /const citySlug = session\.metadata\?\.city_slug;[\s\S]*?console\.error\("Error leyendo datos del socio local:", e\);\n\s*\}\n\s*\}/m,
  `const citySlug = session.metadata?.city_slug;\n      if (citySlug && session.amount_total > 0) {\n        await executePayoutCascade(stripe, session.amount_total, citySlug, \`\${type === 'ping_pack' ? 'Pack Toques' : 'Pase Fuego'} - \${firebaseUID}\`, session.id, type === 'ping_pack' ? 'micro_ping' : 'vip_night', null, firebaseUID, db, admin);\n      }`
);

// 4. Refactor isTicket
code = code.replace(
  /const ambassadorCents = Math\.round\(PLATFORM_FEE_CENTS \* 0\.25\);[\s\S]*?console\.error\("Error procesando reparto ticket:", e\);\n\s*\}/m,
  `await executePayoutCascade(stripe, PLATFORM_FEE_CENTS, cityId, \`ticket \${eventId || venueId}\`, session.id, "ticket_fee", eventId || venueId, firebaseUID, db, admin);`
);

// 5. Refactor isUserMembership / isBlackBoost (in the else block)
code = code.replace(
  /\} else \{\n\s*await db\.collection\("users"\)\.doc\(firebaseUID\)\.update\(\{ premium: true \}\);\n\s*await db\.collection\("subscriptions"\)\.doc\(firebaseUID\)\.update\(\{\n\s*status: "active",\n\s*subscriptionId: session\.subscription,\n\s*renewalDate: admin\.firestore\.FieldValue\.serverTimestamp\(\)\n\s*\}\);\n\s*\}/m,
  `} else {\n      await db.collection("users").doc(firebaseUID).update({ premium: true });\n      await db.collection("subscriptions").doc(firebaseUID).update({\n        status: "active",\n        subscriptionId: session.subscription,\n        renewalDate: admin.firestore.FieldValue.serverTimestamp()\n      });\n\n      const citySlug = session.metadata?.city_slug;\n      if (citySlug && session.amount_total > 0) {\n        await executePayoutCascade(stripe, session.amount_total, citySlug, \`\${isBlackBoost ? 'Black Boost 8h' : 'Suscripción Plus'} - \${firebaseUID}\`, session.id, isBlackBoost ? 'black_boost' : 'user_membership', null, firebaseUID, db, admin);\n      }\n    }`
);

// 6. Add invoice.payment_succeeded handler
const invoiceHandler = `
  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object;
    if (invoice.subscription) {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
      const isVenueSub = subscription.metadata?.type === "venue_subscription";
      const isUserSub = subscription.metadata?.type === "user_membership";
      const citySlug = subscription.metadata?.city_slug || subscription.metadata?.cityId;
      
      if (citySlug && invoice.amount_paid > 0) {
        if (isVenueSub) {
          const venueId = subscription.metadata?.venueId;
          const tier = subscription.metadata?.tier;
          await executePayoutCascade(stripe, invoice.amount_paid, citySlug, \`Renovación venue sub \${tier} - \${venueId}\`, invoice.id, "venue_subscription_renewal", venueId, null, db, admin);
        } else if (isUserSub) {
          const firebaseUID = subscription.metadata?.firebaseUID;
          await executePayoutCascade(stripe, invoice.amount_paid, citySlug, \`Renovación Suscripción Plus - \${firebaseUID}\`, invoice.id, "user_membership_renewal", null, firebaseUID, db, admin);
          
          if (firebaseUID) {
            await db.collection("subscriptions").doc(firebaseUID).update({
              renewalDate: admin.firestore.FieldValue.serverTimestamp()
            });
          }
        }
      }
    }
  }
`;

code = code.replace(/if \(event\.type === "customer\.subscription\.deleted"\)/, 
  invoiceHandler + "\n  if (event.type === \"customer.subscription.deleted\")");

fs.writeFileSync('functions/modules/stripe.js', code);
console.log('Stripe refactored successfully.');
