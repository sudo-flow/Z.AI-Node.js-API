// Anthropic-compatible API types for Z.AI

export interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | Array<{
    type: 'text' | 'image';
    text?: string;
    source?: {
      type: 'base64';
      media_type: string;
      data: string;
    };
  }>;
}

export interface AnthropicRequest {
  model: string;
  messages: AnthropicMessage[];
  max_tokens: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stop_sequences?: string[];
  stream?: boolean;
  system?: string;
  tools?: any[];
  tool_choice?: any;
}

export interface AnthropicResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{
    type: 'text' | 'tool_use' | 'tool_result';
    text?: string;
    id?: string;
    name?: string;
    input?: any;
    tool_use_id?: string;
    is_error?: boolean;
    content?: string | Array<any>;
  }>;
  model: string;
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use';
  stop_sequence?: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface AnthropicStreamChunk {
  type: 'message_start' | 'content_block_start' | 'content_block_delta' | 'content_block_stop' | 'message_delta' | 'message_stop';
  message?: {
    id: string;
    type: 'message';
    role: 'assistant';
    content: any[];
    model: string;
    usage: {
      input_tokens: number;
      output_tokens: number;
    };
  };
  content_block?: {
    type: 'text' | 'tool_use';
    index: number;
    text?: string;
    id?: string;
    name?: string;
    input?: any;
  };
  delta?: {
    type?: 'text_delta';
    text?: string;
    stop_reason?: 'end_turn' | 'max_tokens' | 'stop_sequence';
    stop_sequence?: string;
  };
  usage?: {
    output_tokens: number;
  };
  index?: number;
}

// Anthropic model mappings for Z.AI
export const ANTHROPIC_MODEL_MAPPING = {
  'claude-3-opus-20240229': 'glm-4.6',
  'claude-3-sonnet-20240229': 'glm-4.6',
  'claude-3-haiku-20240307': 'glm-4.5-flash',
  'claude-3-5-sonnet-20240620': 'glm-4.6',
  'claude-3-5-sonnet-20241022': 'glm-4.6',
} as const;

export const ZAI_ANTHROPIC_MODELS = {
  'glm-4.6': 'claude-3-sonnet-20240229',
  'glm-4.5': 'claude-3-sonnet-20240229',
  'glm-4.5-flash': 'claude-3-haiku-20240307',
} as const;