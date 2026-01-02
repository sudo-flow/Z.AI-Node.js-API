#!/bin/bash

# Z.AI Chat CLI Runner
# This script makes it easy to run the CLI with proper configuration

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Default configuration
# Try to get port from .env if available, otherwise default to 3000
PORT=3000
if [ -f "../.env" ]; then
    ENV_PORT=$(grep ^PORT= "../.env" | cut -d '=' -f2)
    if [ ! -z "$ENV_PORT" ]; then
        PORT=$ENV_PORT
    fi
fi

API_URL="http://localhost:$PORT/api/v1"
MODEL="GLM-4.6"

# Check if API server is running
if ! curl -s "$API_URL/health" > /dev/null 2>&1; then
    echo "❌ Z.AI API server is not running at $API_URL"
    echo "Please start the API server first with:"
    echo "  cd .. && npm run dev"
    exit 1
fi

echo "🚀 Starting Z.AI Chat CLI..."
echo "🌐 API URL: $API_URL"
echo "🤖 Model: $MODEL"
echo ""

# Run the CLI
# API Key is loaded from .env by index.js if not provided
node index.js --url "$API_URL" --model "$MODEL" "$@"
