const functions = require("firebase-functions/v1");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { admin, db } = require("../lib/init");

exports.onUserCreate = functions.auth.user().onCreate(async (user) => {
  const { uid, phoneNumber, email, displayName, photoURL } = user;

  let isPremium = false;
  try {
    const statsRef = db.collection("system").doc("promoStats");

    isPremium = await db.runTransaction(async (transaction) => {
      const statsDoc = await transaction.get(statsRef);
      let count = 0;

      if (statsDoc.exists) {
        count = statsDoc.data().count || 0;
      } else {
        const usersSnapshot = await db.collection("users").count().get();
        count = usersSnapshot.data().count;
      }

      if (count < 100) {
        transaction.set(statsRef, { count: count + 1 }, { merge: true });
        return true;
      }
      return false;
    });
    console.log(`Usuario ${uid} registrado. Promo Premium: ${isPremium}`);
  } catch (error) {
    console.error("Error al contar usuarios para premium promo:", error);
    isPremium = false;
  }

  const userDoc = {
    nick: displayName || "Usuario",
    edad: null,
    rol: "versátil",
    intencion: "conocer",
    fotoUrl: photoURL || "",
    online: false,
    lastSeen: admin.firestore.FieldValue.serverTimestamp(),
    premium: isPremium,
    dailyPingsLeft: 3,
    lastPingReset: admin.firestore.FieldValue.serverTimestamp(),
    isVIPNight: false,
    activePlatforms: ['blownights'],
    disponibleHasta: null,
    qr_quota: 25, // Saldo inicial gratuito de 25 pases QR (Welcome Bonus)
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const subscriptionDoc = {
    stripeCustomerId: "",
    subscriptionId: "",
    status: isPremium ? "active" : "incomplete",
    renewalDate: null,
    promoMember: isPremium
  };

  const batch = db.batch();
  batch.set(db.collection("users").doc(uid), userDoc);
  batch.set(db.collection("subscriptions").doc(uid), subscriptionDoc);

  return batch.commit();
});

exports.assignRole = onCall({ enforceAppCheck: false }, async (request) => {
  const { data, auth } = request;
  if (!auth) throw new HttpsError("unauthenticated", "Login requerido.");

  const callerIsAdmin = auth.token.role === 'admin' || auth.token.role === 'superadmin';
  if (!callerIsAdmin) {
    throw new HttpsError("permission-denied", "No tienes permisos de administrador.");
  }

  const { uid, role, cityId } = data;
  if (!uid || !role) {
    throw new HttpsError("invalid-argument", "uid y role son obligatorios.");
  }

  const validRoles = ['user', 'venue', 'venueOwner', 'cityAdmin', 'admin', 'superadmin', 'rrpp', 'door', 'ambassador', 'pending_rrpp'];
  if (!validRoles.includes(role)) {
    throw new HttpsError("invalid-argument", `Rol inválido: ${role}`);
  }

  try {
    const existingClaims = (await admin.auth().getUser(uid)).customClaims || {};
    const claims = { ...existingClaims, role };
    if (cityId) claims.cityId = cityId;

    await admin.auth().setCustomUserClaims(uid, claims);

    await db.collection("users").doc(uid).update({
      role: role,
      ...(cityId ? { cityId } : {})
    });

    return { success: true, message: `Rol ${role} asignado a ${uid}` };
  } catch (error) {
    console.error("Error al asignar rol:", error);
    throw new HttpsError("internal", "Error al asignar el rol.");
  }
});

exports.deleteUserData = onCall({ enforceAppCheck: false }, async (request) => {
  const { auth } = request;
  if (!auth) throw new HttpsError("unauthenticated", "Login requerido.");

  const uid = auth.uid;

  const deleteByField = async (col, field) => {
    const snap = await db.collection(col).where(field, "==", uid).get();
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    if (!snap.empty) await batch.commit();
  };

  await Promise.all([
    deleteByField("likes", "fromId"),
    deleteByField("likes", "toId"),
    deleteByField("visits", "visitorId"),
    deleteByField("visits", "visitedId"),
    deleteByField("pings", "fromUserId"),
    deleteByField("pings", "toUserId"),
    deleteByField("checkins", "userId"),
    deleteByField("tickets", "userId"),
    deleteByField("chill_requests", "user_uid"),
    deleteByField("reports", "reportedBy"),
    deleteByField("matches", "users"),
  ]);

  const blocksSnap = await db.collection("users").doc(uid).collection("blocks").get();
  if (!blocksSnap.empty) {
    const batch = db.batch();
    blocksSnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  const earningsSnap = await db.collection("users").doc(uid).collection("earnings").get();
  if (!earningsSnap.empty) {
    const batch = db.batch();
    earningsSnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  await Promise.all([
    db.collection("locations").doc(uid).delete(),
    db.collection("verifications").doc(uid).delete(),
    db.collection("subscriptions").doc(uid).delete(),
    db.collection("partner_applications").doc(uid).delete().catch(() => {}),
  ]);

  try {
    const bucket = admin.storage().bucket();
    const [files] = await bucket.getFiles({ prefix: `profilePictures/${uid}/` });
    await Promise.all(files.map((f) => f.delete()));
  } catch (e) {
    console.warn("Storage cleanup failed:", e.message);
  }

  await db.collection("users").doc(uid).delete();

  await admin.auth().deleteUser(uid);

  return { success: true };
});

exports.banUser = onCall({ enforceAppCheck: false }, async (request) => {
  const { auth: caller } = request;
  if (!caller) throw new HttpsError("unauthenticated", "Login required");

  const callerDoc = await db.collection("users").doc(caller.uid).get();
  const callerRole = callerDoc.data()?.role;
  if (!callerDoc.exists || (callerRole !== "admin" && callerRole !== "superadmin")) {
    throw new HttpsError("permission-denied", "Admin/Superadmin only");
  }

  const { uid, reason } = request.data;
  if (!uid) throw new HttpsError("invalid-argument", "uid is required");
  if (uid === caller.uid) throw new HttpsError("invalid-argument", "Cannot ban yourself");

  const targetDoc = await db.collection("users").doc(uid).get();
  if (!targetDoc.exists) throw new HttpsError("not-found", "User not found");

  await admin.auth().revokeRefreshTokens(uid);
  await admin.auth().updateUser(uid, { disabled: true });

  await db.collection("users").doc(uid).update({
    banned: true,
    bannedAt: admin.firestore.FieldValue.serverTimestamp(),
    bannedBy: caller.uid,
    bannedReason: reason || null,
  });

  return { success: true, uid };
});

exports.adminDeleteUser = onCall({ enforceAppCheck: false }, async (request) => {
  const { auth: caller, data } = request;
  if (!caller) throw new HttpsError("unauthenticated", "Login required");

  const callerDoc = await db.collection("users").doc(caller.uid).get();
  const callerRole = callerDoc.data()?.role;
  if (!callerDoc.exists || (callerRole !== "superadmin" && callerRole !== "admin")) {
    throw new HttpsError("permission-denied", "Admin/Superadmin only");
  }

  const { uid } = data;
  if (!uid) throw new HttpsError("invalid-argument", "uid is required");
  if (uid === caller.uid) throw new HttpsError("invalid-argument", "Cannot delete yourself");

  const deleteByField = async (col, field) => {
    const snap = await db.collection(col).where(field, "==", uid).get();
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    if (!snap.empty) await batch.commit();
  };

  await Promise.all([
    deleteByField("likes", "fromId"),
    deleteByField("likes", "toId"),
    deleteByField("visits", "visitorId"),
    deleteByField("visits", "visitedId"),
    deleteByField("pings", "fromUserId"),
    deleteByField("pings", "toUserId"),
    deleteByField("checkins", "userId"),
    deleteByField("tickets", "userId"),
    deleteByField("chill_requests", "user_uid"),
    deleteByField("reports", "reportedBy"),
    deleteByField("matches", "users"),
  ]);

  const blocksSnap = await db.collection("users").doc(uid).collection("blocks").get();
  if (!blocksSnap.empty) {
    const batch = db.batch();
    blocksSnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  const earningsSnap = await db.collection("users").doc(uid).collection("earnings").get();
  if (!earningsSnap.empty) {
    const batch = db.batch();
    earningsSnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  await Promise.all([
    db.collection("locations").doc(uid).delete(),
    db.collection("verifications").doc(uid).delete(),
    db.collection("subscriptions").doc(uid).delete(),
    db.collection("partner_applications").doc(uid).delete().catch(() => {}),
  ]);

  try {
    const bucket = admin.storage().bucket();
    const [files] = await bucket.getFiles({ prefix: `profilePictures/${uid}/` });
    await Promise.all(files.map((f) => f.delete()));
  } catch (e) {
    console.warn("Storage cleanup failed:", e.message);
  }

  await db.collection("users").doc(uid).delete();
  await admin.auth().deleteUser(uid);

  return { success: true, uid };
});

exports.approveRRPP = onCall({ enforceAppCheck: false }, async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError('unauthenticated', 'Login requerido.');

  const callerClaims = (await admin.auth().getUser(auth.uid)).customClaims || {};
  if (callerClaims.role !== 'superadmin' && callerClaims.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Solo un administrador puede aprobar solicitudes RRPP.');
  }

  const { applicationId, action } = data;
  if (!applicationId || !action) {
    throw new HttpsError('invalid-argument', 'applicationId y action son obligatorios.');
  }

  const appDoc = await db.collection('rrpp_applications').doc(applicationId).get();
  if (!appDoc.exists) throw new HttpsError('not-found', 'Solicitud no encontrada.');

  const appData = appDoc.data();
  if (appData.status !== 'pending') {
    throw new HttpsError('failed-precondition', 'Esta solicitud ya fue procesada.');
  }

  if (action === 'reject') {
    await appDoc.ref.update({
      status: 'rejected',
      reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
      reviewedBy: auth.uid
    });
    return { success: true, message: 'Solicitud rechazada.' };
  }

  if (action === 'approve') {
    const targetUid = appData.uid;

    const existingClaims = (await admin.auth().getUser(targetUid)).customClaims || {};
    await admin.auth().setCustomUserClaims(targetUid, { ...existingClaims, role: 'rrpp' });

    await db.collection('users').doc(targetUid).update({
      role: 'rrpp',
      qr_quota: 0,
      phone: appData.phone,
      city: appData.city
    });

    await appDoc.ref.update({
      status: 'approved',
      reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
      reviewedBy: auth.uid
    });

    return { success: true, message: 'RRPP aprobado correctamente.' };
  }

  throw new HttpsError('invalid-argument', 'Acción no válida. Usa "approve" o "reject".');
});

exports.submitRRPPApplication = onCall({ enforceAppCheck: false }, async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError('unauthenticated', 'Login requerido.');

  const { phone, city, nick, email } = data;
  if (!phone || !city) {
    throw new HttpsError('invalid-argument', 'Teléfono y ciudad son obligatorios.');
  }

  const uid = auth.uid;

  try {
    // 1. Guardar la solicitud
    await db.collection('rrpp_applications').doc(uid).set({
      uid,
      email: email || auth.token.email || '',
      nick: nick || '',
      phone,
      city,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 2. Capar la cuenta del usuario cambiándole el rol
    // Nota: Mantenemos sus claims por si acaso, o los actualizamos si fuera necesario, 
    // pero principalemente actualizamos su doc de user.
    await db.collection('users').doc(uid).update({
      role: 'pending_rrpp'
    });

    return { success: true, message: 'Solicitud enviada correctamente.' };
  } catch (error) {
    console.error('Error enviando solicitud RRPP:', error);
    throw new HttpsError('internal', 'Error al procesar la solicitud.');
  }
});
