# API Documentation

**Version:** 1.0.0  
**Base URL:** `http://localhost:3000`  
**API Version:** v1

---

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Endpoints](#endpoints)
  - [Health & Monitoring](#health--monitoring)
  - [Chat Completions](#chat-completions)
  - [Models](#models)
- [Request/Response Formats](#requestresponse-formats)
- [Error Handling](#error-handling)
- [Configuration](#configuration)
- [Code Examples](#code-examples)

---

## Overview

This microservice provides an OpenAI-compatible API gateway for Z.AI's GLM series language models. It acts as a proxy between your application and the Z.AI API, providing:

- **OpenAI-compatible interface** - Drop-in replacement for OpenAI SDK
- **Authentication & Security** - API key validation, rate limiting, CORS
- **Monitoring & Logging** - Health checks, metrics, structured logging
- **Request Validation** - Input validation and error handling

### Base URLs

| Environment | URL |
|-------------|-----|
| Local | `http://localhost:3000` |
| Production | `https://your-domain.com` |

### API Endpoints Summary

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/health` | GET | No | Comprehensive health check |
| `/ready` | GET | No | Readiness probe |
| `/alive` | GET | No | Liveness probe |
| `/api/v1/metrics` | GET | Yes | Service metrics |
| `/api/v1/chat/completions` | POST | Yes | Chat completions |
| `/api/v1/models` | GET | Yes | List available models |
| `/api/v1/models/available` | GET | No | Static model list |

---

## Authentication

All API endpoints (except health checks) require authentication via Bearer token.

### Header Format

```http
Authorization: Bearer YOUR_ZAI_API_KEY
```

### Example

```bash
curl -X POST http://localhost:3000/api/v1/chat/completions \
  -H "Authorization: Bearer d3f6346db1004954880449629d6f28dd.zeokk7SlJlHcWiEV" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

### Authentication Errors

| Status Code | Error | Description |
|-------------|-------|-------------|
| 401 | `missing_api_key` | No Authorization header provided |
| 401 | `invalid_api_key_format` | Header doesn't match `Bearer <token>` format |
| 401 | `invalid_api_key` | API key is invalid or too short |

---

## Rate Limiting

Rate limiting is applied to all authenticated endpoints.

### Default Limits

| Parameter | Value |
|-----------|-------|
| Window | 15 minutes (900,000 ms) |
| Max Requests | 100 requests per window |

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1772298303
```

### Rate Limit Exceeded

```json
{
  "error": {
    "message": "Too many requests from this IP, please try again later.",
    "type": "rate_limit_error",
    "code": "rate_limit_exceeded"
  }
}
```

---

## Endpoints

### Health & Monitoring

#### GET `/health`

Comprehensive health check including external API connectivity.

**Request:**
```bash
curl http://localhost:3000/health
```

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-28T17:02:32.032Z",
  "uptime": 118901,
  "version": "1.0.0",
  "services": {
    "zai_api": "healthy"
  },
  "metrics": {
    "totalRequests": 5,
    "activeConnections": 0,
    "memoryUsage": {
      "rss": 78495744,
      "heapTotal": 15433728,
      "heapUsed": 14163712,
      "external": 3075546,
      "arrayBuffers": 4364324
    }
  }
}
```

**Response (503 Service Unavailable):**
```json
{
  "status": "unhealthy",
  "timestamp": "2026-02-28T17:02:32.032Z",
  "uptime": 118901,
  "version": "1.0.0",
  "services": {
    "zai_api": "unhealthy"
  },
  "error": "Connection timeout"
}
```

---

#### GET `/ready`

Readiness probe for Kubernetes/load balancer checks.

**Request:**
```bash
curl http://localhost:3000/ready
```

**Response (200 OK):**
```json
{
  "status": "ready",
  "timestamp": "2026-02-28T17:02:32.032Z",
  "checks": {
    "zai_api": "pass"
  }
}
```

---

#### GET `/alive`

Liveness probe to check if the service is running.

**Request:**
```bash
curl http://localhost:3000/alive
```

**Response (200 OK):**
```json
{
  "status": "alive",
  "timestamp": "2026-02-28T17:02:32.032Z",
  "uptime": 118901,
  "pid": 1
}
```

---

#### GET `/api/v1/metrics`

Service metrics and performance data.

**Request:**
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  http://localhost:3000/api/v1/metrics
```

**Response (200 OK):**
```json
{
  "timestamp": "2026-02-28T17:02:32.032Z",
  "uptime": 118901,
  "requestCount": 150,
  "activeConnections": 3,
  "memory": {
    "rss": 78495744,
    "heapTotal": 15433728,
    "heapUsed": 14163712,
    "external": 3075546
  },
  "cpu": {
    "user": 1234567,
    "system": 234567
  },
  "node": {
    "version": "v18.19.0",
    "pid": 1,
    "platform": "linux",
    "arch": "x64"
  }
}
```

---

### Chat Completions

#### POST `/api/v1/chat/completions`

Create a chat completion using the specified model.

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "glm-4.7",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Hello!"}
    ],
    "temperature": 1.0,
    "max_tokens": 1024
  }'
```

**Request Body Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `model` | string | Yes | - | Model ID (e.g., `glm-4.7`, `glm-4.6`) |
| `messages` | array | Yes | - | Array of message objects |
| `temperature` | number | No | Model-specific | Sampling temperature (0.0-2.0) |
| `max_tokens` | integer | No | 1024 | Maximum tokens to generate (1-131072) |
| `stream` | boolean | No | false | Enable streaming responses |
| `top_p` | number | No | 1.0 | Nucleus sampling parameter (0.0-1.0) |
| `stop` | array | No | - | Stop sequences (max 1) |
| `response_format` | object | No | - | Output format specification |
| `tools` | array | No | - | Available tools for function calling |
| `tool_choice` | string | No | - | Tool selection mode |
| `user` | string | No | - | Unique user identifier (6-128 chars) |

**Message Object:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `role` | string | Yes | `system`, `user`, `assistant`, or `tool` |
| `content` | string/array | Yes | Message content (supports multimodal) |
| `name` | string | No | Optional name for the message |
| `tool_call_id` | string | No | ID for tool response messages |

**Response (200 OK):**
```json
{
  "id": "20260301010503a72a4f8355eb4a7b",
  "request_id": "20260301010503a72a4f8355eb4a7b",
  "created": 1772298303,
  "model": "glm-4.7",
  "object": "chat.completion",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I assist you today?",
        "reasoning_content": "User is greeting me..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 8,
    "total_tokens": 18,
    "prompt_tokens_details": {
      "cached_tokens": 4
    },
    "completion_tokens_details": {
      "reasoning_tokens": 5
    }
  }
}
```

**Streaming Response:**

When `stream: true` is set, the response is streamed as Server-Sent Events (SSE):

```
data: {"id":"...","choices":[{"delta":{"content":"Hello"},"index":0}]}

data: {"id":"...","choices":[{"delta":{"content":"!"},"index":0}]}

data: [DONE]
```

**Error Responses:**

| Status | Error Code | Description |
|--------|------------|-------------|
| 400 | `invalid_request_error` | Missing required fields |
| 401 | `authentication_error` | Invalid/missing API key |
| 429 | `rate_limit_error` | Rate limit exceeded |
| 500 | `api_error` | Internal server error |

---

### Models

#### GET `/api/v1/models`

List all available models (requires authentication).

**Request:**
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  http://localhost:3000/api/v1/models
```

**Response (200 OK):**
```json
{
  "object": "list",
  "data": [
    {
      "id": "glm-4.7",
      "object": "model",
      "created": 1772298168691,
      "owned_by": "zai"
    },
    {
      "id": "glm-4.7-flash",
      "object": "model",
      "created": 1772298168691,
      "owned_by": "zai"
    }
  ]
}
```

---

#### GET `/api/v1/models/available`

Get static list of available models (no authentication required).

**Request:**
```bash
curl http://localhost:3000/api/v1/models/available
```

**Response (200 OK):**
```json
{
  "object": "list",
  "data": [
    {
      "id": "glm-4.7",
      "object": "model",
      "created": 1772298168691,
      "owned_by": "zai"
    },
    {
      "id": "glm-4.7-flash",
      "object": "model",
      "created": 1772298168691,
      "owned_by": "zai"
    },
    {
      "id": "glm-4.6",
      "object": "model",
      "created": 1772298168691,
      "owned_by": "zai"
    },
    {
      "id": "glm-4.5",
      "object": "model",
      "created": 1772298168691,
      "owned_by": "zai"
    },
    {
      "id": "glm-4.5-flash",
      "object": "model",
      "created": 1772298168691,
      "owned_by": "zai"
    }
  ]
}
```

---

## Request/Response Formats

### Available Models

| Model ID | Description | Context Length | Max Output | Default Temp |
|----------|-------------|----------------|------------|--------------|
| `glm-4.7` | Latest model with enhanced coding & reasoning | 200K | 128K | 1.0 |
| `glm-4.7-flash` | Fast, efficient model | 200K | 128K | 1.0 |
| `glm-4.6` | Previous flagship model | 128K | 128K | 1.0 |
| `glm-4.5` | Advanced reasoning & coding | 128K | 128K | 0.6 |
| `glm-4.5-flash` | Fast response variant | 128K | 128K | 0.6 |

### Message Roles

```typescript
type MessageRole = 'system' | 'user' | 'assistant' | 'tool';
```

### Finish Reasons

```typescript
type FinishReason = 'stop' | 'length' | 'tool_calls';
```

### Response Format Options

```json
{
  "response_format": {
    "type": "json_object"
  }
}
```

---

## Error Handling

### Error Response Format

All errors follow this structure:

```json
{
  "error": {
    "message": "Human-readable error message",
    "type": "error_type",
    "code": "error_code",
    "details": []
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `missing_api_key` | 401 | No Authorization header |
| `invalid_api_key` | 401 | Invalid API key |
| `invalid_request_error` | 400 | Invalid request body |
| `rate_limit_error` | 429 | Too many requests |
| `api_error` | 500 | Internal server error |
| `not_found_error` | 404 | Route not found |

### Common Error Responses

**400 Bad Request:**
```json
{
  "error": {
    "message": "Invalid request body",
    "type": "invalid_request_error",
    "details": [
      {
        "field": "model",
        "message": "Model must be one of: glm-4.7, glm-4.6, ...",
        "value": "invalid-model"
      }
    ]
  }
}
```

**401 Unauthorized:**
```json
{
  "error": {
    "message": "Valid Authorization header required",
    "type": "authentication_error"
  }
}
```

**429 Too Many Requests:**
```json
{
  "error": {
    "message": "Too many requests from this IP, please try again later.",
    "type": "rate_limit_error",
    "code": "rate_limit_exceeded"
  }
}
```

---

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment | `development` | No |
| `PORT` | Service port | `3000` | No |
| `ZAI_API_KEY` | Z.AI API key | - | Yes |
| `ZAI_BASE_URL` | Z.AI API base URL | `https://api.z.ai/api/coding/paas/v4/` | No |
| `ZAI_TIMEOUT` | API timeout (ms) | `300000` | No |
| `CORS_ORIGINS` | Allowed CORS origins | `*` | No |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `900000` | No |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` | No |
| `LOG_LEVEL` | Logging level | `info` | No |
| `LOG_PRETTY_PRINT` | Pretty print logs | `true` | No |
| `METRICS_ENABLED` | Enable metrics | `true` | No |

### Docker Configuration

```yaml
services:
  zai-endpoint:
    image: zai-endpoint:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - ZAI_API_KEY=your_api_key
      - PORT=3000
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

---

## Code Examples

### cURL

**Basic Chat:**
```bash
curl -X POST http://localhost:3000/api/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "glm-4.7",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

**Streaming Chat:**
```bash
curl -X POST http://localhost:3000/api/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "glm-4.7",
    "messages": [{"role": "user", "content": "Tell me a story"}],
    "stream": true
  }'
```

---

### Python (OpenAI SDK)

```python
from openai import OpenAI

client = OpenAI(
    api_key="YOUR_ZAI_API_KEY",
    base_url="http://localhost:3000/api/v1/"
)

# Basic completion
response = client.chat.completions.create(
    model="glm-4.7",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Hello!"}
    ],
    temperature=1.0,
    max_tokens=1024
)

print(response.choices[0].message.content)

# Streaming
stream = client.chat.completions.create(
    model="glm-4.7",
    messages=[{"role": "user", "content": "Tell me a story"}],
    stream=True
)

for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="")
```

---

### JavaScript/TypeScript

```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: 'YOUR_ZAI_API_KEY',
  baseURL: 'http://localhost:3000/api/v1/'
});

// Basic completion
const response = await client.chat.completions.create({
  model: 'glm-4.7',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello!' }
  ],
  temperature: 1.0,
  max_tokens: 1024
});

console.log(response.choices[0].message.content);

// Streaming
const stream = await client.chat.completions.create({
  model: 'glm-4.7',
  messages: [{ role: 'user', content: 'Tell me a story' }],
  stream: true
});

for await (const chunk of stream) {
  if (chunk.choices[0].delta.content) {
    process.stdout.write(chunk.choices[0].delta.content);
  }
}
```

---

### Node.js (Native Fetch)

```javascript
async function createChatCompletion(messages) {
  const response = await fetch('http://localhost:3000/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'glm-4.7',
      messages: messages,
      temperature: 1.0,
      max_tokens: 1024
    })
  });

  const data = await response.json();
  return data.choices[0].message.content;
}

// Usage
const content = await createChatCompletion([
  { role: 'user', content: 'Hello!' }
]);
console.log(content);
```

---

### Java (OkHttp)

```java
OkHttpClient client = new OkHttpClient();

JSONObject requestBody = new JSONObject();
requestBody.put("model", "glm-4.7");

JSONArray messages = new JSONArray();
JSONObject userMessage = new JSONObject();
userMessage.put("role", "user");
userMessage.put("content", "Hello!");
messages.put(userMessage);

requestBody.put("messages", messages);
requestBody.put("temperature", 1.0);
requestBody.put("max_tokens", 1024);

Request request = new Request.Builder()
    .url("http://localhost:3000/api/v1/chat/completions")
    .post(RequestBody.create(requestBody.toString(), MediaType.get("application/json")))
    .addHeader("Authorization", "Bearer YOUR_API_KEY")
    .build();

try (Response response = client.newCall(request).execute()) {
    String responseBody = response.body().string();
    JSONObject jsonResponse = new JSONObject(responseBody);
    String content = jsonResponse.getJSONArray("choices")
        .getJSONObject(0)
        .getJSONObject("message")
        .getString("content");
    System.out.println(content);
}
```

---

## Health Check Integration

### Kubernetes

```yaml
livenessProbe:
  httpGet:
    path: /alive
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 30
  timeoutSeconds: 10
  successThreshold: 1
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 10
  timeoutSeconds: 10
  successThreshold: 1
  failureThreshold: 3
```

### Docker Compose

```yaml
healthcheck:
  test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

---

## Support

For issues and questions:
- Check the [Z.AI API Documentation](https://docs.z.ai/api-reference)
- Review service logs: `docker compose logs zai-endpoint`
- Contact the development team

---

**Last Updated:** 2026-02-28  
**API Version:** v1  
**Service Version:** 1.0.0
