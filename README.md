# OpenAI-Compatible Endpoint Microservice

A production-ready Node.js/TypeScript microservice that provides an OpenAI-compatible RESTful API gateway for multiple AI providers (Z.AI, OpenRouter, and more).

## Features

- 🚀 **OpenAI-Compatible API**: Drop-in replacement for OpenAI clients
- 🔌 **Multi-Provider Support**: Z.AI, OpenRouter, and more
- 🔄 **Streaming & Non-Streaming**: Support for both response modes
- 🔐 **Authentication & Security**: API key validation, rate limiting, CORS
- 📊 **Monitoring & Logging**: Health checks, metrics, structured logging
- 🐳 **Docker Support**: Production-ready containerization
- ⚡ **Performance**: Connection pooling, error handling, retries
- 🛡️ **Enterprise Ready**: Input validation, error handling, graceful shutdown

## Quick Start

### Prerequisites

- Node.js 18+
- Docker (optional but recommended)

### Installation

1. **Clone and install dependencies**:
```bash
git clone <repository-url>
cd zai-endpoint
npm install
```

2. **Configure environment**:
```bash
cp .env.example .env
# Edit .env with your API keys and other settings
```

3. **Start the service**:

   **Development**:
```bash
npm run dev
```

   **Production (Docker)**:
```bash
docker compose up -d
```

### Configuration

Key environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `DEFAULT_PROVIDER_API_KEY` | Primary provider API key | Required |
| `DEFAULT_PROVIDER_BASE_URL` | Primary provider base URL | `https://api.z.ai/api/coding/paas/v4/` |
| `OPENROUTER_API_KEY` | OpenRouter API key | Optional |
| `PORT` | Service port | `3000` |
| `CORS_ORIGINS` | Allowed CORS origins | `*` |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |
| `LOG_LEVEL` | Logging level | `info` |

## API Endpoints

### Chat Completions
```http
POST /api/v1/chat/completions
```

**Example Request**:
```bash
curl -X POST http://localhost:3000/api/v1/chat/completions \
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

**Streaming Response**:
```bash
curl -X POST http://localhost:3000/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "glm-4.7",
    "messages": [{"role": "user", "content": "Tell me a story"}],
    "stream": true
  }'
```

### Models
```http
GET /api/v1/models              # List all available models
GET /api/v1/models/available    # Static list from specification
```

### Health Checks
```http
GET /health     # Comprehensive health check
GET /ready      # Readiness probe
GET /alive      # Liveness probe
GET /api/v1/metrics  # Service metrics
```

## Supported Models

### Z.AI Models (Default Provider)
| Model | Description | Context | Max Output |
|-------|-------------|---------|------------|
| `glm-4.7` | Latest model with enhanced coding & reasoning | 200K | 128K |
| `glm-4.7-flash` | Fast, efficient model | 200K | 128K |
| `glm-4.6` | Previous flagship model | 128K | 128K |
| `glm-4.5` | Advanced reasoning and coding | 128K | 128K |
| `glm-4.5-flash` | Fast response variant | 128K | 128K |

### OpenRouter Models
| Model | Provider | Description |
|-------|----------|-------------|
| `amazon/nova-micro-v1` | Amazon | Fast, cost-effective |
| `qwen/qwen3.5-flash-02-23` | Qwen | High performance, 1M context |

## Development

### Scripts
```bash
npm run dev          # Start development server with hot reload
npm run build        # Build TypeScript to JavaScript
npm run start        # Start production server
npm test             # Run tests
npm run lint         # ESLint check
npm run lint:fix     # Fix ESLint issues
```

### Project Structure
```
src/
├── config/          # Configuration files
├── controllers/     # Route handlers
├── middleware/      # Express middleware
├── client/         # API clients
├── types/          # TypeScript type definitions (OpenAI-compatible)
├── routes/         # API routes
└── index.ts        # Server entry point
```

## Docker Deployment

### Build Image
```bash
docker build -t openai-endpoint .
```

### Run Container
```bash
docker run -p 3000:3000 \
  -e DEFAULT_PROVIDER_API_KEY=your_api_key \
  -e NODE_ENV=production \
  openai-endpoint
```

### Docker Compose
```bash
# Start all services
docker compose up -d

# Scale the service
docker compose up -d --scale zai-endpoint=3
```

## OpenAI SDK Compatibility

The service is fully compatible with OpenAI SDKs by changing the base URL:

### Python
```python
from openai import OpenAI

client = OpenAI(
    api_key="your-api-key",
    base_url="http://localhost:3000/api/v1/"
)

response = client.chat.completions.create(
    model="glm-4.7",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

### JavaScript/TypeScript
```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'http://localhost:3000/api/v1/',
  apiKey: 'your-api-key'
});

const response = await client.chat.completions.create({
  model: 'glm-4.7',
  messages: [{ role: 'user', content: 'Hello!' }]
});
```

### cURL
```bash
curl -X POST http://localhost:3000/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "glm-4.7",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

## Adding New Providers

To add a new AI provider:

1. Add the model mapping in `src/routes/simple.ts`:
```typescript
const MODEL_ROUTES = {
  // Existing models...
  'new-provider/model-name': {
    baseUrl: 'https://api.newprovider.com/v1',
    apiKeyEnv: 'NEW_PROVIDER_API_KEY',
    provider: 'NewProvider'
  }
};
```

2. Add the environment variable to `.env`:
```bash
NEW_PROVIDER_API_KEY=your_new_provider_key
```

3. Add the model to `src/types/openai.ts`:
```typescript
export const AVAILABLE_MODELS = {
  // Existing models...
  NEW_PROVIDER_MODEL: 'new-provider/model-name'
};
```

## Production Considerations

### Security
- Store API keys securely (environment variables, secrets manager)
- Enable HTTPS in production
- Configure appropriate CORS origins
- Set restrictive rate limits
- Monitor for unusual usage patterns

### Performance
- Use connection pooling
- Enable Redis for caching and rate limiting
- Monitor memory usage and request latency
- Implement appropriate scaling strategies

### Monitoring
- Health checks available at `/health`
- Metrics endpoint at `/api/v1/metrics`
- Structured JSON logging
- Request tracing with X-Request-ID headers

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
1. Check the API documentation
2. Review this repository's issues
3. Contact the development team

---

**Version**: 1.0.0  
**API Compatibility**: OpenAI v1  
**Supported Providers**: Z.AI, OpenRouter
