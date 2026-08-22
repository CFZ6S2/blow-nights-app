# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-08-22

### Added
- **Live Sense**: Real-time venue occupancy and heat-map module, permanently visible on the UI.
- **Partners Portal**: Comprehensive application flow for Venues and City Managers.
- **Automated Venue Onboarding**: Approving a "Local" partner in the SuperAdmin dashboard automatically provisions the venue in Firestore and links the user account.
- **App Check Security**: ReCAPTCHA v3 integrated on the client and enforced (`enforceAppCheck: true`) on all critical Cloud Functions (Memberships, Ticketing, Partners).
- **Premium Memberships**: Updated Stripe pricing structure (10€/20€ monthly with 25% annual discount).

### Changed
- **Business Login Flow**: Restored and separated the Apply and Login tabs for business users.
- **Environment Configuration**: Added structured `.env.example` templates for both Frontend (App Check ReCAPTCHA) and Functions (Stripe Price IDs).
- **Language Selector**: Relocated to the top-right of the interface for better accessibility.

### Fixed
- **i18n Translations**: Merged duplicate translation keys across the landing page, PWA, and swipe modules that were breaking translations.
- **Stripe Secrets**: Properly declared `STRIPE_SECRET_KEY` as a Firebase secret in all relevant Stripe Cloud Functions.
