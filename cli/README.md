# Z.AI Chat CLI

A command-line interface for interacting with the Z.AI Chat API.

## Features

- 🚀 **Interactive Chat**: Real-time conversation with GLM models
- 🎨 **Rich Formatting**: Supports markdown, code highlighting, and emoji indicators
- 🤖 **Model Selection**: Switch between different GLM models on the fly
- 💾 **Conversation History**: Maintain context throughout your session
- 📊 **Usage Tracking**: See token usage for each request
- 🛠️ **Simple Commands**: Easy-to-use slash commands for management

## Quick Start

### Option 1: Run Directly (Recommended)
```bash
# From the project root
npm run cli
```

### Option 2: Run the Setup Script
```bash
# From the CLI directory
cd cli
chmod +x run.sh
./run.sh
```

### Option 3: Manual Setup
```bash
cd cli
npm install
node index.js
```

## Usage

Once running, you can:

### Start Chatting
```
You: Hello! Can you help me write a Python function?

Assistant: I'd be happy to help you write a Python function! What kind of function would you like me to create?
```

### Use Commands

- `/help` - Show available commands
- `/models` - List available GLM models
- `/model <name>` - Change the active model (e.g., `/model GLM-4.6`)
- `/clear` - Clear conversation history
- `/history` - Show conversation history
- `/exit` or `/quit` - Exit the CLI

### Command Line Options

You can customize the CLI with command-line options:

```bash
node index.js --url <api-url> --key <api-key> --model <model-name>
```

**Options:**
- `-u, --url <url>` - API URL (default: `http://localhost:3060/api/v1`)
- `-k, --key <key>` - API key (default: built-in key)
- `-m, --model <model>` - Model to use (default: `GLM-4.6`)
- `-t, --temperature <temp>` - Temperature 0.0-1.0 (default: `0.7`)
- `--max-tokens <tokens>` - Maximum tokens (default: `2000`)

## Example Session

```
🚀 Z.AI Chat CLI
🌐 Connected to: http://localhost:3060/api/v1
🤖 Model: GLM-4.6
💡 Type /help for commands or just start chatting!
👋 Press Ctrl+C to exit

You: Write a simple JavaScript function to sort an array

🤖 Assistant is thinking...

Assistant:
──────────────────────────────────────────────────────────────────────────────
Here's a simple JavaScript function to sort an array:

```javascript
function sortArray(arr) {
  return arr.sort((a, b) => a - b);
}

// Example usage:
const numbers = [5, 2, 8, 1, 9];
const sorted = sortArray(numbers);
console.log(sorted); // [1, 2, 5, 8, 9]
```

This function:
- Takes an array as input
- Uses the built-in `sort()` method with a compare function
- Returns a new sorted array in ascending order
──────────────────────────────────────────────────────────────────────────────

📊 Tokens: 25 prompt, 45 completion, 70 total

You: /models

🔄 Loading models...

🤖 Available Models:
→ GLM-4.6
  GLM-4.5
  GLM-4.5-flash

You: /clear
✓ Conversation history cleared
```

## Prerequisites

- **Node.js 16+** installed
- **Z.AI API server** running (see main project)
- **API key** configured (built-in default provided)

## Features Explained

### Formatting
- **Bold text**: `**text**` appears as bold
- **Italic text**: `*text*` appears as italic
- **Code blocks**: ```python...``` appear with syntax highlighting
- **Inline code**: `variable` appears in cyan
- **Headers**: `# Title`, `## Subtitle`, `### Section`
- **Lists**: Bullet points and numbered lists

### Conversation Memory
The CLI maintains conversation context throughout your session. Each response builds on previous messages, allowing for continuous dialogue.

### Error Handling
- Network errors are caught and displayed clearly
- API authentication issues show helpful messages
- Invalid commands provide guidance

## Troubleshooting

### "API server is not running"
Start the API server first:
```bash
cd ..
npm run dev
```

### "Permission denied"
Make sure the run script is executable:
```bash
chmod +x run.sh
```

### Dependencies issues
Reinstall dependencies:
```bash
npm run cli:setup
```

## Development

To extend the CLI:

1. Edit `index.js` to add new features
2. Add new commands in the `handleCommand` method
3. Modify formatting in the `formatMarkdown` method

## License

MIT License - see main project for details.