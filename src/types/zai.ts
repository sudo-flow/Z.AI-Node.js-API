// Z.AI API Types based on the specification

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | Array<{
    type: 'text' | 'image_url' | 'audio_url' | 'video_url';
    text?: string;
    image_url?: {
      url: string;
      detail?: 'low' | 'high' | 'auto';
    };
    audio_url?: {
      url: string;
    };
    video_url?: {
      url: string;
    };
  }>;
  name?: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface Tool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  request_id?: string;
  do_sample?: boolean;
  stream?: boolean;
  reasoning?: boolean;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  tools?: Tool[];
  tool_choice?: 'auto' | string;
  tool_stream?: boolean;
  stop?: string[];
  response_format?: {
    type: 'text' | 'json_object';
  };
  user?: string;
}

export interface ChatCompletionResponse {
  id: string;
  request_id: string;
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage: TokenUsage;
  web_search?: WebSearchResult[];
}

export interface ChatCompletionChoice {
  index: number;
  message: {
    role: 'assistant';
    content: string;
    reasoning_content?: string;
    tool_calls?: ToolCall[];
  };
  finish_reason: 'stop' | 'length' | 'tool_calls';
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  prompt_tokens_details: {
    cached_tokens: number;
  };
}

export interface WebSearchResult {
  title: string;
  content: string;
  link: string;
  media?: string;
  icon?: string;
  refer?: string;
  publish_date?: string;
}

export interface ChatCompletionStreamChunk {
  id: string;
  choices: Array<{
    index: number;
    delta: {
      role?: 'assistant';
      content?: string;
      reasoning_content?: string;
      tool_calls?: ToolCall[];
    };
    finish_reason?: 'stop' | 'length' | 'tool_calls';
  }>;
  created: number;
  model: string;
  request_id?: string;
}

export interface ErrorResponse {
  error: {
    message: string;
    type: string;
    code?: string;
  };
}

export interface ModelInfo {
  id: string;
  object: 'model';
  created?: number;
  owned_by?: string;
}

export interface ModelsResponse {
  object: 'list';
  data: ModelInfo[];
}

// Available models from the specification
export const AVAILABLE_MODELS = {
  GLM_4_6: 'glm-4.6',
  GLM_4_5: 'glm-4.5',
  GLM_4_5_AIR: 'glm-4.5-air',
  GLM_4_5_X: 'glm-4.5-x',
  GLM_4_5_AIRX: 'glm-4.5-airx',
  GLM_4_5_FLASH: 'glm-4.5-flash',
  GLM_4_32B: 'glm-4-32b-0414-128k'
} as const;

export type AvailableModel = typeof AVAILABLE_MODELS[keyof typeof AVAILABLE_MODELS];