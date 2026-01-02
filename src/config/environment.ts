import dotenv from 'dotenv';
import Joi from 'joi';

dotenv.config();

const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  PORT: Joi.number().default(3000),

  // Z.AI API Configuration
  ZAI_API_KEY: Joi.string().required(),
  ZAI_BASE_URL: Joi.string()
    .uri()
    .default('https://api.z.ai/api/coding/paas/v4/'),
  ZAI_TIMEOUT: Joi.number().default(300000), // 5 minutes

  // Service Configuration
  CORS_ORIGINS: Joi.string().default('*'),
  RATE_LIMIT_WINDOW_MS: Joi.number().default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('trace', 'debug', 'info', 'warn', 'error', 'silent')
    .default('info'),
  LOG_PRETTY_PRINT: Joi.boolean().default(false),

  // Redis (for rate limiting and caching)
  REDIS_URL: Joi.string().uri().optional(),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().optional().allow(''),

  // Monitoring
  METRICS_ENABLED: Joi.boolean().default(true),
  HEALTH_CHECK_INTERVAL: Joi.number().default(30000), // 30 seconds
}).unknown();

const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Environment validation error: ${error.message}`);
}

export const config = {
  environment: envVars.NODE_ENV,
  port: envVars.PORT,

  zai: {
    apiKey: envVars.ZAI_API_KEY,
    baseUrl: envVars.ZAI_BASE_URL.replace(/\/$/, ''), // Remove trailing slash
    timeout: envVars.ZAI_TIMEOUT,
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