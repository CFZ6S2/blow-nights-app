const fs = require('fs');
const path = require('path');

const esPath = path.join(__dirname, 'src', 'i18n', 'locales', 'es.json');
let es = JSON.parse(fs.readFileSync(esPath, 'utf8'));

const part1 = {
  "chill": {
    "error_requesting": "Error al solicitar acceso",
    "confirm_close": "Cerrar el chill? Ya no se aceptaran solicitudes.",
    "anon": "Anon",
    "not_found": "Chill no encontrado",
    "expired_or_deleted": "Puede haber expirado o sido eliminado.",
    "back_to_radar": "Volver al Radar",
    "back": "Volver",
    "organized_by": "Organiza:",
    "status_closed": "CERRADO",
    "status_full": "LLENO",
    "spots": "plazas",
    "address": "Direccion",
    "loading": "Cargando...",
    "location": "Ubicacion",
    "location_hidden": "La direccion exacta se revela cuando el anfitrion acepta tu solicitud",
    "has_pass": "Tienes Pase",
    "request_denied": "Solicitud denegada",
    "waiting_approval": "Esperando aprobacion del anfitrion...",
    "requesting": "Solicitando...",
    "request_pass": "Pedir Pase",
    "unlock_access": "Desbloquear Acceso",
    "close_chill": "Cerrar Chill",
    "tab_info": "Info",
    "tab_requests": "Solicitudes",
    "tab_chat": "Chat",
    "no_requests": "Sin solicitudes pendientes",
    "years_old": "anos",
    "accept": "Aceptar",
    "deny": "Denegar",
    "no_messages": "Sin mensajes aun",
    "start_conversation": "Empieza la conversacion",
    "write_message": "Escribe un mensaje..."
  },
  "profile": {
    "delete_error": "No se pudo eliminar la cuenta.",
    "role_promoter": "Promotor / RRPP",
    "role_staff": "Staff / Oficial",
    "role_party_only": "Solo Fiesta",
    "bridge_title": "¿Buscas el Circuito General?",
    "bridge_desc": "Descubre quién sale hoy en Fabrik, Shôko y el resto del ocio comercial.",
    "bridge_alert": "¡Próximamente! Activarás tu cuenta en Dark Nights con tu mismo perfil y compras.",
    "bridge_activated": "¡Activado!",
    "bridge_btn": "⚡ Pásate a Dark Nights",
    "gps_blocked_desc": "Has ignorado o bloqueado la solicitud de ubicación varias veces. Para aparecer en el mapa, sigue estos pasos:",
    "gps_step_1_start": "Pulsa el icono",
    "gps_step_1_end": "junto a la URL.",
    "gps_step_2": "Selecciona \"Restablecer permiso\" o activa \"Ubicación\".",
    "gps_step_3": "Refresca la página y pulsa de nuevo en \"VOLVERME VISIBLE\".",
    "cruising_mode_active_desc": "Activo: tus check-ins son siempre anónimos (+1), tu ubicación se difumina a 150m y tu foto no aparece en listados de locales.",
    "share_text": "¡Únete a Blow Nights! Tu circuito nocturno LGTBIQ+ en vivo. 🏳️‍🌈🚀",
    "share_copied": "¡Enlace copiado al portapapeles! Envíalo a tus amigos.",
    "share_prompt": "Copia este enlace para invitar a tus amigos:",
    "verify_prompt": "Sube una foto tuya (selfie) para verificar tu identidad. Esta foto solo será vista por los administradores.",
    "verify_sent": "¡Solicitud enviada! Revisaremos tu perfil en las próximas 24h.",
    "verify_error": "Error al enviar la solicitud. Inténtalo de nuevo."
  }
};

const part2Path = 'C:\\Users\\cesar\\.gemini\\antigravity\\brain\\f541f644-3568-45c2-b6c1-26af1d66dd32\\scratch\\city_pages_2.json';
const part2 = fs.existsSync(part2Path) ? JSON.parse(fs.readFileSync(part2Path, 'utf8')) : {};

const part3Path = 'C:\\Users\\cesar\\.gemini\\antigravity\\brain\\2cef4a9d-73aa-4a54-8daf-92ad46cf2486\\scratch\\city_pages_3.json';
const part3 = fs.existsSync(part3Path) ? JSON.parse(fs.readFileSync(part3Path, 'utf8')) : {};

es = { ...es, ...part1, ...part2, ...part3 };

fs.writeFileSync(esPath, JSON.stringify(es, null, 2));
console.log('es.json updated successfully!');
