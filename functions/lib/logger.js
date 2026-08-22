const { logger } = require("firebase-functions");

function createStructuredLogger(contextName) {
  return {
    info: (message, meta = {}) => {
      logger.info(message, { context: contextName, ...meta });
    },
    error: (message, error, meta = {}) => {
      logger.error(message, {
        context: contextName,
        errorMessage: error?.message || error,
        stack: error?.stack,
        ...meta,
      });
    },
    warn: (message, meta = {}) => {
      logger.warn(message, { context: contextName, ...meta });
    },
    financial: (event, correlationId, amountCents, meta = {}) => {
      logger.info(`[FINANCIAL] ${event}`, {
        context: "financial_ledger",
        correlationId,
        amountCents,
        ...meta,
      });
    },
    security: (event, uid, resource, meta = {}) => {
      logger.warn(`[SECURITY] ${event}`, {
        context: "security_audit",
        uid,
        resource,
        ...meta,
      });
    }
  };
}

module.exports = { createStructuredLogger };
