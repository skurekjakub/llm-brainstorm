#!/usr/bin/env node

/**
 * Entry point script for LLM Brainstorm project
 * Provides easy access to all main functionality
 */

import { spawn } from 'child_process';
import * as path from 'path';

const args = process.argv.slice(2);
const command = args[0];

const scripts: Record<string, string | (() => void | Promise<void>)> = {
  'agent': 'src/agents/langchain-hybrid-summary.ts',
  'roleplay': 'src/heuristics/heuristic-9-roleplay.ts', 
  'cacophony': 'src/heuristics/heuristic-10-cacophony.ts',
  'config': () => testConfig(),
  'db': () => testDatabase(),
  'characters': () => listCharacters(),
  'help': () => showHelp()
};

function runScript(scriptPath: string) {
  const child = spawn('npx', ['ts-node', scriptPath], {
    stdio: 'inherit',
    shell: true
  });
  
  child.on('error', (error) => {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  });
}

async function testConfig() {
  const { ConfigManager } = await import('./src/managers/config-manager');
  const cm = ConfigManager.getInstance();
  console.log('✅ Config loaded:', cm.getConfigStats());
}

async function testDatabase() {
  const { FiendsDBManager } = await import('./src/managers/fiends-db-manager');
  const db = FiendsDBManager.getInstance();
  console.log('✅ Database loaded:', db.getStats());
}

async function listCharacters() {
  const { FiendsDBManager } = await import('./src/managers/fiends-db-manager');
  const db = FiendsDBManager.getInstance();
  console.log('Characters:', db.getAllCharacters().map(c => c.name));
}

function showHelp() {
  console.log(`
🧠 LLM Brainstorm - Usage

📖 Scripts:
  npm start          - Run main agent (langchain-hybrid-summary)
  npm run agent      - Run main agent 
  npm run roleplay   - Run Heuristic 9 (roleplay)
  npm run cacophony  - Run Heuristic 10 (cacophony)
  npm run dev        - Run main agent in watch mode
  npm run build      - Build TypeScript to JavaScript
  npm run type-check - Check TypeScript without building

🔧 Utilities:
  npm run test-config     - Test configuration loading
  npm run test-db         - Test database loading  
  npm run list-characters - List all available characters
  npm run clean           - Clean build directory
  npm run help            - Show this help

📁 Project Structure:
  src/agents/      - Main AI agents
  src/heuristics/  - Experimental heuristics  
  src/managers/    - Configuration & data managers
  config/          - Configuration files
  data/            - Database and prompt files
  backup/          - Backup files

🚀 Quick Start:
  npm start        - Start the main conversational agent
  npm run roleplay - Try character roleplay heuristic
  npm run cacophony - Try multi-perspective analysis
`);
}

if (!command || command === 'help') {
  showHelp();
} else if (scripts[command]) {
  const script = scripts[command];
  if (typeof script === 'string') {
    runScript(script);
  } else {
    script();
  }
} else {
  console.error(`❌ Unknown command: ${command}`);
  console.log('Run "npm run help" for available commands.');
  process.exit(1);
}
