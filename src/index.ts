import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import config from './config/environment';
import { logger } from './middleware/errorHandler';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import routes from './routes';
import simpleRoutes from './routes/simple';

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for API
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: config.cors.origins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Request-ID',
  ],
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const requestId = req.headers['x-request-id'] || 'unknown';

  logger.info({
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    clientInfo: req.clientInfo,
  }, 'Incoming request');

  // Log response when finished
  res.on('finish', () => {
    logger.info({
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: Date.now() - req.startTime,
    }, 'Request completed');
  });

  // Add start time to request for response time calculation
  (req as any).startTime = Date.now();

  next();
});

// Serve static frontend files
if (config.isProduction) {
  app.use(express.static(path.join(__dirname, '../public')));
} else if (config.isDevelopment) {
  // In development, also serve static files for convenience
  app.use(express.static(path.join(__dirname, '../public')));
}

// Routes - mount simple routes first for testing
app.use('/api/v1', simpleRoutes);

// Then mount main routes
app.use('/', routes);

// Serve frontend for any non-API routes (catch-all handler)
if (config.isProduction || config.isDevelopment) {
  app.get('*', (req, res) => {
    // Don't intercept API routes
    if (req.path.startsWith('/api/') || req.path.startsWith('/health')) {
      return;
    }
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });
}

// Debug: Add a simple test route
app.get('/test', (req, res) => {
  res.json({ message: 'Test route works!', timestamp: new Date().toISOString() });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Starting graceful shutdown...');

  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Starting graceful shutdown...');

  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error({
    error: error.message,
    stack: error.stack,
  }, 'Uncaught Exception');

  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error({
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
    promise: promise,
  }, 'Unhandled Rejection');

  process.exit(1);
});

// Start server
const server = app.listen(config.port, () => {
  logger.info({
    port: config.port,
    environment: config.environment,
    nodeVersion: process.version,
  }, `Z.AI API Endpoint microservice started`);
});

export default app;