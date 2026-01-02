import { Router } from 'express';
import { validateApiKey, rateLimiter, addRequestId } from '../middleware/auth';
import { validateChatCompletion, validateGetModels } from '../middleware/validation';
import { chatController } from '../controllers/chatController';
import { healthController } from '../controllers/healthController';

const router = Router();

// Apply request ID middleware to all routes
router.use(addRequestId);

// Apply authentication and rate limiting to API routes (except health checks)
router.use('/api', validateApiKey, rateLimiter);

// Health check routes (no auth required)
router.get('/health', healthController.healthCheck.bind(healthController));
router.get('/ready', healthController.readinessCheck.bind(healthController));
router.get('/alive', healthController.livenessCheck.bind(healthController));

// API v1 routes
const apiV1Router = Router();

// Chat completion endpoints
apiV1Router.post(
  '/chat/completions',
  validateChatCompletion,
  chatController.createChatCompletion.bind(chatController)
);

// Models endpoints
apiV1Router.get(
  '/models',
  validateGetModels,
  chatController.getModels.bind(chatController)
);

apiV1Router.get(
  '/models/available',
  chatController.getAvailableModels.bind(chatController)
);

// Metrics endpoint
apiV1Router.get(
  '/metrics',
  healthController.getMetrics.bind(healthController)
);

// Mount API v1 routes
router.use('/v1', apiV1Router);

export default router;