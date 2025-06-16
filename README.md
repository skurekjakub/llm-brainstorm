# LLM Brainstorm - Advanced Prompt Engineering & Conversational AI

A sophisticated TypeScript project for advanced prompt engineering and conversational AI using LangChain, featuring multiple heuristics for AI behavior exploration and character-based roleplay.

## 🚀 Features

### 🎭 **Heuristics**
- **Heuristic 9 (Roleplay)**: Advanced character-based roleplay with compliance testing
- **Heuristic 10 (Cacophony)**: Multi-perspective analysis using diverse AI personas
  - **💬 Conversational Mode**: Real-time conversation turns with persistent memory
  - **🧠 Memory System**: Each fiend and sage maintains conversation history
  - **🔄 Interactive**: Choose prompt source (file or console) and chat continuously

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

3. **JIRA Integration (Optional)**
   - For JIRA features, add JIRA configuration to `.env`:
     ```
     JIRA_BASE_URL=https://your-domain.atlassian.net
     JIRA_USERNAME=your_username@example.com
     JIRA_API_TOKEN=your_jira_api_token_here
     JIRA_DEFAULT_PROJECT_KEY=PROJ
     ```
   - **Getting JIRA API Token**:
     1. Go to [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
     2. Click "Create API token"
     3. Copy the generated token to `JIRA_API_TOKEN`

4. **Configuration**
   - Edit `config/config.json` to customize models and settings
   - Modify `data/fiends-database.json` to add/edit characters
   - Update `data/prompt.txt` for file-based prompt input

## 🎮 Usage

### Run Heuristics
```bash
# Or use npm scripts
npm run roleplay   # Heuristic 9
npm run cacophony  # Heuristic 10 (conversational)
```

### Run Main Agent
```bash
npx ts-node src/agents/langchain-hybrid-summary.ts
```

### Test JIRA Integration
```bash
# Test JIRA connection and basic functionality
npm run test-jira
```

## 🎫 JIRA Integration

The project includes comprehensive JIRA integration for fetching and analyzing issue data.

### 🚀 **Features**
- **Issue Fetching**: Get individual issues or search with JQL
- **Project Management**: List projects, get metadata
- **Smart Descriptions**: Automatic conversion from JIRA's ADF format to plain text
- **Comment Support**: Fetch and process issue comments
- **Connection Management**: Health checks and configuration validation

### 🔧 **JIRA Services**
```typescript
import { JiraManager } from './src/services/jira';

const jira = JiraManager.getInstance();

// Check connection
const health = await jira.healthCheck();

// Work with issues
const issue = await jira.issues.getIssue('PROJ-123');
const projectIssues = await jira.issues.getProjectIssues('MYPROJ');
const searchResults = await jira.issues.searchIssues('status = "In Progress"');

// Work with projects
const projects = await jira.projects.getAllProjects();
const project = await jira.projects.getProject('MYPROJ');

// Work with comments
const comments = await jira.issues.getIssueComments('PROJ-123');
```

### 📊 **Data Formats**
JIRA issues include multiple description formats for flexibility:
- `fields.description` - Original ADF (Atlassian Document Format)
- `fields.descriptionText` - Plain text (processed by our service)
- `renderedFields.description` - HTML (from JIRA's renderer)

## 💬 Conversational Cacophony Features

### 🧠 **Memory-Persistent Conversations**
The Cacophony heuristic now supports real-time conversations with persistent memory:

- **Individual Memory**: Each fiend maintains their own conversation history
- **Sage Memory**: The sage remembers the entire conversation context
- **Conversation Turns**: Full dialogue tracking with timestamps
- **Memory Management**: Clear memories or view conversation history

### 🎯 **Interactive Features**
```bash
# When running cacophony, you can:
npm run cacophony

# Choose prompt source:
1. Load from prompt.txt file
2. Enter manually in console

# During conversation:
- Type your messages for ongoing dialogue
- Use 'quit' to exit
- Use 'clear' to reset all memories
- Use 'members' to see council composition
```

### 🎭 **Council Dynamics**
- **Persistent Council**: Same characters throughout conversation
- **Contextual Responses**: Each character remembers previous exchanges
- **Evolving Perspectives**: Opinions develop based on conversation flow
- **Synthesis Memory**: Sage builds upon previous analyses

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
