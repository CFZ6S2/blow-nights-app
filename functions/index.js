require("./lib/init");

const auth = require("./modules/auth");
const notifications = require("./modules/notifications");
const stripe = require("./modules/stripe");
const tickets = require("./modules/tickets");
const chills = require("./modules/chills");
const venues = require("./modules/venues");
const adminModule = require("./modules/admin");

// Auth & Users
exports.onUserCreate = auth.onUserCreate;
exports.assignRole = auth.assignRole;
exports.approveRRPP = auth.approveRRPP;
exports.processReferral = auth.processReferral;
exports.deleteUserData = auth.deleteUserData;
exports.banUser = auth.banUser;
exports.getAdminAnalytics = adminModule.getAdminAnalytics;

// Notifications
exports.sendMessageNotification = notifications.sendMessageNotification;
exports.sendLikeNotification = notifications.sendLikeNotification;
exports.sendMatchNotification = notifications.sendMatchNotification;
exports.sendVisitNotification = notifications.sendVisitNotification;
exports.sendPingNotification = notifications.sendPingNotification;
exports.sendPromoNotification = notifications.sendPromoNotification;

// Stripe payments
exports.createCheckoutSession = stripe.createCheckoutSession;
exports.createChillPassCheckout = stripe.createChillPassCheckout;
exports.createPingCheckoutSession = stripe.createPingCheckoutSession;
exports.createStripeConnectAccount = stripe.createStripeConnectAccount;
exports.createStripeAccountLink = stripe.createStripeAccountLink;
exports.stripeWebhook = stripe.stripeWebhook;

// Tickets & RRPP
exports.createTicketCheckout = tickets.createTicketCheckout;
exports.validateTicket = tickets.validateTicket;
exports.validateTicketByDoorToken = tickets.validateTicketByDoorToken;
exports.generateDirectPromoterTicket = tickets.generateDirectPromoterTicket;
exports.closePromoterList = tickets.closePromoterList;
exports.liquidatePromoter = tickets.liquidatePromoter;
exports.getPromoterStats = tickets.getPromoterStats;

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
