/**
 * Ollama Service
 * Service for communicating with Ollama AI backend
 */

const { createLogger } = require('../utils/logger');
const config = require('../../config/environment');

const logger = createLogger('OllamaService');

class OllamaService {
  constructor(baseUrl = config.ollamaUrl) {
    this.baseUrl = baseUrl;
  }

  async callModel(model, prompt, systemPrompt = null) {
    try {
      const messages = [];

      if (systemPrompt) {
        messages.push({
          role: 'system',
          content: systemPrompt,
        });
      }

      messages.push({
        role: 'user',
        content: prompt,
      });

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        content: data.message?.content || '',
        model: data.model,
      };
    } catch (error) {
      logger.error('Ollama API call failed:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async checkHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        timeout: 5000,
      });

      return response.ok;
    } catch (error) {
      logger.warn('Ollama health check failed:', error.message);
      return false;
    }
  }
}

module.exports = OllamaService;
