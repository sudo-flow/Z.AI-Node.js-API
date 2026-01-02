import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();

// Simple test route to verify routing works
router.get('/test', (req, res) => {
  res.json({
    message: 'API routes working!',
    timestamp: new Date().toISOString(),
    path: req.path
  });
});

// Available models endpoint (simplified)
router.get('/models/available', (req, res) => {
  res.json({
    object: 'list',
    data: [
      {
        id: 'glm-4.6',
        object: 'model',
        created: Date.now(),
        owned_by: 'zai'
      },
      {
        id: 'glm-4.5',
        object: 'model',
        created: Date.now(),
        owned_by: 'zai'
      },
      {
        id: 'glm-4.5-flash',
        object: 'model',
        created: Date.now(),
        owned_by: 'zai'
      }
    ]
  });
});

// Chat completion endpoint (simplified to match README)
router.post('/chat/completions', async (req: Request, res: Response) => {
  try {
    const { model, messages, temperature, max_tokens, stream } = req.body;

    // Basic validation
    if (!model || !messages) {
      return res.status(400).json({
        error: {
          message: 'Model and messages are required',
          type: 'invalid_request_error'
        }
      });
    }

    // Extract API key from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: {
          message: 'Valid Authorization header required',
          type: 'authentication_error'
        }
      });
    }

    const apiKey = authHeader.substring(7);

    // Make request to Z.AI API
    const response = await axios.post(
      'https://api.z.ai/api/coding/paas/v4/chat/completions',
      {
        model,
        messages,
        temperature: temperature || 1.0,
        max_tokens: max_tokens || 1024,
        stream: stream || false
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept-Language': 'en-US,en'
        },
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