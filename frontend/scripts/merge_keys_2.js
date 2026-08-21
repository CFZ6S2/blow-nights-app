const fs = require('fs');
const path = require('path');

const esPath = path.join(__dirname, 'src', 'i18n', 'locales', 'es.json');
let es = JSON.parse(fs.readFileSync(esPath, 'utf8'));

const phase3_1_keys = {
  "rrppChat": {
    "directChannel": "Canal Directo con Central / Admin",
    "supportDesc": "Soporte técnico, recargas e incidencias de fiesta",
    "placeholder": "Escribe un mensaje al admin...",
    "send": "Enviar"
  },
  "rrppBuyCredits": {
    "title": "Tienda de Créditos",
    "rechargeQrs": "Recarga QRs",
    "buyDesc": "Compra paquetes de entradas para seguir emitiendo en tus fiestas.",
    "pack50": "Pack 50 Entradas",
    "pack50Desc": "Válido para cualquier fiesta. 0,50€ por QR.",
    "processing": "Procesando...",
    "buyNow": "Comprar Ahora",
    "mostPopular": "Más Popular",
    "pack100": "Pack 100 Entradas",
    "pack100Desc": "La mejor opción para grandes eventos."
  },
  "rrppProfile": {
    "title": "Perfil Profesional",
    "myAccount": "Mi Cuenta",
    "accountDesc": "Datos y ajustes de tu cuenta de promotor.",
    "promoter": "Promotor",
    "contactPhone": "Teléfono de Contacto",
    "notSpecified": "No especificado",
    "operatingCity": "Ciudad de Operación",
    "logout": "Cerrar Sesión"
  },
  "organizer": {
    "promoterTeam": "Equipo RRPP",
    "newPromoterPlaceholder": "Nombre del nuevo RRPP...",
    "add": "Añadir",
    "loading": "Cargando...",
    "noPromoters": "No hay RRPPs asignados a este evento.",
    "closedLabel": "CERRADO",
    "copyLink": "Copiar Enlace",
    "orgLiquidated": "Organizador: Liquidado",
    "orgPending": "Organizador: Pendiente",
    "rrppConfirmed": "RRPP: Confirmado",
    "rrppPending": "RRPP: Pendiente",
    "closeList": "Cerrar Lista",
    "cancelPayment": "Anular Pago",
    "markPaid": "Marcar Pagado",
    "dashboardTitle": "Organizador",
    "controlPanel": "Panel de Control",
    "manageEvents": "Gestiona tus eventos independientes y controla tus ventas.",
    "totalRevenue": "Ingresos Totales",
    "totalAttendees": "Asistentes Totales",
    "myEvents": "Mis Eventos",
    "cancel": "Cancelar",
    "newEvent": "+ Nuevo Evento",
    "createNewEvent": "Crear Nuevo Evento",
    "eventTitleLabel": "Título del Evento",
    "eventTitlePlaceholder": "Ej. Sábado Loco - Winter Edition",
    "descriptionLabel": "Descripción",
    "descriptionPlaceholder": "Detalles de la fiesta...",
    "cityIdLabel": "Ciudad (ID)",
    "cityIdPlaceholder": "ej. madrid, barcelona...",
    "startDateTimeLabel": "Fecha y Hora de Inicio",
    "flyerLabel": "Cartel / Flyer (Opcional)",
    "tiersTitle": "Tipos de Entrada (Tiers)",
    "addTier": "+ Añadir",
    "tierNameLabel": "Nombre",
    "tierNamePlaceholder": "Ej. General",
    "tierPriceLabel": "Precio (€)",
    "tierQuotaLabel": "Cupo (Aforo)",
    "tierPerksLabel": "Perks (Opcional)",
    "tierPerksPlaceholder": "1 Copa...",
    "saving": "Guardando...",
    "publishEvent": "Publicar Evento",
    "noEvents": "Aún no has creado ningún evento",
    "noEventsDesc": "Los eventos que crees aparecerán aquí y en el feed público de la ciudad.",
    "dateNotDefined": "Fecha no definida",
    "tickets": "Tickets",
    "doorLinkTitle": "Enlace de Portero (Scanner)",
    "copyDoorLinkTooltip": "Copiar Enlace para Puerta",
    "confirmCloseRRPP": "¿Seguro que quieres cerrar las listas de este RRPP? Ya no podrá generar más entradas.",
    "rrppLinkCopied": "Enlace del RRPP copiado. ¡Envíalo por WhatsApp!",
    "titleCityDateRequired": "Título, ciudad y fecha son obligatorios",
    "errorCreatingEvent": "Error al crear el evento: ",
    "magicLinkCopied": "Enlace copiado al portapapeles. ¡Envíalo por WhatsApp a tus porteros!"
  },
  "orgReg": {
    "back": "Volver",
    "requestSent": "Solicitud Enviada",
    "requestPendingDesc": "Tu solicitud para ser Organizador de Eventos está pendiente de aprobación. Recibirás acceso cuando un administrador la revise.",
    "requestNotify": "Te notificaremos cuando tu solicitud sea revisada.",
    "becomeOrganizer": "Conviértete en Organizador",
    "organizeEvents": "Organiza tus propios eventos",
    "organizeDesc": "Si quieres organizar fiestas o eventos bajo tu propia marca y vender entradas de forma independiente a los locales, envía tu solicitud y un administrador la revisará.",
    "loginToContinue": "Inicia Sesión para Continuar",
    "baseCity": "Tu Ciudad Base",
    "baseCityPlaceholder": "Ej: Madrid, Barcelona, Valencia...",
    "phone": "Teléfono (WhatsApp)",
    "phonePlaceholder": "+34 600 000 000",
    "sending": "Enviando...",
    "sendRequest": "Enviar Solicitud",
    "phoneCityRequired": "Por favor, introduce tu teléfono y ciudad.",
    "errorSending": "Error al enviar la solicitud: "
  }
};

const phase3_2_keys = {
  "business": {
    "claim": {
      "default_venue": "tu local",
      "alert_success": "Solicitud de reclamo enviada. Un agente de Blow Nights se pondrá en contacto contigo.",
      "title": "Reclama el control de",
      "description": "Tus promotores (RRPPs) ya están utilizando <1>Blow Nights</1> para gestionar listas y accesos en tu local de forma independiente.",
      "benefits_title": "Al reclamar tu local podrás:",
      "benefits_1": "Ver la recaudación en tiempo real.",
      "benefits_2": "Auditar los escaneos de puerta (cero fraude).",
      "benefits_3": "Añadir o bloquear RRPPs en un clic.",
      "form": {
        "name_label": "Tu Nombre",
        "name_placeholder": "Ej: Mario",
        "phone_label": "Teléfono (WhatsApp)",
        "submit": "Reclamar Local Ahora"
      },
      "footer_note": "Proceso gratuito. Un gestor verificará tu identidad como propietario o gerente."
    },
    "login": {
      "error": {
        "no_permissions": "Esta cuenta no tiene permisos de gestión de local. Contacta con soporte.",
        "google_login": "Error al iniciar sesión con Google.",
        "register_failed": "Error al crear la cuenta. Intenta con otra contraseña.",
        "invalid_credentials": "Email o contraseña incorrectos."
      },
      "subtitle_register": "Crea tu cuenta corporativa",
      "subtitle_login": "Accede a tu panel de gestión",
      "form": {
        "email_label": "Email Corporativo",
        "password_label": "Contraseña",
        "submit_register": "Crear Cuenta",
        "submit_login": "Entrar al Panel"
      },
      "or_continue_with": "O continúa con",
      "toggle_login": "¿Ya tienes cuenta? Inicia sesión",
      "toggle_register": "¿No tienes cuenta? Registra tu empresa"
    },
    "stripe": {
      "error": {
        "no_venue": "No tienes ningún local asignado.",
        "venue_not_found": "Local no encontrado.",
        "no_link": "No se pudo generar el enlace de Stripe.",
        "connect_error": "Error conectando con Stripe: "
      },
      "title": "Cobros y Ticketing",
      "subtitle": "Gestiona cómo recibes el dinero de tus entradas",
      "message": {
        "cancelled": "Has cancelado el proceso o la sesión expiró. Por favor, vuelve a intentarlo.",
        "success": "¡Proceso completado! Stripe está verificando tus datos. Pronto podrás empezar a cobrar entradas."
      },
      "account_linked": "Cuenta de pagos vinculada",
      "description_linked": "Todo está listo. Cuando vendas una entrada, el dinero de la venta (descontando los gastos de gestión) se transferirá automáticamente a tu cuenta bancaria a través de Stripe.",
      "update_bank_details": "Actualizar mis datos bancarios",
      "step_1": "Conecta tu cuenta bancaria mediante la pasarela segura de Stripe Express.",
      "step_2": "Vende entradas a través de la App de Blow Nights o enlaces de RRPP.",
      "step_3": "Recibe el 100% del precio de tu entrada directamente en tu banco (Blow Nights cobra los gastos de gestión al comprador).",
      "connecting": "Conectando...",
      "setup_bank_account": "Configurar Cuenta Bancaria",
      "footer_note": "El proceso de alta tarda solo 3 minutos. Ten a mano tu DNI/CIF y tu número de cuenta (IBAN)."
    }
  },
  "common": {
    "loading": "Cargando...",
    "processing": "Procesando..."
  },
  "buy": {
    "error": {
      "no_payment": "No se pudo generar el pago.",
      "payment_init_error": "Error iniciando pago",
      "tier_sold_out": "Entradas agotadas para este tramo."
    },
    "invalid_link": {
      "title": "Enlace invalido",
      "description": "Faltan parametros de evento."
    },
    "sold_out": {
      "title": "Entradas agotadas",
      "description": "No quedan entradas disponibles para este evento."
    },
    "secure_purchase": "COMPRA SEGURA",
    "buy_ticket": "Comprar Entrada",
    "qr_generated_instantly": "Tu codigo QR se genera al instante tras el pago.",
    "ticket_type_label": "Tipo de entrada",
    "available": "disponibles",
    "default_ticket_name": "Entrada",
    "platform_fee": "Gastos de gestion",
    "total": "Total",
    "redirecting_to_stripe": "Redirigiendo a Stripe...",
    "pay": "Pagar",
    "secure_payment_stripe": "Pago seguro via Stripe"
  },
  "pass": {
    "loading_pass": "Cargando Pase...",
    "error": {
      "not_found_title": "Pase No Encontrado",
      "not_found_desc": "Este pase no existe o es inválido.",
      "access_denied_title": "Acceso Denegado",
      "access_denied_desc": "Este pase no te pertenece."
    },
    "official_pass": "Pase Oficial",
    "default_event_title": "Entrada RRPP",
    "default_venue_name": "Local Verificado",
    "ticket_type_label": "Tipo de Pase",
    "default_tier_name": "Entrada General",
    "guest_prefix": "Invitado: ",
    "anonymous": "Anónimo",
    "official_promoter": "Oficial",
    "door_pin": "PIN de Puerta (Sin Cámara)",
    "presentation_instruction": "Presenta esta pantalla al llegar a la puerta. No se admiten capturas de pantalla estáticas."
  }
};

const phase4Path = 'c:\\Users\\cesar\\.gemini\\antigravity\\brain\\a0bf4838-172e-42d9-a7df-e8c229de3c8b\\scratch\\phase4.json';
const phase4_keys = fs.existsSync(phase4Path) ? JSON.parse(fs.readFileSync(phase4Path, 'utf8')) : {};

// Deep merge for overlapping nested keys like `business` or `pass` if they existed in es.json already.
// Lodash isn't strictly necessary, we can just do Object.assign but some are nested.
function isObject(item) {
  return (item && typeof item === 'object' && !Array.isArray(item));
}
function mergeDeep(target, ...sources) {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        mergeDeep(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return mergeDeep(target, ...sources);
}

const mergedEs = mergeDeep({}, es, phase3_1_keys, phase3_2_keys, phase4_keys);

fs.writeFileSync(esPath, JSON.stringify(mergedEs, null, 2));
console.log('es.json updated with phase 3 & 4 successfully!');
