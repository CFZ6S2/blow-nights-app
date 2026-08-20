const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { admin, db } = require("../lib/init");

exports.createChill = onCall({ enforceAppCheck: false }, async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError("unauthenticated", "Login requerido.");

  const isPremium = auth.token.premium === true;
  if (!isPremium && auth.token.role !== "admin") {
    throw new HttpsError("permission-denied", "Necesitas ser miembro Black para crear un chill.");
  }

  const { title, description, exact_address, approx_lat, approx_lng, max_capacity, city_slug, tags } = data;

  if (!title || !exact_address || !approx_lat || !approx_lng || !city_slug) {
    throw new HttpsError("invalid-argument", "Faltan campos obligatorios.");
  }

  const userDoc = await db.collection("users").doc(auth.uid).get();
  if (!userDoc.exists) throw new HttpsError("not-found", "Usuario no encontrado.");
  const user = userDoc.data();

  const capacity = Math.min(Math.max(parseInt(max_capacity) || 10, 2), 50);

  const chillRef = db.collection("chills").doc();
  const now = admin.firestore.FieldValue.serverTimestamp();
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);

  // Store exact_address in private subcollection, not in the public chill doc
  const batch = db.batch();
  batch.set(chillRef, {
    host_uid: auth.uid,
    host_nick: user.nick || "Anon",
    host_foto: user.fotoUrl || "",
    city_slug,
    title,
    description: description || "",
    approx_lat: parseFloat(approx_lat),
    approx_lng: parseFloat(approx_lng),
    max_capacity: capacity,
    accepted_users: [],
    pending_users: [],
    denied_users: [],
    status: "active",
    created_at: now,
    expires_at: admin.firestore.Timestamp.fromDate(expiresAt),
    boosted: false,
    tags: tags || [],
  });
  batch.set(chillRef.collection("private").doc("info"), {
    exact_address,
  });
  await batch.commit();

  return { success: true, chillId: chillRef.id };
});

exports.requestChillAccess = onCall({ enforceAppCheck: false }, async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError("unauthenticated", "Login requerido.");

  const { chillId } = data;
  if (!chillId) throw new HttpsError("invalid-argument", "chillId requerido.");

  const chillRef = db.collection("chills").doc(chillId);
  const chillDoc = await chillRef.get();
  if (!chillDoc.exists) throw new HttpsError("not-found", "Chill no encontrado.");
  const chill = chillDoc.data();

  if (chill.status !== "active") throw new HttpsError("failed-precondition", "Este chill ya no acepta solicitudes.");
  if (chill.host_uid === auth.uid) throw new HttpsError("failed-precondition", "Eres el anfitrión de este chill.");
  if (chill.accepted_users.includes(auth.uid)) throw new HttpsError("already-exists", "Ya estás aceptado.");
  if (chill.denied_users.includes(auth.uid)) throw new HttpsError("permission-denied", "Tu solicitud fue denegada.");
  if (chill.pending_users.includes(auth.uid)) throw new HttpsError("already-exists", "Ya tienes una solicitud pendiente.");

  const isPremium = auth.token.premium === true;
  const hasOldPass = auth.token.pass_expires && auth.token.pass_expires > Date.now();
  const hasBlackBoost = auth.token.blackBoostExpires && auth.token.blackBoostExpires > Date.now();
  
  if (!isPremium && !hasOldPass && !hasBlackBoost && auth.token.role !== "admin") {
    throw new HttpsError("permission-denied", "Necesitas ser miembro Black o tener un Pase Black 8h para solicitar acceso a chills.");
  }

  const userDoc = await db.collection("users").doc(auth.uid).get();
  const user = userDoc.data();

  const requestRef = chillRef.collection("requests").doc(auth.uid);
  await requestRef.set({
    user_uid: auth.uid,
    user_nick: user.nick || "Anon",
    user_foto: user.fotoUrl || "",
    user_edad: user.edad || null,
    user_bio: user.bio || "",
    status: "pending",
    created_at: admin.firestore.FieldValue.serverTimestamp(),
  });

  await chillRef.update({
    pending_users: admin.firestore.FieldValue.arrayUnion(auth.uid),
  });

  const hostDoc = await db.collection("users").doc(chill.host_uid).get();
  const hostToken = hostDoc.data()?.fcmToken;
  if (hostToken) {
    try {
      await admin.messaging().send({
        token: hostToken,
        notification: {
          title: "Solicitud de Pase",
          body: `${user.nick || "Alguien"} quiere unirse a tu chill "${chill.title}"`,
        },
        data: { type: "chill_request", chillId },
      });
    } catch (e) {
      console.warn("FCM send failed for chill request:", e.message);
    }
  }

  return { success: true };
});

exports.respondChillRequest = onCall({ enforceAppCheck: false }, async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError("unauthenticated", "Login requerido.");

  const { chillId, userId, action } = data;
  if (!chillId || !userId || !["accept", "deny"].includes(action)) {
    throw new HttpsError("invalid-argument", "chillId, userId y action (accept/deny) requeridos.");
  }

  const chillRef = db.collection("chills").doc(chillId);
  const chillDoc = await chillRef.get();
  if (!chillDoc.exists) throw new HttpsError("not-found", "Chill no encontrado.");
  const chill = chillDoc.data();

  if (chill.host_uid !== auth.uid) throw new HttpsError("permission-denied", "Solo el anfitrión puede responder.");

  const requestRef = chillRef.collection("requests").doc(userId);
  const requestDoc = await requestRef.get();
  if (!requestDoc.exists) throw new HttpsError("not-found", "Solicitud no encontrada.");

  if (action === "accept") {
    if (chill.accepted_users.length >= chill.max_capacity) {
      throw new HttpsError("resource-exhausted", "El chill está lleno.");
    }

    await requestRef.update({ status: "accepted" });
    await chillRef.update({
      accepted_users: admin.firestore.FieldValue.arrayUnion(userId),
      pending_users: admin.firestore.FieldValue.arrayRemove(userId),
      status: chill.accepted_users.length + 1 >= chill.max_capacity ? "full" : "active",
    });

    const userDoc = await db.collection("users").doc(userId).get();
    const userToken = userDoc.data()?.fcmToken;
    if (userToken) {
      try {
        await admin.messaging().send({
          token: userToken,
          notification: {
            title: "Pase Aceptado",
            body: `Te han aceptado en "${chill.title}". Ya puedes ver la dirección.`,
          },
          data: { type: "chill_accepted", chillId },
        });
      } catch (e) {
        console.warn("FCM send failed for chill accept:", e.message);
      }
    }
  } else {
    await requestRef.update({ status: "denied" });
    await chillRef.update({
      denied_users: admin.firestore.FieldValue.arrayUnion(userId),
      pending_users: admin.firestore.FieldValue.arrayRemove(userId),
    });
  }

  return { success: true, action };
});

exports.endChill = onCall({ enforceAppCheck: false }, async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError("unauthenticated", "Login requerido.");

  const { chillId } = data;
  const chillRef = db.collection("chills").doc(chillId);
  const chillDoc = await chillRef.get();
  if (!chillDoc.exists) throw new HttpsError("not-found", "Chill no encontrado.");
  if (chillDoc.data().host_uid !== auth.uid && auth.token.role !== "admin") {
    throw new HttpsError("permission-denied", "Solo el anfitrión puede cerrar.");
  }

  await chillRef.update({ status: "ended" });
  return { success: true };
});

exports.cleanupExpiredChills = onSchedule("every 30 minutes", async () => {
  const now = admin.firestore.Timestamp.now();
  const expired = await db.collection("chills")
    .where("expires_at", "<=", now)
    .where("status", "in", ["active", "full"])
    .get();

  const batch = db.batch();
  expired.docs.forEach((doc) => {
    batch.update(doc.ref, { status: "ended" });
  });

  if (!expired.empty) {
    await batch.commit();
    console.log(`Marked ${expired.size} expired chills as ended.`);
  }
});
