# LLM Brainstorm - Advanced Prompt Engineering & Conversational AI

A sophisticated TypeScript project for advanced prompt engineering and conversational AI using LangChain, featuring multiple heuristics for AI behavior exploration and character-based roleplay.

## 🏗️ Project Structure

```
llm-brainstorm/
├── 📁 src/                         # Source code
│   ├── 📁 agents/                  # AI agents and main conversational logic
│   │   └── langchain-hybrid-summary.ts    # Main LangChain agent with tools
│   ├── 📁 heuristics/              # Experimental AI heuristics
│   │   ├── heuristic-9-roleplay.ts        # Compliance violation roleplay
│   │   └── heuristic-10-cacophony.ts      # Cacophony of fiends
│   └── 📁 managers/                # Data and configuration management
│       ├── config-manager.ts              # Configuration management
│       └── fiends-db-manager.ts           # Character database management
├── 📁 config/                      # Configuration files
│   └── config.json                 # Application and model configuration
├── 📁 data/                        # Data files
│   ├── fiends-database.json        # Character and prompt database
│   └── prompt.txt                  # User prompt input file
├── 📁 backup/                      # Backup files
├── 📁 node_modules/                # Dependencies
├── .env                           # Environment variables
├── .gitignore                     # Git ignore rules
├── package.json                   # Node.js dependencies
├── tsconfig.json                  # TypeScript configuration
└── README.md                      # This file
```

## 🚀 Features

### 🎭 **Heuristics**
- **Heuristic 9 (Roleplay)**: Advanced character-based roleplay with compliance testing
- **Heuristic 10 (Cacophony)**: Multi-perspective analysis using diverse AI personas

### 🤖 **Agents**
- **Hybrid Summary Agent**: LangChain-powered agent with tools and memory
- **Configuration-driven**: All models and settings externalized
- **Tool integration**: Search, analysis, and custom tool support

### 🏛️ **Architecture**
- **Single Responsibility Principle**: Each class has one clear purpose
- **Singleton Patterns**: Centralized configuration and database management
- **Type Safety**: Full TypeScript implementation with interfaces
- **Hot Reload**: Configuration changes without application restart

## 🛠️ Setup & Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Setup**
   - Copy `.env.example` to `.env`
   - Add your API keys:
     ```
     GOOGLE_API_KEY=your_google_api_key_here
     TAVILY_API_KEY=your_tavily_api_key_here
     ```

3. **Configuration**
   - Edit `config/config.json` to customize models and settings
   - Modify `data/fiends-database.json` to add/edit characters
   - Update `data/prompt.txt` for file-based prompt input

## 🎮 Usage

### Run Heuristics
```bash
# Roleplay heuristic
npx ts-node src/heuristics/heuristic-9-roleplay.ts

# Cacophony heuristic  
npx ts-node src/heuristics/heuristic-10-cacophony.ts
```

### Run Main Agent
```bash
npx ts-node src/agents/langchain-hybrid-summary.ts
```

## ⚙️ Configuration Management

The `ConfigManager` class provides centralized configuration:

```typescript
import { ConfigManager } from './src/managers/config-manager';

const config = ConfigManager.getInstance();
const mainModel = config.getModelConfig('main');
const settings = config.getSettings();
```

### Configuration Structure

```json
{
  "models": {
    "main": { "provider": "google", "model": "gemini-1.5-pro-latest", "temperature": 0.0 },
    "roleplay": { "provider": "google", "model": "gemini-1.5-pro-latest", "temperature": 0.8 },
    "cacophony": { "provider": "google", "model": "gemini-2.5-pro-preview-06-05", "temperature": 0.7 },
    "summarizer": { "provider": "google", "model": "gemini-1.5-flash-latest", "temperature": 0.0 }
  },
  "settings": {
    "defaultMaxTokens": 4096,
    "defaultTimeout": 30000,
    "retryAttempts": 3,
    "fiendCount": 5,
    "memoryTokenLimit": 1000
  },
  "providers": {
    "google": {
      "apiKeyEnvVar": "GOOGLE_API_KEY",
      "baseUrl": "https://generativelanguage.googleapis.com"
    }
  }
}
```

## 🗄️ Database Management

The `FiendsDBManager` handles character and prompt data:

```typescript
import { FiendsDBManager } from './src/managers/fiends-db-manager';

const db = FiendsDBManager.getInstance();
const characters = db.getAllCharacters();
const prompt = db.getPromptFromFile();
```

## 🧪 Development Principles

- **Modularity**: Clear separation between agents, heuristics, and managers
- **Type Safety**: Comprehensive TypeScript interfaces and validation
- **Configuration-driven**: No hardcoded values, all externalized
- **Error Handling**: Graceful error handling with meaningful messages
- **Hot Reload**: Configuration changes reflected without restart
- **Clean Architecture**: Each component has a single, well-defined responsibility

## 📋 Available Scripts

```bash
# Type checking
npx tsc --noEmit

# Run specific components
npx ts-node src/agents/langchain-hybrid-summary.ts
npx ts-node src/heuristics/heuristic-9-roleplay.ts
npx ts-node src/heuristics/heuristic-10-cacophony.ts
```

## 🔒 Security

- Environment variables for API keys
- `.gitignore` excludes sensitive files
- Configuration validation prevents malformed configs
- Type safety prevents runtime errors

## 📈 Extending the Project

1. **Add New Heuristics**: Create new files in `src/heuristics/`
2. **Add New Agents**: Create new files in `src/agents/`
3. **Add New Characters**: Update `data/fiends-database.json`
4. **Add New Models**: Update `config/config.json`
5. **Add New Managers**: Create new files in `src/managers/`

This project demonstrates advanced TypeScript architecture with clean separation of concerns, making it easy to extend and maintain.
