import { Request, Response } from 'express';
import { zaiClient } from '../client/zaiClient';
import { ChatCompletionRequest } from '../types/openai';
import { logger } from '../middleware/errorHandler';
import { AVAILABLE_MODELS } from '../types/openai';

export class ChatController {
  async createChatCompletion(req: Request, res: Response) {
    const request = req.body as ChatCompletionRequest;
    const requestId = req.headers['x-request-id'] as string;

    logger.info({
      requestId,
      clientInfo: req.clientInfo,
      model: request.model,
      messageCount: request.messages.length,
      stream: request.stream || false,
      maxTokens: request.max_tokens,
    }, 'Processing chat completion request');

    try {
      if (request.stream) {
        // Handle streaming response
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Request-ID', requestId);

        const stream = await zaiClient.createChatCompletionStream(request);

        for await (const chunk of stream) {
          const chunkData = {
            ...chunk,
            request_id: requestId,
          };

          res.write(`data: ${JSON.stringify(chunkData)}\n\n`);
        }

        // Send final [DONE] message
        res.write('data: [DONE]\n\n');
        res.end();

        logger.info({
          requestId,
          model: request.model,
          type: 'streaming',
        }, 'Streaming chat completed successfully');
      } else {
        // Handle non-streaming response
        const response = await zaiClient.createChatCompletion({
          ...request,
          stream: false,
        });

        const responseData = {
          ...response,
          request_id: requestId,
        };

        logger.info({
          requestId,
          model: request.model,
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
          finishReason: response.choices[0]?.finish_reason,
        }, 'Chat completed successfully');

        res.json(responseData);
      }
    } catch (error: any) {
      logger.error({
        requestId,
        model: request.model,
        error: error.message,
        type: error.type,
        code: error.code,
      }, 'Chat completion request failed');

      // Forward Z.AI API error format
      if (error.error) {
        return res.status(500).json(error.error);
      }

      // Return generic error for other cases
      res.status(500).json({
        error: {
          message: 'Failed to process chat completion',
          type: 'api_error',
        },
      });
    }
  }

  async getModels(req: Request, res: Response) {
    const requestId = req.headers['x-request-id'] as string;
    const { limit = 20, offset = 0 } = req.query as unknown as { limit: number; offset: number };

    logger.info({
      requestId,
      clientInfo: req.clientInfo,
      limit,
      offset,
    }, 'Processing models request');

    try {
      const response = await zaiClient.getModels();

      // Apply pagination if requested
      let models = response.data;
      if (offset >= 0 && limit > 0) {
        models = models.slice(offset, offset + limit);
      }

      const responseData = {
        object: 'list',
        data: models,
        total: response.data.length,
        offset,
        limit,
      };

      logger.info({
        requestId,
        modelCount: models.length,
        totalModels: response.data.length,
      }, 'Models request completed successfully');

      res.json(responseData);
    } catch (error: any) {
      logger.error({
        requestId,
        error: error.message,
        type: error.type,
        code: error.code,
      }, 'Models request failed');

      // Forward Z.AI API error format
      if (error.error) {
        return res.status(500).json(error.error);
      }

      res.status(500).json({
        error: {
          message: 'Failed to retrieve models',
          type: 'api_error',
        },
      });
    }
  }

  async getAvailableModels(req: Request, res: Response) {
    const requestId = req.headers['x-request-id'] as string;

    logger.info({
      requestId,
      clientInfo: req.clientInfo,
    }, 'Processing available models request');

    try {
      // Return static list of available models from specification
      const models = Object.entries(AVAILABLE_MODELS).map(([, value]) => ({
        id: value,
        object: 'model' as const,
        created: Date.now(),
        owned_by: 'zai',
      }));

      const responseData = {
        object: 'list' as const,
        data: models,
      };

      logger.info({
        requestId,
        modelCount: models.length,
      }, 'Available models request completed successfully');

      res.json(responseData);
    } catch (error: any) {
      logger.error({
        requestId,
        error: error.message,
      }, 'Available models request failed');

      res.status(500).json({
        error: {
          message: 'Failed to retrieve available models',
          type: 'api_error',
        },
      });
    }
  }
}

export const chatController = new ChatController();