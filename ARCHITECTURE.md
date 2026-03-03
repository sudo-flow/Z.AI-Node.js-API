# Microservice Architecture

A production-ready template for building API gateway microservices that proxy requests to external APIs with OpenAI-compatible interfaces.

## Overview

This microservice acts as a secure API gateway that:
- Provides OpenAI-compatible REST endpoints
- Handles authentication, rate limiting, and CORS
- Proxies requests to external AI APIs (Z.AI, OpenAI, etc.)
- Supports both streaming and non-streaming responses
- Includes health checks, metrics, and structured logging

## Architecture Diagram

```
┌─────────────────┐     ┌─────────────────────────┐     ┌─────────────────┐
│   Client App    │────▶│   API Gateway (This     │────▶│  External API   │
│  (Web/Mobile/   │     │      Microservice)      │     │  (Z.AI/OpenAI)  │
│     Server)     │     │                         │     │                 │
└─────────────────┘     └─────────────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────┐
                        │    Redis    │
                        │ (Optional)  │
                        └─────────────┘
```

## Project Structure

```
microservice/
├── src/
│   ├── index.ts              # Application entry point
│   ├── config/
│   │   └── environment.ts    # Environment configuration
│   ├── controllers/
│   │   ├── chatController.ts # Request handlers
│   │   └── healthController.ts
│   ├── middleware/
│   │   ├── auth.ts           # API key validation, rate limiting
│   │   ├── errorHandler.ts   # Error handling & logging
│   │   └── validation.ts     # Request validation
│   ├── routes/
│   │   ├── index.ts          # Main route definitions
│   │   └── simple.ts         # Simplified routes for testing
│   ├── client/
│   │   └── apiClient.ts      # External API client
│   └── types/
│       └── index.ts          # TypeScript type definitions
├── Dockerfile                # Multi-stage Docker build
├── docker-compose.yml        # Container orchestration
├── .env.example              # Environment template
├── package.json              # Dependencies & scripts
└── tsconfig.json             # TypeScript configuration
```

## Quick Start Template

### 1. Initialize Project

```bash
mkdir my-microservice && cd my-microservice
npm init -y
npm install express axios cors helmet express-rate-limit dotenv pino pino-pretty joi uuid express-async-errors
npm install -D typescript @types/node @types/express @types/cors ts-node-dev concurrently
npx tsc --init
```

### 2. Environment Configuration

Create `.env`:
```bash
# Service Configuration
NODE_ENV=development
PORT=3000

# External API Configuration
EXTERNAL_API_KEY=your_api_key
EXTERNAL_API_URL=https://api.example.com/v1
EXTERNAL_API_TIMEOUT=30000

# CORS Configuration
CORS_ORIGINS=*

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_PRETTY_PRINT=true

# Optional: Redis
REDIS_URL=redis://localhost:6379
```

### 3. Core Files

#### `src/config/environment.ts`
```typescript
import dotenv from 'dotenv';
dotenv.config();

export interface Config {
  port: number;
  environment: string;
  externalApi: {
    key: string;
    url: string;
    timeout: number;
  };
  cors: {
    origins: string | string[];
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  logging: {
    level: string;
    prettyPrint: boolean;
  };
}

const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  environment: process.env.NODE_ENV || 'development',
  externalApi: {
    key: process.env.EXTERNAL_API_KEY || '',
    url: process.env.EXTERNAL_API_URL || '',
    timeout: parseInt(process.env.EXTERNAL_API_TIMEOUT || '30000', 10),
  },
  cors: {
    origins: process.env.CORS_ORIGINS || '*',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    prettyPrint: process.env.LOG_PRETTY_PRINT === 'true',
  },
};

export default config;
```

#### `src/middleware/auth.ts`
```typescript
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import config from '../config/environment';

export const validateApiKey = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        message: 'Valid Authorization header required',
        type: 'authentication_error',
      },
    });
  }

  const apiKey = authHeader.substring(7);
  
  // Validate API key (implement your logic)
  if (!apiKey || apiKey.length < 10) {
    return res.status(401).json({
      error: {
        message: 'Invalid API key',
        type: 'authentication_error',
      },
    });
  }

  next();
};

export const rateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    error: {
      message: 'Too many requests',
      type: 'rate_limit_error',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
```

#### `src/middleware/errorHandler.ts`
```typescript
import { Request, Response, NextFunction } from 'express';
import pino from 'pino';

export const logger = pino({
  level: 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'UTC:yyyy-mm-dd HH:MM:ss',
    },
  },
});

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error({ error: err.message, stack: err.stack }, 'Error occurred');

  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      type: err.type || 'internal_error',
    },
  });
};

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.status(404).json({
    error: {
      message: `Route ${req.method} ${req.path} not found`,
      type: 'not_found_error',
    },
  });
};
```

#### `src/controllers/chatController.ts`
```typescript
import { Request, Response } from 'express';
import axios from 'axios';
import config from '../config/environment';
import { logger } from '../middleware/errorHandler';

export const chatCompletion = async (req: Request, res: Response) => {
  try {
    const { model, messages, temperature, max_tokens, stream } = req.body;

    // Validate required fields
    if (!model || !messages) {
      return res.status(400).json({
        error: {
          message: 'Model and messages are required',
          type: 'invalid_request_error',
        },
      });
    }

    // Extract API key from request
    const apiKey = req.headers.authorization?.substring(7) || config.externalApi.key;

    // Forward request to external API
    const response = await axios.post(
      `${config.externalApi.url}/chat/completions`,
      {
        model,
        messages,
        temperature: temperature || 1.0,
        max_tokens: max_tokens || 1024,
        stream: stream || false,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: config.externalApi.timeout,
      }
    );

    res.json(response.data);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Chat completion error');

    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }

    res.status(500).json({
      error: {
        message: 'Internal server error',
        type: 'api_error',
      },
    });
  }
};
```

#### `src/routes/index.ts`
```typescript
import { Router } from 'express';
import { chatCompletion } from '../controllers/chatController';
import { validateApiKey, rateLimiter } from '../middleware/auth';

const router = Router();

// Apply middleware to all routes
router.use(validateApiKey);
router.use(rateLimiter);

// Chat completions endpoint
router.post('/chat/completions', chatCompletion);

// Models endpoint
router.get('/models', (req, res) => {
  res.json({
    object: 'list',
    data: [
      { id: 'model-1', object: 'model', created: Date.now(), owned_by: 'api' },
      { id: 'model-2', object: 'model', created: Date.now(), owned_by: 'api' },
    ],
  });
});

export default router;
```

#### `src/index.ts`
```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import config from './config/environment';
import { logger, errorHandler, notFoundHandler } from './middleware/errorHandler';
import routes from './routes';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({ origin: config.cors.origins, credentials: true }));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  const requestId = req.headers['x-request-id'] || `req_${Date.now()}`;
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);

  logger.info({
    requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
  }, 'Incoming request');

  res.on('finish', () => {
    logger.info({
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
    }, 'Request completed');
  });

  next();
});

// Health endpoints
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/ready', (req, res) => {
  res.json({ status: 'ready' });
});

app.get('/alive', (req, res) => {
  res.json({ status: 'alive' });
});

// API routes
app.use('/api/v1', routes);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown
const server = app.listen(config.port, () => {
  logger.info(`Server running on port ${config.port}`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export default app;
```

### 4. Docker Configuration

#### `Dockerfile`
```dockerfile
FROM node:18-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force

FROM base AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 api
COPY --from=builder --chown=api:nodejs /app/dist ./dist
COPY --from=deps --chown=api:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=api:nodejs /app/package.json ./package.json
RUN mkdir -p /app/logs && chown api:nodejs /app/logs
USER api
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
```

#### `docker-compose.yml`
```yaml
version: '3.8'

services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
      target: runner
    container_name: my-microservice
    restart: unless-stopped
    ports:
      - "${PORT:-3000}:3000"
    environment:
      NODE_ENV: production
      PORT: 3000
      EXTERNAL_API_KEY: ${EXTERNAL_API_KEY}
      EXTERNAL_API_URL: ${EXTERNAL_API_URL}
      CORS_ORIGINS: ${CORS_ORIGINS:-*}
      RATE_LIMIT_WINDOW_MS: ${RATE_LIMIT_WINDOW_MS:-900000}
      RATE_LIMIT_MAX_REQUESTS: ${RATE_LIMIT_MAX_REQUESTS:-100}
      LOG_LEVEL: ${LOG_LEVEL:-info}
    volumes:
      - ./logs:/app/logs
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - microservice-network

  redis:
    image: redis:7-alpine
    container_name: my-microservice-redis
    restart: unless-stopped
    ports:
      - "${REDIS_PORT:-6379}:6379"
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - microservice-network

volumes:
  redis-data:
    driver: local

networks:
  microservice-network:
    driver: bridge
```

### 5. Package.json Scripts

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "test": "jest"
  }
}
```

## Adding New Endpoints

### Step 1: Create Controller

```typescript
// src/controllers/myController.ts
import { Request, Response } from 'express';
import axios from 'axios';
import config from '../config/environment';

export const myEndpoint = async (req: Request, res: Response) => {
  try {
    const { param1, param2 } = req.body;

    const response = await axios.post(
      `${config.externalApi.url}/my-endpoint`,
      { param1, param2 },
      {
        headers: {
          Authorization: `Bearer ${config.externalApi.key}`,
          'Content-Type': 'application/json',
        },
      }
    );

    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({
      error: { message: error.message, type: 'api_error' },
    });
  }
};
```

### Step 2: Add Route

```typescript
// src/routes/index.ts
import { myEndpoint } from '../controllers/myController';

// Add to router
router.post('/my-endpoint', myEndpoint);
```

### Step 3: Update Types (Optional)

```typescript
// src/types/index.ts
export interface MyRequest {
  param1: string;
  param2: number;
}

export interface MyResponse {
  result: string;
}
```

## Configuration Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Service port | `3000` |
| `NODE_ENV` | Environment (development/production) | `development` |
| `EXTERNAL_API_KEY` | External API authentication key | Required |
| `EXTERNAL_API_URL` | External API base URL | Required |
| `EXTERNAL_API_TIMEOUT` | Request timeout in ms | `30000` |
| `CORS_ORIGINS` | Allowed CORS origins | `*` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `900000` (15min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |
| `LOG_LEVEL` | Logging level | `info` |
| `REDIS_URL` | Redis connection URL | Optional |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/ready` | GET | Readiness probe |
| `/alive` | GET | Liveness probe |
| `/api/v1/chat/completions` | POST | Chat completions |
| `/api/v1/models` | GET | List models |

## Deployment

### Development
```bash
npm run dev
```

### Production (Docker)
```bash
docker compose up -d --build
```

### Production (Direct)
```bash
npm run build
npm run start
```

### Scaling
```bash
docker compose up -d --scale api=3
```

## Security Considerations

1. **API Keys**: Store in environment variables or secrets manager
2. **HTTPS**: Enable in production (use reverse proxy like Nginx)
3. **CORS**: Configure specific origins in production
4. **Rate Limiting**: Adjust limits based on your use case
5. **Input Validation**: Validate all incoming requests
6. **Logging**: Avoid logging sensitive data

## Monitoring

- **Health Checks**: `/health`, `/ready`, `/alive`
- **Request Logging**: Structured JSON logs via Pino
- **Request IDs**: X-Request-ID header for tracing
- **Metrics**: Add custom metrics endpoint as needed

## License

MIT
