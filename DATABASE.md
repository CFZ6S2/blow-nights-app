# 🗄️ Database Schema & Architecture

## Overview
Gay Meet relies on Firebase as its Backend-as-a-Service (BaaS). The primary database is **Cloud Firestore**, a NoSQL document database. This architecture is designed for real-time synchronization, scalability, and fast geospatial queries using GeoFire principles. Background processing and third-party integrations (like Stripe) are handled via **Firebase Cloud Functions**.

---

## 📄 Firestore Collections

### `users`
Stores core user profiles, authentication metadata, and application state.

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `uid` | string | Unique user ID from Firebase Auth | `"a1B2c3D4..."` |
| `displayName` | string | User's chosen display name | `"Alex"` |
| `bio` | string | User's profile biography | `"Love hiking and coffee."` |
| `photos` | array<string> | URLs to profile images in Storage | `["https://...", "https://..."]` |
| `isPremium` | boolean | Active premium subscription status | `true` |
| `isVerified` | boolean | Identity verification status | `false` |
| `createdAt` | timestamp | Account creation date | `1690000000` |
| `referralCode` | string | Unique code for the referral system | `"ALEX99"` |
| `referralCount` | number | Number of successful invites | `2` |
| `role` | string | User role (`user` or `admin`) | `"user"` |

### `locations`
Dedicated collection for optimized geospatial queries. Managed by the `updateGeohash` cloud function.

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `userId` | string | Reference to the `users` document | `"a1B2c3D4..."` |
| `geohash` | string | Encoded geographic location | `"9q8yy..."` |
| `lat` | number | Latitude coordinate | `37.7749` |
| `lng` | number | Longitude coordinate | `-122.4194` |
| `lastUpdated`| timestamp | Time of last location ping | `1690005000` |

### `chats`
Represents an active conversation between two users.

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `participants` | array<string> | UIDs of the two users in the chat | `["userA_id", "userB_id"]` |
| `lastMessage` | string | Snippet of the latest message | `"Hey, how are you?"` |
| `updatedAt` | timestamp | Time of the last message sent | `1690010000` |
| `readStatus` | map | Unread counts per user | `{"userA_id": 0, "userB_id": 1}` |

### `chats/{id}/messages` (Subcollection)
Individual messages within a chat.

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `senderId` | string | UID of the message sender | `"userA_id"` |
| `text` | string | Message content | `"Hey, how are you?"` |
| `createdAt` | timestamp | Time message was sent | `1690010000` |
| `imageUrl` | string | (Optional) URL if message is an image | `"https://..."` |

### `likes`
Records when a user likes another user.

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `fromUserId` | string | User who initiated the like | `"userA_id"` |
| `toUserId` | string | User who received the like | `"userB_id"` |
| `createdAt` | timestamp | Time of the like | `1690002000` |

### `matches`
Created when two users like each other mutually.

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `users` | array<string> | UIDs of the matched users | `["userA_id", "userB_id"]` |
| `createdAt` | timestamp | Time the match occurred | `1690003000` |
| `chatId` | string | Reference to the created chat room | `"chat_xyz123"` |

### `visits`
Tracks profile views (useful for premium feature "See who viewed you").

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `visitorId` | string | UID of the user viewing the profile | `"userA_id"` |
| `visitedId` | string | UID of the profile being viewed | `"userB_id"` |
| `timestamp` | timestamp | Time of visit | `1690001000` |

### `reports`
User-generated reports for moderation.

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `reporterId` | string | User submitting the report | `"userA_id"` |
| `reportedId` | string | User being reported | `"userB_id"` |
| `reason` | string | Reason category | `"Inappropriate content"` |
| `status` | string | `pending`, `reviewed`, `resolved` | `"pending"` |
| `createdAt` | timestamp | Time of report | `1690004000` |

### `verifications`
Submissions for the identity verification flow.

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `userId` | string | User requesting verification | `"userA_id"` |
| `photoUrl` | string | URL of the verification selfie | `"https://..."` |
| `status` | string | `pending`, `approved`, `rejected` | `"pending"` |
| `submittedAt`| timestamp | Time of submission | `1690000500` |

### `subscriptions`
Maintains Stripe subscription state for users.

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `userId` | string | User owning the subscription | `"userA_id"` |
| `stripeCustId`| string | Stripe Customer ID | `"cus_12345"` |
| `stripeSubId` | string | Stripe Subscription ID | `"sub_67890"` |
| `plan` | string | `monthly` or `annual` | `"monthly"` |
| `status` | string | `active`, `past_due`, `canceled` | `"active"` |
| `expiresAt` | timestamp | End date of current billing period | `1692592000` |

---

## ⚡ Cloud Functions

| Function Name | Trigger | Purpose | Inputs/Outputs |
|---------------|---------|---------|----------------|
| `onUserCreate` | Auth (`onCreate`) | Initializes user profile in Firestore. Handles the "first 1000 users get Premium" growth hack. | **In:** UserRecord<br>**Out:** `users/{uid}` doc |
| `updateGeohash` | Callable | Updates the user's location coordinates and calculates the Geohash for fast map queries. | **In:** `lat`, `lng`<br>**Out:** Updates `locations/{uid}` |
| `cleanupAvailability` | PubSub (Cron) | Periodically removes stale location data for users who are offline. | **In:** Time schedule<br>**Out:** Deletes old `locations` docs |
| `sendMessageNotification` | Firestore (`onCreate` in `messages`) | Triggers FCM push notification to the message recipient. | **In:** Message doc<br>**Out:** FCM payload |
| `sendLikeNotification` | Firestore (`onCreate` in `likes`) | Alerts user they received a like. | **In:** Like doc<br>**Out:** FCM payload |
| `sendMatchNotification` | Firestore (`onCreate` in `matches`) | Alerts both users of a new match. | **In:** Match doc<br>**Out:** FCM payload |
| `sendVisitNotification` | Firestore (`onCreate` in `visits`) | Alerts Premium users when their profile is viewed. | **In:** Visit doc<br>**Out:** FCM payload |
| `createCheckoutSession` | Callable | Generates a Stripe Checkout URL for purchasing Premium (€9.99/mo or €69.99/yr). | **In:** `planId`<br>**Out:** Stripe Session URL |
| `stripeWebhook` | HTTP Request | Listens for Stripe events (e.g., `invoice.payment_succeeded`) to update user `isPremium` status. | **In:** Stripe Event<br>**Out:** Updates `users` & `subscriptions` |

---

## 🔒 Security Rules Summary

- **Users**: Users can read all public profiles but can only write to their own document. Admin role bypasses write restrictions.
- **Chats/Messages**: Only users listed in the `participants` array can read or write to a chat.
- **Admin**: All collections have a rule checking `request.auth.token.admin == true` (or checking the user document for `role == 'admin'`) for full CRUD access.
- **Stripe**: `subscriptions` collection is strictly read-only for users; writes are handled securely via backend Cloud Functions.

---

## 🔍 Required Indexes

For compound queries, the following composite indexes must be configured in Firebase:

1. **Collection:** `locations`
   - Fields: `geohash` (Ascending), `lastUpdated` (Descending)
2. **Collection:** `chats`
   - Fields: `participants` (Arrays), `updatedAt` (Descending)
3. **Collection:** `likes`
   - Fields: `toUserId` (Ascending), `createdAt` (Descending)
