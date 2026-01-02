import 'express-async-errors';
import { Request, Response, NextFunction } from 'express';
import pino from 'pino';
import config from '../config/environment';

// Logger configuration
const logger = pino({
  level: config.logging.level,
  ...(config.logging.prettyPrint && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  }),
});

// Extend Error interface for custom errors
interface CustomError extends Error {
  statusCode?: number;
  code?: string;
  type?: string;
  details?: any;
}

// Global error handling middleware
export const errorHandler = (
  error: CustomError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const requestId = req.headers['x-request-id'] || 'unknown';

  // Log the error with context
  logger.error({
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    clientInfo: req.clientInfo,
    error: {
      name: error.name,
      message: error.message,
      stack: config.isDevelopment ? error.stack : undefined,
      code: error.code,
      type: error.type,
      details: error.details,
    },
  }, 'Request failed');

  // Determine status code
  const statusCode = error.statusCode || error.name === 'ValidationError' ? 400 : 500;

  // Prepare error response
  const errorResponse: any = {
    error: {
      message: error.message || 'Internal server error',
      type: error.type || (statusCode >= 500 ? 'api_error' : 'invalid_request_error'),
    },
  };

  // Add error code if available
  if (error.code) {
    errorResponse.error.code = error.code;
  }

  // Add validation details if available (only in development)
  if (config.isDevelopment && error.details) {
    errorResponse.error.details = error.details;
  }

  // Add request ID to response headers
  res.setHeader('X-Request-ID', requestId);

  res.status(statusCode).json(errorResponse);
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    error: {
      message: `Route ${req.method} ${req.url} not found`,
      type: 'not_found_error',
    },
  });
};

// Async error wrapper
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Custom error classes
export class ValidationError extends Error {
  statusCode = 400;
  type = 'invalid_request_error';
  details: any;

  constructor(message: string, details?: any) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class AuthenticationError extends Error {
  statusCode = 401;
  type = 'authentication_error';
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'AuthenticationError';
    this.code = code || undefined;
  }
}

export class RateLimitError extends Error {
  statusCode = 429;
  type = 'rate_limit_error';

  constructor(message: string = 'Rate limit exceeded') {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class APIError extends Error {
  statusCode: number;
  type: string;
  code?: string;
  details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    type: string = 'api_error',
    code?: string,
    details?: any
  ) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.type = type;
    this.code = code || undefined;
    this.details = details || undefined;
  }
}

export { logger };