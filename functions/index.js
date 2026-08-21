require("./lib/sentry");
require("./lib/init");

const auth = require("./modules/auth");
const notifications = require("./modules/notifications");
const stripe = require("./modules/stripe");
const tickets = require("./modules/tickets");
const chills = require("./modules/chills");
const venues = require("./modules/venues");
const adminModule = require("./modules/admin");
const likes = require("./modules/likes");
const organizers = require("./modules/organizers");
const scheduled = require("./modules/scheduled");
const membership = require("./modules/membership");
const partners = require("./modules/partners");

// Auth & Users
exports.onUserCreate = auth.onUserCreate;
exports.assignRole = auth.assignRole;
exports.approveRRPP = auth.approveRRPP;
exports.submitRRPPApplication = auth.submitRRPPApplication;
exports.deleteUserData = auth.deleteUserData;
exports.banUser = auth.banUser;
exports.adminDeleteUser = auth.adminDeleteUser;
exports.getAdminAnalytics = adminModule.getAdminAnalytics;
exports.submitOrganizerApplication = organizers.submitOrganizerApplication;
exports.approveOrganizer = organizers.approveOrganizer;
exports.requestPartnerAccess = partners.requestPartnerAccess;
exports.approvePartnerAccess = partners.approvePartnerAccess;

// Scheduled
exports.autoCompleteEventsAndSubscriptions = scheduled.autoCompleteEventsAndSubscriptions;

// Notifications
exports.sendMessageNotification = notifications.sendMessageNotification;
exports.sendLikeNotification = notifications.sendLikeNotification;
exports.sendMatchNotification = notifications.sendMatchNotification;
exports.sendVisitNotification = notifications.sendVisitNotification;
exports.sendPingNotification = notifications.sendPingNotification;
exports.sendPromoNotification = notifications.sendPromoNotification;

// Stripe payments
exports.createCheckoutSession = stripe.createCheckoutSession;
exports.createVenueSubscriptionCheckout = stripe.createVenueSubscriptionCheckout;
exports.createChillPassCheckout = stripe.createChillPassCheckout;
exports.createPingCheckoutSession = stripe.createPingCheckoutSession;
exports.createStripeConnectAccount = stripe.createStripeConnectAccount;
exports.createStripeAccountLink = stripe.createStripeAccountLink;
exports.createQRPackageCheckout = stripe.createQRPackageCheckout;
exports.createStripePortalSession = stripe.createStripePortalSession;
exports.stripeWebhook = stripe.stripeWebhook;

// Memberships
exports.createUserMembershipCheckout = membership.createUserMembershipCheckout;
exports.createBlack8hCheckout = membership.createBlack8hCheckout;

// Tickets & RRPP
exports.createTicketCheckout = tickets.createTicketCheckout;
exports.purchaseVenueTicket = tickets.purchaseVenueTicket;
exports.purchasePublicVenueTicket = tickets.purchasePublicVenueTicket;
exports.purchaseIndependentEventTicket = tickets.purchaseIndependentEventTicket;
exports.validateTicket = tickets.validateTicket;
exports.validateTicketByDoorToken = tickets.validateTicketByDoorToken;
exports.generateDirectPromoterTicket = tickets.generateDirectPromoterTicket;
exports.generateOrganizerQRTicket = tickets.generateOrganizerQRTicket;
exports.closePromoterList = tickets.closePromoterList;
exports.liquidatePromoter = tickets.liquidatePromoter;
exports.getPromoterStats = tickets.getPromoterStats;

// Likes & Matches
exports.sendLike = likes.sendLike;

// Chills / Afters
exports.createChill = chills.createChill;
exports.requestChillAccess = chills.requestChillAccess;
exports.respondChillRequest = chills.respondChillRequest;
exports.endChill = chills.endChill;
exports.cleanupExpiredChills = chills.cleanupExpiredChills;

// Venues & Location
exports.updateGeohash = venues.updateGeohash;
exports.cleanupAvailability = venues.cleanupAvailability;
exports.cleanupExpiredCheckins = venues.cleanupExpiredCheckins;
exports.onCheckinCreated = venues.onCheckinCreated;
exports.checkFranchiseTrigger = venues.checkFranchiseTrigger;
exports.createRRPPParty = venues.createRRPPParty;
exports.deleteRRPPParty = venues.deleteRRPPParty;
