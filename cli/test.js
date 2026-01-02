#!/usr/bin/env node

// Simple test script for Z.AI CLI
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { ZAIChat } = require('./index.js');

async function testAPI() {
  console.log('🧪 Testing Z.AI API connection...');

  const port = process.env.PORT || 3000;
  const apiKey = process.env.ZAI_API_KEY;

  if (!apiKey) {
    console.error('❌ Error: ZAI_API_KEY not found in .env file');
    process.exit(1);
  }

  const chat = new ZAIChat(
    `http://localhost:${port}/api/v1`,
    apiKey,
    'GLM-4.6'
  );

  try {
    // Test models endpoint
    console.log('\n📋 Testing models endpoint...');
    const models = await chat.getModels();
    console.log('✅ Models loaded:', models.length, 'models available');
    models.forEach(model => {
      const indicator = model.id === chat.model ? '→' : ' ';
      console.log(`  ${indicator} ${model.id}`);
    });

    // Test chat completion
    console.log('\n💬 Testing chat completion...');
    const response = await chat.sendMessage('Hello! Say hi back briefly.');

    console.log('✅ Chat completion successful!');
    console.log('\n📝 Response:');
    console.log('─'.repeat(50));
    console.log(response.content);
    console.log('─'.repeat(50));

    if (response.usage) {
      console.log(`📊 Tokens: ${response.usage.prompt_tokens} prompt, ${response.usage.completion_tokens} completion, ${response.usage.total_tokens} total`);
    }

    console.log('\n🎉 All tests passed! CLI is ready to use.');
    console.log('\n💡 To start the interactive CLI, run:');
    console.log('  npm run cli');
    console.log('  or');
    console.log('  cd cli && ./run.sh');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('1. Make sure the API server is running: npm run dev');
    console.error('2. Check if the API key is valid');
    console.error('3. Verify the API URL is correct');
  }
}

testAPI();