# 👥 Matriz de Roles y Permisos en Blow Nights & Dark Nights

Este documento especifica de forma definitiva la arquitectura de permisos, capacidades y accesos de cada rol dentro de la plataforma.

---

## 1. 👤 Usuario Final (`user` / `party_only`)
- **Registro:** Registro estándar desde la app cliente (`/login` o `/setup-profile`).
- **Vista Principal:** Mapa de locales, eventos y Chills (`/[city]`), Wallet de entradas, perfil personal, chat.
- **Capacidades:**
  - Comprar entradas y pases VIP.
  - Suscribirse a niveles de membresía (*User Plus* o *User Black*).
  - Enviar *Pings* y chatear con otros usuarios.
  - **Unirse a un Chill:** Requiere suscripción **User Plus / VIP** o superior.
  - **Crear un Chill:** Exclusivo para usuarios con suscripción **User Black**.

---

## 2. 🎟️ Relaciones Públicas / Promotor (`rrpp`)
- **Registro:** Formulario de solicitud de RRPP (`/rrpp/register`).
- **Vista Principal:** Dashboard de RRPP (`/rrpp`), Gestión de Créditos (`/rrpp/comprar-creditos`), Perfil de Promotor.
- **Capacidades:**
  - Comprar paquetes de créditos QR de RRPP.
  - Generar enlaces/QRs de invitación con descuento o beneficio de puerta.
  - Ganar comisiones automáticas abonadas cuando el portero escanea su QR en la entrada.
  - Chatear con organizadores y dueños de locales.

---

## 3. 🪩 Organizador de Eventos (`event_organizer`)
- **Registro:** Solicitud desde cuenta de usuario existente (`/organizer/register`).
- **Vista Principal:** Panel de Organizador (`/organizer`), Gestión de Eventos e Ingresos.
- **Capacidades:**
  - Publicar eventos indicando fecha, lugar, tramos de precios y aforo.
  - Comprar packs de créditos QR para control de acceso.
  - Asignar RRPPs a sus eventos para venta por comisión.
  - Generar enlaces mágicos de escaneo para el personal de puerta.

---

## 4. 🍸 Propietario de Local (`venueOwner` / `venue`)
- **Registro:** Portal de empresas (`/business/login` o `/business/claim`).
- **Vista Principal:** Panel de Negocio (`/business`), Onboarding Bancario (`/business/stripe`).
- **Capacidades:**
  - Vincular su cuenta bancaria mediante **Stripe Connect Express** para cobros automáticos.
  - Crear entradas y pases con múltiples tramos de precio (*Early Bird*, *General*, *VIP*).
  - Obtener enlaces públicos de venta directa para redes sociales o web.
  - Asignar RRPPs para la venta de sus eventos/entradas.
  - Modificar información del local (horarios, fotos, servicios).

---

## 5. 🚪 Controlador de Acceso / Portero (Sin Cuenta)
- **Registro:** **No requiere registro ni cuenta en la app.**
- **Vista Principal:** Escáner QR de cámara web/móvil vía enlace mágico (`/scanner` o enlace tokenizado).
- **Capacidades:**
  - Recibir un enlace mágico por WhatsApp enviado por el organizador o dueño del local.
  - Escanear entradas QR de asistentes para validar acceso y actualizar aforo en tiempo real.
  - Escanear QRs de RRPPs para validar llegada y registrar su comisión.

---

## 6. 🌍 Embajador de Marca (`ambassador`)
- **Registro:** Asignación directa por administración.
- **Vista Principal:** Dashboard de Embajador (`/ambassador`).
- **Capacidades:**
  - Generar enlaces de referido para captar usuarios, locales u organizadores.
  - Visualizar métricas de conversión y comisiones pasivas acumuladas.
  - Recibir transferencias automáticas a su banco vía Stripe Connect.

---

## 7. 🏙️ Franquiciado / City Manager (`cityAdmin`)
- **Registro:** Asignación directa por SuperAdmin por territorio.
- **Vista Principal:** Panel de Control de Ciudad (`/city-manager`, `/partners`).
- **Capacidades:**
  - Aprobar o rechazar nuevos locales y organizadores en su ciudad.
  - Monitorizar facturación, asistencia y métricas comerciales de su territorio.
  - **Nota de Permiso:** **NO puede configurar comisiones territoriales** (función exclusiva de SuperAdmin).

---

## 8. 👑 Super Administrador (`superadmin` / `admin`)
- **Registro:** Credenciales maestras de plataforma.
- **Vista Principal:** Panel de Control Global (`/super-admin`).
- **Capacidades:**
  - Control total sobre usuarios, roles, ciudades, facturación y locales.
  - Configurar las comisiones territoriales y de plataforma (`territorialSplit`).
  - Cambiar el rol de cualquier usuario al instante.
  - Gestionar integraciones y configuraciones globales de Stripe y Firebase.
