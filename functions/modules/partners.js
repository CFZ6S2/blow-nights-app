const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { admin, db } = require("../lib/init");

exports.requestPartnerAccess = onCall({ enforceAppCheck: false }, async (request) => {
  const { data } = request;

  const { name, email, phone, cityId, type, venueName } = data;
  if (!name || !email || !phone) {
    throw new HttpsError('invalid-argument', 'Nombre, email y teléfono son obligatorios.');
  }

  const applicationType = type === 'city_manager' ? 'city_manager' : 'venue';

  try {
    const doc = {
      name,
      email: email.toLowerCase().trim(),
      phone,
      cityId: cityId || 'other',
      type: applicationType,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    if (applicationType === 'venue' && venueName) {
      doc.venueName = venueName;
    }
    await db.collection('partner_applications').add(doc);

    return { success: true, message: 'Solicitud enviada correctamente.' };
  } catch (error) {
    console.error('Error enviando solicitud de partner:', error);
    throw new HttpsError('internal', 'Error al procesar la solicitud.');
  }
});

exports.approvePartnerAccess = onCall({ enforceAppCheck: false }, async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError('unauthenticated', 'Login requerido.');

  const callerClaims = (await admin.auth().getUser(auth.uid)).customClaims || {};
  
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

  const isSuperOrAdmin = callerClaims.role === 'superadmin' || callerClaims.role === 'admin';
  const isCityAdminForThisCity = callerClaims.role === 'cityAdmin' && callerClaims.cityId === appData.cityId;

  if (!isSuperOrAdmin && !isCityAdminForThisCity) {
    throw new HttpsError('permission-denied', 'No tienes permisos para aprobar esta solicitud.');
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

    let createdVenueId = null;
    if (appData.type === 'venue') {
      const newVenueRef = db.collection('venues').doc();
      await newVenueRef.set({
        name: appData.venueName || appData.name,
        cityId: appData.cityId || 'other',
        ownerId: targetUid,
        isActive: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      createdVenueId = newVenueRef.id;
    }

    const assignedRole = appData.type === 'city_manager' ? 'cityManager' : 'venueOwner';
    const existingClaims = (await admin.auth().getUser(targetUid)).customClaims || {};

    const protectedRoles = ['superadmin', 'admin', 'cityManager'];
    if (protectedRoles.includes(existingClaims.role)) {
      throw new HttpsError('failed-precondition',
        `El usuario ${appData.email} ya tiene rol "${existingClaims.role}". No se puede degradar a "${assignedRole}".`);
    }

    await admin.auth().setCustomUserClaims(targetUid, { ...existingClaims, role: assignedRole });

    const userUpdate = {
      role: assignedRole,
      email: appData.email,
      nick: appData.name,
      phone: appData.phone,
      city: appData.cityId,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    if (createdVenueId) {
      userUpdate.venueId = createdVenueId;
    }

    await db.collection('users').doc(targetUid).set(userUpdate, { merge: true });

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
