# 🏗️ Arquitectura del Proyecto

## Frontend
- **Framework**: Next.js o React + Vite (Seleccionado: Next.js)
- **Estilos**: TailwindCSS
- **SDK**: Firebase Web SDK
- **Mapas**: Mapbox GL JS o Google Maps
- **PWA**: manifest.json + Service Worker para instalación y notificaciones offline.

## Backend (Serverless)
- **Autenticación**: Firebase Authentication (OTP SMS & Google).
- **Base de Datos**: Firestore (NoSQL) para perfiles, chats y estados.
- **Geolocalización**: GeoFire para consultas espaciales eficientes.
- **Almacenamiento**: Firebase Storage para fotos de perfil.
- **Lógica de Servidor**: Cloud Functions (Node.js).
- **Notificaciones**: Firebase Cloud Messaging (FCM).

## Pagos
- **Plataforma**: Stripe Checkout.
- **Flujo**:
  1. Frontend solicita sesión de checkout via Cloud Function.
  2. Stripe procesa el pago.
  3. Webhook de Stripe notifica a Cloud Function.
  4. Cloud Function actualiza el estado de suscripción en Firestore.
