# 🏳️🌈 Gay Meet App (MVP)

Aplicación tipo Google Maps + WhatsApp para hombres gays/bisexuales que quieran conocer o quedar rápidamente.
Debe ser una **WebApp PWA** optimizada para móvil y construida sobre **Firebase**.

## 🎯 Objetivo del MVP
- Registro por **OTP** (teléfono) o **Google**
- Perfil básico: edad, rol, intención (conocer/quedar), nick, foto única
- Mapa con usuarios cercanos (ubicación aproximada)
- Chat en tiempo real
- Estado “disponible ahora”
- PWA instalable
- Preparado para pagos con **Stripe** cuando haya +1000 usuarios

## 🔥 Arquitectura Técnica
- **Frontend**: Next.js (App Router), TailwindCSS, Firebase Web SDK, Mapbox GL JS / Google Maps.
- **Backend**: Firebase Auth, Firestore, Cloud Functions, Cloud Messaging, GeoFire.
- **Pagos**: Stripe Checkout + Webhooks.

## 📁 Estructura del Proyecto
- `/docs`: Documentación técnica detallada.
- `/ia`: Instrucciones y seguimiento para diferentes IAs.
- `/frontend`: Código fuente de la WebApp.
- `/functions`: Lógica de backend (Cloud Functions).
- `/firebase`: Configuraciones y reglas de seguridad.

---
*Proyecto en desarrollo colaborativo por múltiples IAs.*
