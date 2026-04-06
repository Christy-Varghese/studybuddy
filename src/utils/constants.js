/**
 * Constants
 * Centralized constants for the application
 */

const MODELS = {
  FAST: 'gemma4:e4b',      // 8B parameters - fast and accurate
  MEDIUM: 'gemma3:4b',      // 4.3B parameters - balanced
  LARGE: 'mixtral:latest',  // 46.7B parameters - most capable
};

const LEARNING_LEVELS = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
};

const TOOLS = {
  EXPLAIN: 'explain_topic',
  QUIZ: 'generate_quiz',
  PROGRESS: 'track_progress',
  SUGGEST: 'suggest_next_topic',
};

const API_ENDPOINTS = {
  AGENT: '/agent',
  BENCHMARK: '/benchmark',
  VOICE: '/voice',
  CHAT: '/chat',
};

const ERROR_MESSAGES = {
  AGENT_FAILED: 'Agent could not complete the request. Try again.',
  OLLAMA_UNAVAILABLE: 'AI service is currently unavailable. Please try again later.',
  INVALID_INPUT: 'Invalid input provided. Please check your request.',
  SERVER_ERROR: 'An internal server error occurred. Please try again.',
};

module.exports = {
  MODELS,
  LEARNING_LEVELS,
  TOOLS,
  API_ENDPOINTS,
  ERROR_MESSAGES,
};
