/**
 * Error Handler
 * Centralized error handling and responses
 */

const { ERROR_MESSAGES } = require('./constants');

class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();
  }
}

function handleError(error, res, logger) {
  const statusCode = error.statusCode || 500;
  const message = error.message || ERROR_MESSAGES.SERVER_ERROR;

  if (logger) {
    logger.error(`Error [${statusCode}]:`, { message, stack: error.stack });
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      statusCode,
      timestamp: new Date().toISOString(),
    },
  });
}

function createErrorResponse(message, statusCode = 500) {
  return {
    success: false,
    error: {
      message,
      statusCode,
      timestamp: new Date().toISOString(),
    },
  };
}

module.exports = {
  AppError,
  handleError,
  createErrorResponse,
};
