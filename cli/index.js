#!/usr/bin/env node

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Command } = require('commander');
const readline = require('readline');
const axios = require('axios');
const chalk = require('chalk');

class ZAIChat {
  constructor(apiUrl, apiKey, model = 'GLM-4.6') {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
    this.model = model;
    this.messages = [];
  }

  async getModels() {
    try {
      const response = await axios.get(`${this.apiUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      return response.data.data;
    } catch (error) {
      console.error(chalk.red('Error fetching models:'), error.message);
      return [];
    }
  }

  async sendMessage(message, temperature = 0.7, maxTokens = 2000) {
    try {
      const requestData = {
        model: this.model,
        messages: [...this.messages, { role: 'user', content: message }],
        temperature,
        max_tokens: maxTokens,
        stream: false,
      };

      const response = await axios.post(`${this.apiUrl}/chat/completions`, requestData, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        responseType: 'json',
      });

      const result = response.data;

      if (result.choices && result.choices.length > 0) {
        const choice = result.choices[0];
        const content = choice.message.content || choice.message.reasoning_content || '';

        // Update conversation history
        this.messages.push({ role: 'user', content: message });
        this.messages.push({ role: 'assistant', content });

        return {
          content,
          usage: result.usage,
          model: result.model,
          finishReason: choice.finish_reason,
        };
      } else {
        throw new Error('No response from API');
      }
    } catch (error) {
      console.error(chalk.red('Error sending message:'), error.response?.data || error.message);
      throw error;
    }
  }

  clearHistory() {
    this.messages = [];
  }

  getHistorySize() {
    return this.messages.length;
  }
}

class CLIInterface {
  constructor(chat) {
    this.chat = chat;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.blue('You: '),
      terminal: true,
    });

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.rl.on('line', async (input) => {
      await this.handleInput(input.trim());
    });

    this.rl.on('close', () => {
      console.log(chalk.yellow('\nGoodbye! 👋'));
      process.exit(0);
    });

    process.on('SIGINT', () => {
      this.rl.close();
    });
  }

  async handleInput(input) {
    if (!input) return;

    // Handle commands
    if (input.startsWith('/')) {
      await this.handleCommand(input);
      return;
    }

    // Send message
    try {
      console.log(chalk.blue('\nYou:'), input);

      console.log(chalk.yellow('🤖 Assistant is thinking...'));

      const response = await this.chat.sendMessage(input);

      console.log(chalk.green('\nAssistant:'));
      console.log('─'.repeat(Math.min(80, process.stdout.columns || 80)));

      // Simple formatting for code blocks and markdown
      const formattedContent = this.formatMarkdown(response.content);
      console.log(formattedContent);

      console.log('─'.repeat(Math.min(80, process.stdout.columns || 80)));

      if (response.usage) {
        console.log(chalk.gray(`\n📊 Tokens: ${response.usage.prompt_tokens} prompt, ${response.usage.completion_tokens} completion, ${response.usage.total_tokens} total`));
      }

      this.rl.prompt();
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error.message);
      this.rl.prompt();
    }
  }

  formatMarkdown(text) {
    return text
      // Bold text
      .replace(/\*\*(.*?)\*\*/g, chalk.bold('$1'))
      // Italic text
      .replace(/\*(.*?)\*/g, chalk.italic('$1'))
      // Code blocks
      .replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        return chalk.gray('\n' + code.trim() + '\n');
      })
      // Inline code
      .replace(/`([^`]+)`/g, chalk.cyan('$1'))
      // Headers
      .replace(/^### (.*$)/gim, chalk.green('### $1'))
      .replace(/^## (.*$)/gim, chalk.blue('## $1'))
      .replace(/^# (.*$)/gim, chalk.magenta('# $1'))
      // Lists
      .replace(/^\* (.+)/gim, chalk.yellow('• $1'))
      .replace(/^\d+\. (.+)/gim, chalk.yellow('• $1'));
  }

  async handleCommand(command) {
    const parts = command.split(' ');
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (cmd) {
      case '/help':
        this.showHelp();
        break;
      case '/clear':
        this.chat.clearHistory();
        console.log(chalk.green('✓ Conversation history cleared'));
        break;
      case '/models':
        await this.showModels();
        break;
      case '/model':
        if (args.length === 0) {
          console.log(chalk.yellow('Current model:'), this.chat.model);
        } else {
          this.chat.model = args.join(' ');
          console.log(chalk.green('✓ Model changed to:'), this.chat.model);
        }
        break;
      case '/history':
        this.showHistory();
        break;
      case '/exit':
      case '/quit':
        this.rl.close();
        break;
      default:
        console.log(chalk.red('Unknown command:'), cmd);
        console.log('Type /help for available commands');
    }

    this.rl.prompt();
  }

  showHelp() {
    console.log(chalk.cyan('\n📋 Available Commands:'));
    console.log(chalk.white('  /help          Show this help message'));
    console.log(chalk.white('  /clear         Clear conversation history'));
    console.log(chalk.white('  /models        Show available models'));
    console.log(chalk.white('  /model <name>  Change model (e.g., /model GLM-4.6)'));
    console.log(chalk.white('  /history       Show conversation history'));
    console.log(chalk.white('  /exit, /quit   Exit the chat'));
    console.log();
  }

  async showModels() {
    console.log(chalk.yellow('🔄 Loading models...'));
    try {
      const models = await this.chat.getModels();

      console.log(chalk.cyan('\n🤖 Available Models:'));
      models.forEach(model => {
        const indicator = model.id === this.chat.model ? chalk.green('→') : ' ';
        console.log(`${indicator} ${chalk.white(model.id)}`);
      });
      console.log();
    } catch (error) {
      console.error(chalk.red('❌ Failed to load models:'), error.message);
    }
  }

  showHistory() {
    console.log(chalk.cyan('\n💬 Conversation History:'));
    console.log(`Total messages: ${this.chat.getHistorySize()}`);
    console.log();

    this.chat.messages.forEach((msg, index) => {
      const role = msg.role === 'user' ? chalk.blue('You') : chalk.green('Assistant');
      const content = msg.content.length > 100 ? msg.content.substring(0, 100) + '...' : msg.content;
      console.log(`${role}: ${content}`);
    });
    console.log();
  }

  start() {
    console.log(chalk.magenta.bold('\n🚀 Z.AI Chat CLI'));
    console.log(chalk.gray('🌐 Connected to:'), this.chat.apiUrl);
    console.log(chalk.gray('🤖 Model:'), this.chat.model);
    console.log(chalk.gray('💡 Type /help for commands or just start chatting!'));
    console.log(chalk.gray('👋 Press Ctrl+C to exit\n'));

    this.rl.prompt();
  }
}

// Main program
async function main() {
  const program = new Command();
  
  const defaultPort = process.env.PORT || 3000;
  const defaultUrl = `http://localhost:${defaultPort}/api/v1`;
  const defaultKey = process.env.ZAI_API_KEY || '';

  program
    .name('zai-chat')
    .description('CLI interface for Z.AI Chat')
    .version('1.0.0');

  program
    .option('-u, --url <url>', 'API URL', defaultUrl)
    .option('-k, --key <key>', 'API key', defaultKey)
    .option('-m, --model <model>', 'Model to use', 'GLM-4.6')
    .option('-t, --temperature <temp>', 'Temperature (0.0-1.0)', '0.7')
    .option('--max-tokens <tokens>', 'Maximum tokens', '2000')
    .action(async (options) => {
      if (!options.key) {
        console.error(chalk.red('❌ Error: API key not provided and ZAI_API_KEY not found in .env'));
        process.exit(1);
      }
      
      const chat = new ZAIChat(
        options.url,
        options.key,
        options.model
      );

      const cli = new CLIInterface(chat);
      cli.start();
    });

  program.parse();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { ZAIChat, CLIInterface };