# Z.AI Endpoint Microservice

A production-ready Node.js/TypeScript microservice that provides a RESTful API gateway for the Z.AI (Zhipu AI) API platform, supporting GLM series large language models.

## Features

- 🚀 **OpenAI-Compatible API**: Drop-in replacement for OpenAI clients
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
# Edit .env with your Z.AI API key and other settings
```

3. **Start the service**:

   **Development**:
```bash
npm run dev
```

   **Production (Docker)**:
```bash
docker-compose up -d
```

### Configuration

Key environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `ZAI_API_KEY` | Your Z.AI API key | Required |
| `ZAI_BASE_URL` | Z.AI API base URL | `https://api.z.ai/api/paas/v4/` |
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
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "glm-4.6",
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
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "glm-4.6",
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

- `glm-4.6` - Latest flagship model for agents
- `glm-4.5` - Advanced reasoning and coding
- `glm-4.5-air` - Efficient compact model
- `glm-4.5-x` - Extended capabilities
- `glm-4.5-airx` - Air extended version
- `glm-4.5-flash` - Fast response variant
- `glm-4-32b-0414-128k` - 32B parameter model

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
├── client/         # Z.AI API client
├── types/          # TypeScript type definitions
├── routes/         # API routes
└── index.ts        # Server entry point
```

## Docker Deployment

### Build Image
```bash
docker build -t zai-endpoint .
```

### Run Container
```bash
docker run -p 3000:3000 \
  -e ZAI_API_KEY=your_api_key \
  -e NODE_ENV=production \
  zai-endpoint
```

### Docker Compose
```bash
# With Redis and Nginx
docker-compose up -d

# Scale the service
docker-compose up -d --scale zai-endpoint=3
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
- Health checks are available at `/health`
- Metrics endpoint at `/api/v1/metrics`
- Structured JSON logging
- Request tracing with X-Request-ID headers

## OpenAI SDK Compatibility

The service is compatible with OpenAI SDKs by changing the base URL:

```python
from openai import OpenAI

client = OpenAI(
    api_key="your-zai-api-key",
    base_url="http://localhost:3000/api/v1/"
)

response = client.chat.completions.create(
    model="glm-4.6",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
1. Check the [Z.AI API Documentation](https://docs.z.ai/api-reference)
2. Review this repository's issues
3. Contact the development team

---

**Version**: 1.0.0
**Compatible with**: Z.AI API v4