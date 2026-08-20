const { logger } = require("firebase-functions/v2");

function startTimer(operationName, attrs = {}) {
  const start = Date.now();
  return {
    stop(extraAttrs = {}) {
      const duration = Date.now() - start;
      logger.info(`perf:${operationName}`, {
        operation: operationName,
        duration_ms: duration,
        ...attrs,
        ...extraAttrs,
      });
      return duration;
    },
    error(err, extraAttrs = {}) {
      const duration = Date.now() - start;
      logger.warn(`perf:${operationName}:error`, {
        operation: operationName,
        duration_ms: duration,
        error: err?.message || String(err),
        ...attrs,
        ...extraAttrs,
      });
      return duration;
    },
  };
}

module.exports = { startTimer };
