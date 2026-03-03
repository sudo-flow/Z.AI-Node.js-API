import dotenv from 'dotenv';
import Joi from 'joi';

dotenv.config();

const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  PORT: Joi.number().default(3000),

  // Default Provider API Configuration (OpenAI-compatible)
  DEFAULT_PROVIDER_API_KEY: Joi.string().required(),
  DEFAULT_PROVIDER_BASE_URL: Joi.string()
    .uri()
    .default('https://api.z.ai/api/coding/paas/v4/'),
  DEFAULT_PROVIDER_TIMEOUT: Joi.number().default(300000),

  // OpenRouter API Configuration
  OPENROUTER_API_KEY: Joi.string().optional().allow(''),
  OPENROUTER_BASE_URL: Joi.string()
    .uri()
    .default('https://openrouter.ai/api/v1'),

  // Legacy Z.AI Configuration (for backward compatibility)
  ZAI_API_KEY: Joi.string().optional(),
  ZAI_BASE_URL: Joi.string().optional(),
  ZAI_TIMEOUT: Joi.number().optional(),

  // Service Configuration
  CORS_ORIGINS: Joi.string().default('*'),
  RATE_LIMIT_WINDOW_MS: Joi.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('trace', 'debug', 'info', 'warn', 'error', 'silent')
    .default('info'),
  LOG_PRETTY_PRINT: Joi.boolean().default(false),

  // Redis
  REDIS_URL: Joi.string().uri().optional(),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().optional().allow(''),

  // Monitoring
  METRICS_ENABLED: Joi.boolean().default(true),
  HEALTH_CHECK_INTERVAL: Joi.number().default(30000),
}).unknown();

const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Environment validation error: ${error.message}`);
}

export const config = {
  environment: envVars.NODE_ENV,
  port: envVars.PORT,

  // Default provider config (primary AI provider)
  defaultProvider: {
    apiKey: envVars.DEFAULT_PROVIDER_API_KEY || envVars.ZAI_API_KEY,
    baseUrl: envVars.DEFAULT_PROVIDER_BASE_URL.replace(/\/$/, '') || envVars.ZAI_BASE_URL?.replace(/\/$/, '') || 'https://api.z.ai/api/coding/paas/v4',
    timeout: envVars.DEFAULT_PROVIDER_TIMEOUT || envVars.ZAI_TIMEOUT || 300000,
  },

  // OpenRouter config
  openrouter: {
    apiKey: envVars.OPENROUTER_API_KEY,
    baseUrl: envVars.OPENROUTER_BASE_URL.replace(/\/$/, ''),
  },

  // Legacy zai config (for backward compatibility)
  zai: {
    apiKey: envVars.ZAI_API_KEY || envVars.DEFAULT_PROVIDER_API_KEY,
    baseUrl: envVars.ZAI_BASE_URL?.replace(/\/$/, '') || envVars.DEFAULT_PROVIDER_BASE_URL.replace(/\/$/, '') || 'https://api.z.ai/api/coding/paas/v4',
    timeout: envVars.ZAI_TIMEOUT || envVars.DEFAULT_PROVIDER_TIMEOUT || 300000,
  },

  cors: {
    origins: envVars.CORS_ORIGINS.split(',').map((origin: any) => origin.trim()),
  },

  rateLimit: {
    windowMs: envVars.RATE_LIMIT_WINDOW_MS,
    maxRequests: envVars.RATE_LIMIT_MAX_REQUESTS,
  },

  logging: {
    level: envVars.LOG_LEVEL,
    prettyPrint: envVars.LOG_PRETTY_PRINT,
  },

  redis: {
    url: envVars.REDIS_URL,
    host: envVars.REDIS_HOST,
    port: envVars.REDIS_PORT,
    password: envVars.REDIS_PASSWORD,
  },

  monitoring: {
    enabled: envVars.METRICS_ENABLED,
    healthCheckInterval: envVars.HEALTH_CHECK_INTERVAL,
  },

  isProduction: envVars.NODE_ENV === 'production',
  isDevelopment: envVars.NODE_ENV === 'development',
  isTest: envVars.NODE_ENV === 'test',
} as const;

export default config;