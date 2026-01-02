import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { Readable } from 'stream';
import config from '../config/environment';
import {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionStreamChunk,
  ErrorResponse,
  ModelsResponse,
} from '../types/zai';

export class ZaiAPIClient {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: config.zai.baseUrl,
      timeout: config.zai.timeout,
      headers: {
        'Authorization': `Bearer ${config.zai.apiKey}`,
        'Content-Type': 'application/json',
        'Accept-Language': 'en-US,en',
      },
    });

    // Request interceptor for logging
    this.axiosInstance.interceptors.request.use(
      (request) => {
        // Remove sensitive data from logs
        const sanitizedRequest = {
          ...request,
          data: request.data ? this.sanitizeLogData(request.data) : undefined,
        };

        return request;
      },
      (error) => {
        console.error('Z.AI Client Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging and error handling
    this.axiosInstance.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        console.error('Z.AI Client Response Error:', this.formatError(error));
        return Promise.reject(this.formatError(error));
      }
    );
  }

  async createChatCompletion(
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    try {
      const response: AxiosResponse<ChatCompletionResponse> =
        await this.axiosInstance.post('chat/completions', {
          ...request,
          stream: false, // Ensure streaming is disabled for non-streaming requests
        });

      return response.data;
    } catch (error: any) {
      throw this.handleAPIError(error);
    }
  }

  async createChatCompletionStream(
    request: ChatCompletionRequest
  ): Promise<AsyncIterable<ChatCompletionStreamChunk>> {
    try {
      const response = await this.axiosInstance.post('chat/completions', {
        ...request,
        stream: true,
      }, {
        responseType: 'stream',
      });

      return this.parseStreamResponse(response.data);
    } catch (error: any) {
      throw this.handleAPIError(error);
    }
  }

  async getModels(): Promise<ModelsResponse> {
    try {
      const response: AxiosResponse<ModelsResponse> =
        await this.axiosInstance.get('models');

      return response.data;
    } catch (error: any) {
      throw this.handleAPIError(error);
    }
  }

  private async *parseStreamResponse(
    stream: Readable
  ): AsyncIterable<ChatCompletionStreamChunk> {
    let buffer = '';

    for await (const chunk of stream) {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        if (trimmedLine.startsWith('data: ')) {
          const data = trimmedLine.slice(6);

          if (data === '[DONE]') {
            return;
          }

          try {
            const parsedData = JSON.parse(data) as ChatCompletionStreamChunk;
            yield parsedData;
          } catch (parseError) {
            console.error('Error parsing stream chunk:', parseError);
            // Continue processing other chunks
          }
        }
      }
    }

    // Process any remaining data in buffer
    if (buffer.trim()) {
      const trimmedBuffer = buffer.trim();
      if (trimmedBuffer.startsWith('data: ')) {
        const data = trimmedBuffer.slice(6);
        if (data !== '[DONE]') {
          try {
            const parsedData = JSON.parse(data) as ChatCompletionStreamChunk;
            yield parsedData;
          } catch (parseError) {
            console.error('Error parsing final stream chunk:', parseError);
          }
        }
      }
    }
  }

  private handleAPIError(error: any): ErrorResponse {
    if (error.response) {
      // The Z.AI API returned an error response
      return {
        error: {
          message: error.response.data?.error?.message || 'API request failed',
          type: error.response.data?.error?.type || 'api_error',
          code: error.response.data?.error?.code,
        },
      };
    } else if (error.request) {
      // Network error
      return {
        error: {
          message: 'Network error - unable to reach Z.AI API',
          type: 'network_error',
        },
      };
    } else {
      // Other error
      return {
        error: {
          message: error.message || 'Unknown error occurred',
          type: 'internal_error',
        },
      };
    }
  }

  private formatError(error: any): any {
    if (error.response) {
      return {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
        },
      };
    } else if (error.request) {
      return {
        message: 'Network error',
        config: {
          url: error.config?.url,
          method: error.config?.method,
        },
      };
    } else {
      return {
        message: error.message,
        stack: error.stack,
      };
    }
  }

  private sanitizeLogData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = { ...data };

    // Remove or mask sensitive fields
    if (sanitized.api_key) {
      sanitized.api_key = '***';
    }

    // Sanitize messages (remove potential PII)
    if (Array.isArray(sanitized.messages)) {
      sanitized.messages = sanitized.messages.map((msg: any) => ({
        ...msg,
        content: typeof msg.content === 'string'
          ? msg.content.substring(0, 100) + (msg.content.length > 100 ? '...' : '')
          : msg.content,
      }));
    }

    return sanitized;
  }
}

// Singleton instance
export const zaiClient = new ZaiAPIClient();