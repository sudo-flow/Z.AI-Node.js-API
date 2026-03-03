import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { AVAILABLE_MODELS } from '../types/openai';

// Chat Completion Request Validation Schema
const chatCompletionSchema = Joi.object({
  model: Joi.string()
    .valid(...Object.values(AVAILABLE_MODELS))
    .required()
    .messages({
      'any.only': `Model must be one of: ${Object.values(AVAILABLE_MODELS).join(', ')}`,
      'any.required': 'Model is required',
    }),

  messages: Joi.array()
    .items(
      Joi.object({
        role: Joi.string()
          .valid('system', 'user', 'assistant', 'tool')
          .required(),
        content: Joi.alternatives().try(
          Joi.string().required(),
          Joi.array().items(
            Joi.object({
              type: Joi.string()
                .valid('text', 'image_url', 'audio_url', 'video_url')
                .required(),
              text: Joi.when('type', {
                is: 'text',
                then: Joi.string().required(),
                otherwise: Joi.optional(),
              }),
              image_url: Joi.when('type', {
                is: 'image_url',
                then: Joi.object({
                  url: Joi.string().uri().required(),
                  detail: Joi.string()
                    .valid('low', 'high', 'auto')
                    .optional(),
                }).required(),
                otherwise: Joi.optional(),
              }),
              audio_url: Joi.when('type', {
                is: 'audio_url',
                then: Joi.object({
                  url: Joi.string().uri().required(),
                }).required(),
                otherwise: Joi.optional(),
              }),
              video_url: Joi.when('type', {
                is: 'video_url',
                then: Joi.object({
                  url: Joi.string().uri().required(),
                }).required(),
                otherwise: Joi.optional(),
              }),
            })
          ).required()
        ).required(),
        name: Joi.string().optional(),
        tool_call_id: Joi.string().optional(),
        tool_calls: Joi.array().optional(),
      })
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'Messages array must contain at least one message',
    }),

  request_id: Joi.string().optional(),
  do_sample: Joi.boolean().optional(),
  stream: Joi.boolean().optional(),
  reasoning: Joi.boolean().optional(),
  temperature: Joi.number()
    .min(0)
    .max(2)
    .optional()
    .messages({
      'number.min': 'Temperature must be at least 0',
      'number.max': 'Temperature must be at most 2',
    }),
  top_p: Joi.number()
    .min(0)
    .max(1)
    .optional()
    .messages({
      'number.min': 'Top_p must be at least 0',
      'number.max': 'Top_p must be at most 1',
    }),
  max_tokens: Joi.number()
    .integer()
    .min(1)
    .max(131072)
    .optional()
    .messages({
      'number.min': 'Max tokens must be at least 1',
      'number.max': 'Max tokens cannot exceed 131072',
    }),
  tools: Joi.array().optional(),
  tool_choice: Joi.string().optional(),
  tool_stream: Joi.boolean().optional(),
  stop: Joi.array()
    .items(Joi.string())
    .max(1)
    .optional()
    .messages({
      'array.max': 'Stop array can contain at most 1 string',
    }),
  response_format: Joi.object({
    type: Joi.string()
      .valid('text', 'json_object')
      .default('text'),
  }).optional(),
  user: Joi.string()
    .min(6)
    .max(128)
    .optional()
    .messages({
      'string.min': 'User ID must be at least 6 characters',
      'string.max': 'User ID cannot exceed 128 characters',
    }),
}).custom((value, helpers) => {
  // Additional cross-field validations
  if (value.response_format?.type === 'json_object') {
    // Ensure the system message contains JSON instructions
    const systemMessage = value.messages.find((msg: any) => msg.role === 'system');
    if (!systemMessage || !systemMessage.content.includes('JSON')) {
      return helpers.error('custom.json_missing_system_instruction');
    }
  }

  // Validate temperature defaults based on model
  const modelTempDefaults: Record<string, number> = {
    'glm-4.7': 1.0,
    'glm-4.7-flash': 1.0,
    'glm-4.6': 1.0,
    'glm-4.5': 0.6,
    'glm-4.5-air': 0.6,
    'glm-4.5-x': 0.6,
    'glm-4.5-airx': 0.6,
    'glm-4.5-flash': 0.6,
    'glm-4-32b-0414-128k': 0.75,
    // OpenRouter models
    'amazon/nova-micro-v1': 0.7,
    'qwen/qwen3.5-flash-02-23': 0.7
  };

  if (!value.temperature && modelTempDefaults[value.model]) {
    value.temperature = modelTempDefaults[value.model];
  }

  return value;
}).messages({
  'custom.json_missing_system_instruction':
    'When using response_format type "json_object", the system message must contain instructions to output JSON',
});

// Validation middleware factory
export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const errorDetails = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));

      return res.status(400).json({
        error: {
          message: 'Invalid request body',
          type: 'invalid_request_error',
          details: errorDetails,
        },
      });
    }

    // Replace request body with validated and cleaned data
    req.body = value;
    next();
  };
};

// Pre-built validation middleware
export const validateChatCompletion = validateRequest(chatCompletionSchema);

// Query parameter validation for GET requests
export const validateGetModels = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(20),
    offset: Joi.number()
      .integer()
      .min(0)
      .default(0),
  });

  const { error, value } = schema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  });

  if (error) {
    return res.status(400).json({
      error: {
        message: 'Invalid query parameters',
        type: 'invalid_request_error',
        details: error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
        })),
      },
    });
  }

  req.query = value;
  next();
};