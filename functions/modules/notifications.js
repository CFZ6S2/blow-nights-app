const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { admin, db, haversineKm } = require("../lib/init");

exports.sendMessageNotification = onDocumentCreated("chats/{chatId}/messages/{messageId}", async (event) => {
  const message = event.data?.data();
  if (!message) return null;
  const chatId = event.params.chatId;

  const chatDoc = await db.collection("chats").doc(chatId).get();
  const chatData = chatDoc.data();
  if (!chatData) return null;

  const receiverId = chatData.users.find(uid => uid !== message.senderId);
  if (!receiverId) return null;

  const activeUsers = chatData.activeUsers || [];
  if (activeUsers.includes(receiverId)) {
    console.log(`Usuario ${receiverId} activo en chat ${chatId}. Saltando notificación.`);
    return null;
  }

  const [receiverDoc, senderDoc, blockDoc] = await Promise.all([
    db.collection("users").doc(receiverId).get(),
    db.collection("users").doc(message.senderId).get(),
    db.collection("users").doc(receiverId).collection("blocks").doc(message.senderId).get()
  ]);

  if (blockDoc.exists) {
    console.log(`Usuario ${message.senderId} bloqueado por ${receiverId}. Saltando notificación.`);
    return null;
  }

  const receiverData = receiverDoc.data();
  const senderData = senderDoc.data();

  if (!receiverData?.fcmToken) return null;

  const payload = {
    token: receiverData.fcmToken,
    notification: {
      title: `Nuevo mensaje de ${senderData?.nick || "Alguien"}`,
      body: message.content,
    },
    data: {
      type: "chat",
      chatId: chatId,
      click_action: `https://blownights.com/chat/detail?id=${chatId}`
    }
  };

  try {
    await admin.messaging().send(payload);
  } catch (error) {
    console.error("Error FCM Message:", error);
  }
  return null;
});

exports.sendLikeNotification = onDocumentCreated("likes/{likeId}", async (event) => {
  const likeData = event.data?.data();
  if (!likeData || likeData.isMatch) return null;

  const [receiverDoc, senderDoc] = await Promise.all([
    db.collection("users").doc(likeData.toId).get(),
    db.collection("users").doc(likeData.fromId).get()
  ]);

  const receiverData = receiverDoc.data();
  const senderData = senderDoc.data();

  if (!receiverData?.fcmToken) return null;

  const payload = {
    token: receiverData.fcmToken,
    notification: {
      title: "¡Alguien te dio like! ❤️",
      body: `${senderData?.nick || "Un usuario"} está interesado en ti.`,
    },
    data: {
      type: "like",
      senderId: likeData.fromId,
      click_action: "https://blownights.com/visits"
    }
  };

  try {
    await admin.messaging().send(payload);
  } catch (error) {
    console.error("Error FCM Like:", error);
  }
  return null;
});

exports.sendMatchNotification = onDocumentCreated("matches/{matchId}", async (event) => {
  const matchData = event.data?.data();
  if (!matchData) return null;

  const sendToUser = async (targetId, otherId) => {
    const [targetDoc, otherDoc] = await Promise.all([
      db.collection("users").doc(targetId).get(),
      db.collection("users").doc(otherId).get()
    ]);

    const tData = targetDoc.data();
    const oData = otherDoc.data();

    if (!tData?.fcmToken) return;

    const payload = {
      token: tData.fcmToken,
      notification: {
        title: "¡ES UN MATCH! 🔥",
        body: `Tú y ${oData?.nick || "alguien"} os habéis gustado. ¡Saluda!`,
      },
      data: {
        type: "match",
        matchId: event.data.id,
        click_action: `https://blownights.com/chat`
      }
    };

    try {
      await admin.messaging().send(payload);
    } catch (e) {
      console.error("Error FCM Match:", e);
    }
  };

  await Promise.all([
    sendToUser(matchData.users[0], matchData.users[1]),
    sendToUser(matchData.users[1], matchData.users[0])
  ]);

  return null;
});

exports.sendVisitNotification = onDocumentCreated("visits/{visitId}", async (event) => {
  const visitData = event.data?.data();
  if (!visitData) return null;

  const receiverDoc = await db.collection("users").doc(visitData.visitedId).get();
  const receiverData = receiverDoc.data();

  if (!receiverData?.fcmToken) return null;

  const senderDoc = await db.collection("users").doc(visitData.visitorId).get();
  const senderData = senderDoc.data();

  const payload = {
    token: receiverData.fcmToken,
    notification: {
      title: "¡Visita nueva! 👀",
      body: `${senderData?.nick || "Alguien"} ha cotilleado tu perfil.`,
    },
    data: {
      type: "visit",
      visitorId: visitData.visitorId,
      click_action: "https://blownights.com/visits"
    }
  };

  try {
    await admin.messaging().send(payload);
  } catch (error) {
    console.error("Error FCM Visit:", error);
  }
  return null;
});

exports.sendPingNotification = onDocumentCreated("pings/{pingId}", async (event) => {
  const pingData = event.data?.data();
  if (!pingData) return null;

  const receiverDoc = await db.collection("users").doc(pingData.toUserId).get();
  const receiverData = receiverDoc.data();
  if (!receiverData?.fcmToken) return null;

  const senderDoc = await db.collection("users").doc(pingData.fromUserId).get();
  const senderData = senderDoc.data();

  let notificationTitle = `🔥 ${senderData?.nick || "Alguien"} te ha dado un Toque: ¡Quiere saber de ti esta noche!`;
  let notificationBody = "«¿Qué tal está el ambiente?»";

  if (pingData.venueId) {
    const venueDoc = await db.collection("venues").doc(pingData.venueId).get();
    if (venueDoc.exists) {
      const venueName = venueDoc.data().name || "la fiesta";
      notificationTitle = `🔥 ${senderData?.nick || "Alguien"} te ha dado un Toque desde ${venueName}`;
      notificationBody = "«¡Vente que esto está que arde!»";
    }
  }

  if (senderData && !senderData.isVIPNight && senderData.dailyPingsLeft > 0) {
    await db.collection("users").doc(pingData.fromUserId).update({
      dailyPingsLeft: admin.firestore.FieldValue.increment(-1)
    });
  }

  const payload = {
    token: receiverData.fcmToken,
    notification: {
      title: notificationTitle,
      body: notificationBody,
    },
    data: {
      type: "ping",
      fromUserId: pingData.fromUserId,
      venueId: pingData.venueId || "",
      click_action: `https://blownights.com/profile/view?id=${pingData.fromUserId}&pingVenueId=${pingData.venueId || ''}`
    }
  };

  try {
    await admin.messaging().send(payload);
  } catch (error) {
    console.error("Error FCM Ping:", error);
  }
  return null;
});

exports.sendPromoNotification = onDocumentCreated("promotions/{promoId}", async (event) => {
  const promo = event.data?.data();
  if (!promo?.venueId) return null;

  const venueDoc = await db.collection("venues").doc(promo.venueId).get();
  if (!venueDoc.exists) return null;
  const venue = venueDoc.data();

  const usersSnap = await db.collection("users")
    .where("fcmToken", "!=", "")
    .get();

  if (usersSnap.empty) return null;

  const radiusKm = promo.radiusKm || 5;
  const tokens = [];

  usersSnap.forEach((doc) => {
    const u = doc.data();
    if (!u.fcmToken || !u.lat || !u.lng) return;
    const dist = haversineKm(venue.location.latitude, venue.location.longitude, u.lat, u.lng);
    if (dist <= radiusKm) {
      tokens.push(u.fcmToken);
    }
  });

  if (!tokens.length) return null;

  const message = {
    notification: {
      title: `🔥 ${venue.name}`,
      body: promo.text,
    },
    data: {
      type: "promo",
      venueId: promo.venueId,
      promoId: event.data.id,
    },
  };

  const batchSize = 500;
  for (let i = 0; i < tokens.length; i += batchSize) {
    const batch = tokens.slice(i, i + batchSize);
    await admin.messaging().sendEachForMulticast({
      tokens: batch,
      ...message,
    });
  }

  console.log(`Promo ${event.data.id} sent to ${tokens.length} users within ${radiusKm}km.`);
  return null;
});
