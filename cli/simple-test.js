#!/usr/bin/env node

// Simple test for just chat completion
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const axios = require('axios');
const chalk = require('chalk');

async function testChat() {
  console.log('🧪 Testing Z.AI Chat CLI - Chat Completion Test\n');

  const port = process.env.PORT || 3000;
  const apiUrl = `http://localhost:${port}/api/v1`;
  const apiKey = process.env.ZAI_API_KEY;

  if (!apiKey) {
    console.error(chalk.red('❌ Error: ZAI_API_KEY not found in .env file'));
    process.exit(1);
  }

  try {
    // Test chat completion directly
    console.log('💬 Testing chat completion...');
    console.log('🌐 API URL:', apiUrl);
    console.log('🤖 Model: GLM-4.6\n');

    const response = await axios.post(`${apiUrl}/chat/completions`, {
      model: 'GLM-4.6',
      messages: [
        { role: 'user', content: 'Hello! Please say hi back and introduce yourself briefly.' }
      ],
      max_tokens: 100,
      temperature: 0.7,
      stream: false
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      }
    });

    const result = response.data;

    if (result.choices && result.choices.length > 0) {
      const choice = result.choices[0];
      const content = choice.message.content || choice.message.reasoning_content || '';

      console.log(chalk.green('✅ Chat completion successful!\n'));
      console.log(chalk.blue('📝 Response:'));
      console.log('─'.repeat(60));
      console.log(content);
      console.log('─'.repeat(60));

      if (result.usage) {
        console.log(chalk.gray(`\n📊 Tokens: ${result.usage.prompt_tokens} prompt, ${result.usage.completion_tokens} completion, ${result.usage.total_tokens} total`));
      }

      console.log(chalk.magenta('\n🎉 CLI is working! 🚀'));
      console.log('\n💡 To start the interactive CLI, run:');
      console.log(chalk.cyan('  npm run cli'));
      console.log(chalk.cyan('  cd cli && ./run.sh'));
      console.log(chalk.cyan('  cd cli && node index.js\n'));

      console.log('🎮 CLI Features:');
      console.log('  • Interactive chat with GLM models');
      console.log('  • Markdown formatting and code highlighting');
      console.log('  • Model selection (/models, /model <name>)');
      console.log('  • Conversation history (/history, /clear)');
      console.log('  • Token usage tracking');
      console.log('  • Slash commands for easy management');

    } else {
      console.error(chalk.red('❌ No response received from API'));
    }

  } catch (error) {
    console.error(chalk.red('❌ Chat completion failed:'));
    console.error(chalk.red('Error:'), error.message);

    if (error.response) {
      console.error(chalk.red('Status:'), error.response.status);
      console.error(chalk.red('Data:'), error.response.data);
    }

    console.error(chalk.yellow('\n🔧 Troubleshooting:'));
    console.error('1. Make sure the API server is running: npm run dev');
    console.error('2. Check if port 3060 is available');
    console.error('3. Verify the API key is still valid');
  }
}

testChat();