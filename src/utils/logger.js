/**
 * Logger Utility
 * Centralized logging with levels and formatting
 */

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

class Logger {
  constructor(name, level = 'info') {
    this.name = name;
    this.level = level;
  }

  log(levelName, message, data = null) {
    if (LOG_LEVELS[levelName] > LOG_LEVELS[this.level]) {
      return;
    }

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${this.name}] [${levelName.toUpperCase()}]`;
    
    if (data) {
      console.log(`${prefix} ${message}`, data);
    } else {
      console.log(`${prefix} ${message}`);
    }
  }

  error(message, data) {
    this.log('error', message, data);
  }

  warn(message, data) {
    this.log('warn', message, data);
  }

  info(message, data) {
    this.log('info', message, data);
  }

  debug(message, data) {
    this.log('debug', message, data);
  }
}

function createLogger(name, level = 'info') {
  return new Logger(name, level);
}

module.exports = { Logger, createLogger };
