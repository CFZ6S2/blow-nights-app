# ⚙️ Cloud Functions (Backend)

### 1. `onUserCreate`
- **Trigger**: Auth create.
- **Acción**: Crea los documentos iniciales en `/users/{uid}` y `/subscriptions/{uid}`.

### 2. `updateGeohash`
- **Trigger**: Write en `/locations/{uid}`.
- **Acción**: Calcula el geohash usando GeoFire y normaliza la ubicación para consultas eficientes.

### 3. `cleanupAvailability`
- **Trigger**: Cron job (cada 5 minutos).
- **Acción**: Busca usuarios cuyo `disponibleHasta` haya expirado y limpia el campo.

### 4. `sendMessageNotification`
- **Trigger**: Mensaje nuevo en `/chats/{chatId}/messages/{messageId}`.
- **Acción**: Envía una notificación push al destinatario vía Firebase Cloud Messaging (FCM).

### 5. `createCheckoutSession`
- **Trigger**: Callable Function (onCall).
- **Acción**: Crea una sesión de Stripe Checkout y devuelve el `sessionId` al frontend.

### 6. `stripeWebhook`
- **Trigger**: HTTP.
- **Acción**: Procesa eventos de Stripe y actualiza el estado en `/subscriptions/{uid}`.
