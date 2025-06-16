# Migration Guide: Using the Refactored Services

## Overview

The `MemoryManager` and `ReactAgentManager` have been refactored to follow the Single Responsibility Principle and use dependency injection instead of singletons. This guide shows how to update your code to use the new architecture.

## Before (Old Way)

```typescript
// Old approach - singleton pattern with circular dependencies
const llm = new ChatGoogleGenerativeAI({...});
const memoryManager = new MemoryManager(llm);
const reactAgentManager = await ReactAgentManager.create(llm, memoryManager);

// Initialize memories
await memoryManager.initializeFiendMemories(['Alice', 'Bob']);

// Create and use agent
const agent = await reactAgentManager.createAgent('Alice');
const result = await reactAgentManager.executeAgent('Alice', 'Hello world');
```

## After (New Way)

### Option 1: Using ServiceFactory (Recommended)

```typescript
import { ServiceFactory } from './src/services/service-factory';

// Create services using factory (handles all dependencies)
const llm = new ChatGoogleGenerativeAI({...});
const { memoryManager, reactAgentManager } = await ServiceFactory.createLegacyServices(llm);

// Use exactly as before - same interface!
await memoryManager.initializeFiendMemories(['Alice', 'Bob']);
const agent = await reactAgentManager.createAgent('Alice');
const result = await reactAgentManager.executeAgent('Alice', 'Hello world');
```

### Option 2: Manual Dependency Injection (Advanced)

```typescript
import { 
  CharacterDataService,
  ConversationHistoryService,
  AgentCacheService,
  MemoryManager,
  ReactAgentManager,
  DecoupledToolRegistry,
  RegistryToolProvider
} from './src/services/...';

// Manual wiring (more control)
const configManager = ConfigManager.getInstance();
const dbManager = FiendsDBManager.getInstance();
const llm = new ChatGoogleGenerativeAI({...});

const characterDataService = new CharacterDataService(dbManager);
const conversationHistoryService = new ConversationHistoryService();
const agentCacheService = new AgentCacheService();

const memoryManager = new MemoryManager(
  llm,
  configManager,
  characterDataService,
  conversationHistoryService
);

const toolRegistry = await DecoupledToolRegistry.create();
const toolProvider = new RegistryToolProvider(toolRegistry);

const reactAgentManager = new ReactAgentManager(
  llm,
  characterDataService,
  agentCacheService,
  toolProvider
);
```

### Option 3: Using ServiceFactory for Individual Services

```typescript
import { ServiceFactory } from './src/services/service-factory';

const configManager = ConfigManager.getInstance();
const dbManager = FiendsDBManager.getInstance();
const llm = new ChatGoogleGenerativeAI({...});

const factory = new ServiceFactory(configManager, dbManager, llm);

// Get individual services as needed
const characterDataService = factory.getCharacterDataService();
const memoryManager = await factory.getMemoryManager();
const reactAgentManager = await factory.getReactAgentManager();

// Access new capabilities
const contextBuilder = memoryManager.getContextBuilder();
const customContext = await contextBuilder.buildFiendContext('Alice');
```

## Benefits of the New Architecture

### 1. Single Responsibility Principle
- `CharacterDataService`: Only handles character data access
- `ConversationHistoryService`: Only handles conversation tracking
- `MemoryManager`: Only orchestrates memory operations
- `ReactAgentManager`: Only handles agent creation

### 2. Dependency Injection
- No more singleton dependencies
- Easier testing with mock services
- Clear dependency relationships

### 3. Decoupled Tools
- `DecoupledToolRegistry`: No dependency on memory services
- `ToolProvider` interface: Multiple tool strategies
- Cleaner separation of concerns

### 4. Enhanced Memory Management
- `MemoryProvider` interface: Different memory implementations
- `MemoryContextBuilder`: Flexible context construction
- Individual memory providers for fiends and sage

### 5. Agent Caching
- `AgentCacheService`: Dedicated agent lifecycle management
- Cache statistics and hit ratios
- Fine-grained cache control

## Backward Compatibility

The `ServiceFactory.createLegacyServices()` method provides a drop-in replacement for the old way of creating services. Your existing code should work without changes by just changing how you create the initial services.

## Testing Benefits

```typescript
// Easy to test individual components
const mockCharacterService = new MockCharacterDataService();
const conversationService = new ConversationHistoryService();

const memoryManager = new MemoryManager(
  mockLLM,
  mockConfig,
  mockCharacterService,  // Inject mock
  conversationService
);

// Test memory manager in isolation
```

## Performance Benefits

- Lazy initialization through factory
- Service reuse across the application
- Better memory management with dedicated caching
- Reduced circular dependency overhead

## Migration Checklist

- [ ] Replace direct instantiation with `ServiceFactory.createLegacyServices()`
- [ ] Update imports to use new service modules
- [ ] Consider using individual services for specialized needs
- [ ] Update tests to use dependency injection
- [ ] Remove any direct singleton calls to managers
