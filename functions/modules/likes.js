const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { admin, db } = require("../lib/init");

exports.sendLike = onCall({ enforceAppCheck: false }, async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError("unauthenticated", "Login requerido.");

  const { targetUserId, isSuper } = data;
  if (!targetUserId || typeof targetUserId !== "string") {
    throw new HttpsError("invalid-argument", "targetUserId requerido.");
  }
  if (targetUserId === auth.uid) {
    throw new HttpsError("invalid-argument", "No puedes darte like a ti mismo.");
  }

  const userDoc = await db.collection("users").doc(auth.uid).get();
  if (!userDoc.exists) throw new HttpsError("not-found", "Usuario no encontrado.");
  const sender = userDoc.data();

  const likeId = `${auth.uid}_${targetUserId}`;
  const reverseLikeId = `${targetUserId}_${auth.uid}`;

  const result = await db.runTransaction(async (tx) => {
    const likeRef = db.collection("likes").doc(likeId);
    const existingLike = await tx.get(likeRef);
    if (existingLike.exists) {
      return { isMatch: false, alreadyLiked: true };
    }

    const reverseLikeRef = db.collection("likes").doc(reverseLikeId);
    const reverseLikeSnap = await tx.get(reverseLikeRef);

    tx.set(likeRef, {
      fromId: auth.uid,
      toId: targetUserId,
      type: isSuper ? "superlike" : "like",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      fromNick: sender.nick || "Anónimo",
      fromFoto: sender.fotoUrl || "",
    });

    if (reverseLikeSnap.exists) {
      const reverseData = reverseLikeSnap.data();
      const chatId = [auth.uid, targetUserId].sort().join("_");
      const chatRef = db.collection("chats").doc(chatId);
      const chatSnap = await tx.get(chatRef);

      const matchRef = db.collection("matches").doc();
      tx.set(matchRef, {
        users: [auth.uid, targetUserId],
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        user1: { uid: auth.uid, nick: sender.nick || "Anónimo", foto: sender.fotoUrl || "" },
        user2: { uid: targetUserId, nick: reverseData.fromNick || "Usuario", foto: reverseData.fromFoto || "" },
      });

      if (!chatSnap.exists) {
        tx.set(chatRef, {
          users: [auth.uid, targetUserId],
          lastMessage: "",
          lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          typing: { [auth.uid]: false, [targetUserId]: false },
        });
      }

      return { isMatch: true, chatId, isSuperLike: !!isSuper };
    }

    return { isMatch: false };
  });

  return result;
});
