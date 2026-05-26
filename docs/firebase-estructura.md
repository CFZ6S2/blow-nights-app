# 🗄️ Estructura de Firebase

## Firestore

### `/users/{userId}`
- `nick`: string
- `edad`: number
- `rol`: "activo" | "pasivo" | "versátil"
- `intencion`: "conocer" | "quedar"
- `fotoUrl`: string
- `online`: boolean
- `lastSeen`: timestamp
- `premium`: boolean
- `disponibleHasta`: timestamp | null

### `/locations/{userId}`
- `lat`: number
- `lng`: number
- `geohash`: string
- `updatedAt`: timestamp

### `/chats/{chatId}`
- `users`: [userId1, userId2]
- `lastMessage`: string
- `lastMessageAt`: timestamp

### `/chats/{chatId}/messages/{messageId}`
- `senderId`: string
- `content`: string
- `timestamp`: timestamp

### `/subscriptions/{userId}`
- `stripeCustomerId`: string
- `subscriptionId`: string
- `status`: "active" | "canceled" | "incomplete"
- `renewalDate`: timestamp

### `/reports/{reportId}`
- `reporterId`: string
- `reportedId`: string
- `reason`: string
- `createdAt`: timestamp

## Firebase Storage
- `/profilePictures/{userId}.jpg`
