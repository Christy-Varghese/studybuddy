/**
 * Environment Configuration
 * Centralized configuration for different environments
 */

const env = process.env.NODE_ENV || 'development';

const config = {
  development: {
    port: process.env.PORT || 3000,
    host: 'localhost',
    ollamaUrl: 'http://localhost:11434',
    logLevel: 'debug',
    nodeEnv: 'development',
    enableDevPanel: true,
  },
  production: {
    port: process.env.PORT || 3000,
    host: '0.0.0.0',
    ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
    logLevel: 'info',
    nodeEnv: 'production',
    enableDevPanel: false,
  },
  test: {
    port: 3001,
    host: 'localhost',
    ollamaUrl: 'http://localhost:11434',
    logLevel: 'error',
    nodeEnv: 'test',
    enableDevPanel: false,
  },
};

module.exports = config[env] || config.development;
