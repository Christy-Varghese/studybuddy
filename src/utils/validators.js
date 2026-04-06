/**
 * Validation Utilities
 * Helper functions for input validation
 */

function validateMessage(message) {
  if (!message || typeof message !== 'string') {
    return { valid: false, error: 'Message must be a non-empty string' };
  }

  const trimmed = message.trim();
  if (trimmed.length === 0 || trimmed.length > 5000) {
    return { valid: false, error: 'Message must be between 1 and 5000 characters' };
  }

  return { valid: true };
}

function validateLevel(level) {
  const validLevels = ['beginner', 'intermediate', 'advanced'];
  if (!validLevels.includes(level)) {
    return { valid: false, error: `Level must be one of: ${validLevels.join(', ')}` };
  }
  return { valid: true };
}

function validateRequest(body) {
  const errors = [];

  if (!body.message) {
    errors.push('message is required');
  } else {
    const msgValidation = validateMessage(body.message);
    if (!msgValidation.valid) {
      errors.push(msgValidation.error);
    }
  }

  if (!body.level) {
    errors.push('level is required');
  } else {
    const levelValidation = validateLevel(body.level);
    if (!levelValidation.valid) {
      errors.push(levelValidation.error);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  validateMessage,
  validateLevel,
  validateRequest,
};
