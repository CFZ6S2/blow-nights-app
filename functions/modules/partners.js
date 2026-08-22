const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { admin, db } = require("../lib/init");

exports.requestPartnerAccess = onCall(async (request) => {
  const { data } = request;

  const { name, email, phone, cityId } = data;
  if (!name || !email || !phone) {
    throw new HttpsError('invalid-argument', 'Nombre, email y teléfono son obligatorios.');
  }

  try {
    await db.collection('partner_applications').add({
      name,
      email: email.toLowerCase().trim(),
      phone,
      cityId: cityId || 'other',
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, message: 'Solicitud enviada correctamente.' };
  } catch (error) {
    console.error('Error enviando solicitud de partner:', error);
    throw new HttpsError('internal', 'Error al procesar la solicitud.');
  }
});

exports.approvePartnerAccess = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError('unauthenticated', 'Login requerido.');

  const callerClaims = (await admin.auth().getUser(auth.uid)).customClaims || {};
  if (callerClaims.role !== 'superadmin' && callerClaims.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Solo un administrador puede aprobar solicitudes de partner.');
  }

  const { applicationId, action } = data;
  if (!applicationId || !action) {
    throw new HttpsError('invalid-argument', 'applicationId y action son obligatorios.');
  }

  const appDoc = await db.collection('partner_applications').doc(applicationId).get();
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
    let targetUid;
    let isNewUser = false;
    let passwordResetLink = null;

    try {
      const userRecord = await admin.auth().getUserByEmail(appData.email);
      targetUid = userRecord.uid;
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        const newUser = await admin.auth().createUser({
          email: appData.email,
          emailVerified: true,
          displayName: appData.name,
        });
        targetUid = newUser.uid;
        isNewUser = true;

        try {
          passwordResetLink = await admin.auth().generatePasswordResetLink(appData.email);
        } catch(e) {
          console.error("Error generating password reset link:", e);
        }
      } else {
        throw new HttpsError('internal', 'Error al verificar usuario en Auth.');
      }
    }

    const existingClaims = (await admin.auth().getUser(targetUid)).customClaims || {};
    await admin.auth().setCustomUserClaims(targetUid, { ...existingClaims, role: 'venueOwner' });

    await db.collection('users').doc(targetUid).set({
      role: 'venueOwner',
      email: appData.email,
      nick: appData.name,
      phone: appData.phone,
      city: appData.cityId,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    await appDoc.ref.update({
      status: 'approved',
      reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
      reviewedBy: auth.uid,
      uid: targetUid
    });

    let msg = 'Partner aprobado correctamente.';
    if (isNewUser) {
      msg += ' Usuario creado en Auth.';
    }
    return {
      success: true,
      message: msg,
      isNewUser,
      passwordResetLink
    };
  }

  throw new HttpsError('invalid-argument', 'Acción no válida. Usa "approve" o "reject".');
});
