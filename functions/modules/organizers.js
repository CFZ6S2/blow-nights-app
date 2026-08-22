const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { admin, db, getStripe } = require("../lib/init");

exports.submitOrganizerApplication = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError('unauthenticated', 'Login requerido.');

  const { phone, city, nick, email } = data;
  if (!phone || !city) {
    throw new HttpsError('invalid-argument', 'Teléfono y ciudad son obligatorios.');
  }

  const uid = auth.uid;

  try {
    await db.collection('organizer_applications').doc(uid).set({
      uid,
      email: email || auth.token.email || '',
      nick: nick || '',
      phone,
      city,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await db.collection('users').doc(uid).update({
      role: 'pending_organizer'
    });

    return { success: true, message: 'Solicitud enviada correctamente.' };
  } catch (error) {
    console.error('Error enviando solicitud de organizador:', error);
    throw new HttpsError('internal', 'Error al procesar la solicitud.');
  }
});

exports.approveOrganizer = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError('unauthenticated', 'Login requerido.');

  const callerClaims = (await admin.auth().getUser(auth.uid)).customClaims || {};
  if (callerClaims.role !== 'superadmin' && callerClaims.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Solo un administrador puede aprobar solicitudes de organizador.');
  }

  const { applicationId, action } = data;
  if (!applicationId || !action) {
    throw new HttpsError('invalid-argument', 'applicationId y action son obligatorios.');
  }

  const appDoc = await db.collection('organizer_applications').doc(applicationId).get();
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
    await admin.auth().setCustomUserClaims(targetUid, { ...existingClaims, role: 'event_organizer' });

    await db.collection('users').doc(targetUid).update({
      role: 'event_organizer',
      phone: appData.phone,
      city: appData.city,
      qr_quota: 300
    });

    await appDoc.ref.update({
      status: 'approved',
      reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
      reviewedBy: auth.uid
    });

    return { success: true, message: 'Organizador aprobado correctamente.' };
  }

  throw new HttpsError('invalid-argument', 'Acción no válida. Usa "approve" o "reject".');
});
