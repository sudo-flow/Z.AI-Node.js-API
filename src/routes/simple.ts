import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();

// Model routing configuration - maps models to their provider APIs
const MODEL_ROUTES: Record<string, { baseUrl: string; apiKeyEnv: string; provider: string }> = {
  // Z.AI GLM Models (Default Provider)
  'glm-4.7': { baseUrl: 'https://api.z.ai/api/coding/paas/v4', apiKeyEnv: 'DEFAULT_PROVIDER_API_KEY', provider: 'Z.AI' },
  'glm-4.7-flash': { baseUrl: 'https://api.z.ai/api/coding/paas/v4', apiKeyEnv: 'DEFAULT_PROVIDER_API_KEY', provider: 'Z.AI' },
  'glm-4.6': { baseUrl: 'https://api.z.ai/api/coding/paas/v4', apiKeyEnv: 'DEFAULT_PROVIDER_API_KEY', provider: 'Z.AI' },
  'glm-4.5': { baseUrl: 'https://api.z.ai/api/coding/paas/v4', apiKeyEnv: 'DEFAULT_PROVIDER_API_KEY', provider: 'Z.AI' },
  'glm-4.5-flash': { baseUrl: 'https://api.z.ai/api/coding/paas/v4', apiKeyEnv: 'DEFAULT_PROVIDER_API_KEY', provider: 'Z.AI' },
  // OpenRouter Models
  'amazon/nova-micro-v1': { baseUrl: 'https://openrouter.ai/api/v1', apiKeyEnv: 'OPENROUTER_API_KEY', provider: 'OpenRouter' },
  'qwen/qwen3.5-flash-02-23': { baseUrl: 'https://openrouter.ai/api/v1', apiKeyEnv: 'OPENROUTER_API_KEY', provider: 'OpenRouter' }
};

// Get API key from environment
function getApiKey(keyEnv: string): string {
  return process.env[keyEnv] || '';
}

// Simple test route to verify routing works
router.get('/test', (req, res) => {
  res.json({
    message: 'API routes working!',
    timestamp: new Date().toISOString(),
    path: req.path
  });
});

// Available models endpoint
router.get('/models/available', (req, res) => {
  res.json({
    object: 'list',
    data: Object.entries(MODEL_ROUTES).map(([modelId, config]) => ({
      id: modelId,
      object: 'model',
      created: Date.now(),
      owned_by: config.provider.toLowerCase(),
      provider: config.provider
    }))
  });
});

// Chat completion endpoint (simplified to match README)
router.post('/chat/completions', async (req: Request, res: Response) => {
  try {
    const { model, messages, temperature, max_tokens, stream, reasoning } = req.body;

    // Basic validation
    if (!model || !messages) {
      return res.status(400).json({
        error: {
          message: 'Model and messages are required',
          type: 'invalid_request_error'
        }
      });
    }

    // Determine which API to use based on model
    const modelConfig = MODEL_ROUTES[model];
    if (!modelConfig) {
      return res.status(400).json({
        error: {
          message: `Unsupported model: ${model}. Available models: ${Object.keys(MODEL_ROUTES).join(', ')}`,
          type: 'invalid_request_error'
        }
      });
    }

    // Extract API key from environment
    const apiKey = getApiKey(modelConfig.apiKeyEnv);
    if (!apiKey) {
      return res.status(500).json({
        error: {
          message: `API key not configured for model: ${model}`,
          type: 'configuration_error'
        }
      });
    }

    // Prepare request body
    const requestBody: any = {
      model,
      messages,
      temperature: temperature || 1.0,
      max_tokens: max_tokens || 1024,
      stream: stream || false
    };

    // Add reasoning parameter for OpenRouter models that support it
    if (reasoning && modelConfig.apiKeyEnv === 'OPENROUTER_API_KEY') {
      requestBody.reasoning = reasoning;
    }

    // Add OpenRouter-specific headers
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };

    // Add OpenRouter-specific headers for better routing
    if (modelConfig.apiKeyEnv === 'OPENROUTER_API_KEY') {
      headers['HTTP-Referer'] = 'http://localhost:3000';
      headers['X-Title'] = 'Z.AI Endpoint Microservice';
    } else {
      headers['Accept-Language'] = 'en-US,en';
    }

    // Make request to appropriate API
    const response = await axios.post(
      `${modelConfig.baseUrl}/chat/completions`,
      requestBody,
      {
        headers,
        timeout: 300000
      }
    );

    res.json(response.data);
  } catch (error: any) {
    console.error('Chat completion error:', error.message);

    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }

    res.status(500).json({
      error: {
        message: 'Internal server error',
        type: 'api_error'
      }
    });
  }
});

export default router;