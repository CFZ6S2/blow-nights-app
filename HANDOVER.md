# 🤝 Gay Meet - Project Handover Checklist

Welcome to the Gay Meet platform! This document outlines the exact, step-by-step process to transfer ownership of the application, backend infrastructure, and external services from the seller to the buyer.

**Estimated Time to Complete:** ~2-4 hours  
**Support Contact:** [Insert Seller Email/Contact Here]

---

## 📋 Prerequisites for the Buyer

Before starting the handover process, please ensure you have created accounts for the following services (all offer free tiers to start):

- [ ] A Google Account (for Firebase and Google Cloud)
- [ ] A Stripe Account (for payment processing)
- [ ] A Mapbox Account (for the interactive map features)
- [ ] A Vercel/Netlify Account OR keep using Firebase Hosting
- [ ] Access to your domain registrar (e.g., GoDaddy, Namecheap) to update DNS records.

---

## Step 1: Firebase Console Transfer

Firebase handles the database, authentication, file storage, and serverless functions.

1. **Seller invites Buyer:**
   - Seller goes to the Firebase Console -> Project Settings -> Users and permissions.
   - Seller clicks "Add member" and invites the Buyer's Google account with the **Owner** role.
2. **Buyer accepts invite:**
   - Buyer checks their email, clicks the invite link, and accepts.
3. **Billing Transfer:**
   - Buyer goes to Google Cloud Console (linked to the Firebase project).
   - Buyer navigates to Billing and links their own credit card/billing account to the project.
   - Seller removes their billing account.
4. **Remove Seller:**
   - Buyer goes back to Firebase Project Settings -> Users and permissions.
   - Buyer removes the Seller's account to secure the project.

---

## Step 2: Stripe Account Setup (Payments)

Since Stripe accounts are heavily tied to personal/business legal identity, we recommend the Buyer uses their own Stripe account rather than transferring the existing one.

1. **Create Products:**
   - Buyer logs into Stripe.
   - Create a Product called "Premium".
   - Add a Monthly price (€9.99/mo) and an Annual price (€69.99/yr).
2. **Get API Keys:**
   - Go to Developers -> API Keys.
   - Note down the `Publishable key` and `Secret key`.
3. **Setup Webhooks:**
   - Go to Developers -> Webhooks.
   - Add an endpoint pointing to your deployed Cloud Function URL: `https://<region>-<project>.cloudfunctions.net/stripeWebhook`.
   - Listen for events: `checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.deleted`.
   - Note down the `Webhook Signing Secret`.

---

## Step 3: Mapbox Account Setup (Geolocation)

1. **Generate Token:**
   - Buyer logs into Mapbox.
   - Go to the Tokens page and click "Create a token".
   - Give it a name (e.g., "Gay Meet Production").
   - Ensure it has public read scopes (default is fine).
   - Note down the `Default public token`.

---

## Step 4: Environment Variables Configuration

Now that you have your own keys, you need to update the application environment variables. 

1. Locate the `.env.example` file in the root of the source code.
2. Create a `.env.local` (for local dev) and update your production environment variables (in Vercel, Netlify, or Firebase Hosting settings).
3. Fill in the keys:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_new_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project
   NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_pub_key
   ```
4. **Cloud Functions Config:**
   Update the backend secrets via Firebase CLI:
   ```bash
   firebase functions:config:set stripe.secret="your_stripe_secret_key" stripe.webhook="your_webhook_secret"
   firebase deploy --only functions
   ```

---

## Step 5: Domain & Hosting Setup

If the project is hosted on Firebase Hosting:
1. Go to Firebase Console -> Hosting.
2. Click "Add Custom Domain".
3. Enter your domain (e.g., `gaymeet.app`).
4. Firebase will provide TXT and A records.
5. Log into your domain registrar (GoDaddy, Namecheap, etc.) and update the DNS records as instructed.
6. Wait for SSL propagation (can take up to 24 hours).

---

## Step 6: Admin Access Setup

To access the `/admin` dashboard:
1. Sign up on the live app with your email address.
2. Go to Firebase Console -> Firestore Database.
3. Open the `users` collection and find your user document.
4. Add or modify the field `role` (type: string) and set its value to `admin`.
5. Refresh the app and navigate to `/admin`. You should now have full access.

---

## Step 7: Final Verification Checklist

Run through this checklist to ensure everything is transferred and working:

- [ ] Can you log in / sign up using Google Auth?
- [ ] Does the Mapbox map render correctly on the home screen?
- [ ] Can you update your profile photo? (Verifies Firebase Storage)
- [ ] Can you navigate to the Premium upgrade page and see the Stripe Checkout?
- [ ] Can you access the `/admin` dashboard?

---

## Step 8: Optional Growth Actions (Post-Handover)

To hit the ground running, we recommend setting up the following:
- **Google Analytics:** Link a Google Analytics 4 property in the Firebase Console to track user retention.
- **Influencer Tracking:** Use the built-in referral system (`referralCode` in Firestore) to generate custom codes for social media influencers and track their conversion rates.
- **Marketing:** Begin promoting the "First 1000 users get Premium free" offer (this logic is already active in the `onUserCreate` Cloud Function).

**Congratulations on your acquisition!** 🎉
