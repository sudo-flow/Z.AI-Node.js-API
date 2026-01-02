import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import config from '../config/environment';

// Extend Request interface to include client info
declare global {
  namespace Express {
    interface Request {
      clientInfo?: {
        apiKey: string;
        ip: string;
        userAgent?: string;
      };
    }
  }
}

// API Key Validation Middleware
export const validateApiKey = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: {
        message: 'Missing Authorization header',
        type: 'authentication_error',
        code: 'missing_api_key',
      },
    });
  }

  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/);
  if (!bearerMatch) {
    return res.status(401).json({
      error: {
        message: 'Invalid Authorization header format. Expected: Bearer YOUR_API_KEY',
        type: 'authentication_error',
        code: 'invalid_api_key_format',
      },
    });
  }

  const apiKey = bearerMatch[1];

  // In a production environment, you would validate against a database
  // or other secure store of valid API keys
  if (!isValidApiKey(apiKey)) {
    return res.status(401).json({
      error: {
        message: 'Invalid API key',
        type: 'authentication_error',
        code: 'invalid_api_key',
      },
    });
  }

  // Attach client info to request
  req.clientInfo = {
    apiKey: sanitizeApiKey(apiKey),
    ip: getClientIP(req),
    userAgent: req.headers['user-agent'] || undefined,
  };

  next();
};

// Rate Limiting Middleware
export const rateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    error: {
      message: 'Too many requests from this IP, please try again later.',
      type: 'rate_limit_error',
      code: 'rate_limit_exceeded',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Custom key generator to use API key instead of IP if available
  keyGenerator: (req) => {
    return (req.clientInfo?.apiKey as string) || getClientIP(req);
  },
  // Skip rate limiting for health checks
  skip: (req) => req.path === '/api/v1/health',
});

// Client IP extraction
function getClientIP(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    (req.headers['x-real-ip'] as string) ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

// API Key validation logic (replace with your actual validation)
function isValidApiKey(apiKey: string): boolean {
  // For demo purposes, accept any non-empty key
  // In production, implement proper key validation
  return apiKey && apiKey.length > 10;
}

// Sanitize API key for logging (show first and last few characters)
function sanitizeApiKey(apiKey: string): string {
  if (apiKey.length <= 8) {
    return '***';
  }
  return `${apiKey.substring(0, 4)}***${apiKey.substring(apiKey.length - 4)}`;
}

// Request ID middleware
export const addRequestId = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  req.headers['x-request-id'] =
    req.headers['x-request-id'] as string ||
    generateRequestId();
  res.setHeader('X-Request-ID', req.headers['x-request-id']);
  next();
};

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}