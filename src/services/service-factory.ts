import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ConfigManager } from '../managers/config-manager';
import { FiendsDBManager } from '../managers/fiends-db-manager';
import { MemoryManager } from './memory/memory-manager';
import { ReactAgentManager } from './react-agent-manager';
import { CharacterDataService } from './character-data.service';
import { ConversationHistoryService } from './conversation-history.service';
import { AgentCacheService } from './agent-cache.service';
import { MemoryContextBuilder } from './memory/memory-context-builder';
import { DecoupledToolRegistry } from './decoupled-tool-registry';
import { RegistryToolProvider } from './tools/tool-provider.interface';

/**
 * Service Factory (Updated)
 * 
 * Single responsibility: Create and wire up all services with proper dependency injection.
 * Now uses DecoupledToolRegistry instead of the memory-dependent ToolRegistry.
 */

export class ServiceFactory {
  private configManager: ConfigManager;
  private dbManager: FiendsDBManager;
  private llm: ChatGoogleGenerativeAI;

  // Service instances
  private characterDataService?: CharacterDataService;
  private conversationHistoryService?: ConversationHistoryService;
  private agentCacheService?: AgentCacheService;
  private memoryContextBuilder?: MemoryContextBuilder;
  private decoupledToolRegistry?: DecoupledToolRegistry;
  private memoryManager?: MemoryManager;
  private reactAgentManager?: ReactAgentManager;

  constructor(
    configManager: ConfigManager,
    dbManager: FiendsDBManager,
    llm: ChatGoogleGenerativeAI
  ) {
    this.configManager = configManager;
    this.dbManager = dbManager;
    this.llm = llm;
  }

  /**
   * Create or get character data service
   */
  getCharacterDataService(): CharacterDataService {
    if (!this.characterDataService) {
      this.characterDataService = new CharacterDataService(this.dbManager);
    }
    return this.characterDataService;
  }

  /**
   * Create or get conversation history service
   */
  getConversationHistoryService(): ConversationHistoryService {
    if (!this.conversationHistoryService) {
      this.conversationHistoryService = new ConversationHistoryService();
    }
    return this.conversationHistoryService;
  }

  /**
   * Create or get agent cache service
   */
  getAgentCacheService(): AgentCacheService {
    if (!this.agentCacheService) {
      this.agentCacheService = new AgentCacheService();
    }
    return this.agentCacheService;
  }

  /**
   * Create or get memory context builder
   */
  getMemoryContextBuilder(): MemoryContextBuilder {
    if (!this.memoryContextBuilder) {
      this.memoryContextBuilder = new MemoryContextBuilder();
    }
    return this.memoryContextBuilder;
  }

  /**
   * Create or get decoupled tool registry
   */
  async getDecoupledToolRegistry(): Promise<DecoupledToolRegistry> {
    if (!this.decoupledToolRegistry) {
      const memoryContextBuilder = this.getMemoryContextBuilder();
      this.decoupledToolRegistry = await DecoupledToolRegistry.create(memoryContextBuilder);
    }
    return this.decoupledToolRegistry;
  }

  /**
   * Create or get memory manager
   */
  async getMemoryManager(): Promise<MemoryManager> {
    if (!this.memoryManager) {
      this.memoryManager = new MemoryManager(
        this.llm,
        this.configManager,
        this.getCharacterDataService(),
        this.getConversationHistoryService()
      );
    }
    return this.memoryManager;
  }

  /**
   * Create or get react agent manager
   */
  async getReactAgentManager(): Promise<ReactAgentManager> {
    if (!this.reactAgentManager) {
      const toolRegistry = await this.getDecoupledToolRegistry();
      const toolProvider = new RegistryToolProvider(toolRegistry);
      
      this.reactAgentManager = new ReactAgentManager(
        this.llm,
        this.getCharacterDataService(),
        this.getAgentCacheService(),
        toolProvider
      );
    }
    return this.reactAgentManager;
  }

  /**
   * Create services with proper dependency injection (legacy compatibility)
   * This provides the old interface while using the new architecture internally
   */
  static async createLegacyServices(llm: ChatGoogleGenerativeAI): Promise<{
    memoryManager: MemoryManager;
    reactAgentManager: ReactAgentManager;
  }> {
    const configManager = ConfigManager.getInstance();
    const dbManager = FiendsDBManager.getInstance();
    
    const factory = new ServiceFactory(configManager, dbManager, llm);
    
    const memoryManager = await factory.getMemoryManager();
    const reactAgentManager = await factory.getReactAgentManager();
    
    return {
      memoryManager,
      reactAgentManager
    };
  }

  /**
   * Get all services for advanced usage
   */
  async getAllServices(): Promise<{
    characterDataService: CharacterDataService;
    conversationHistoryService: ConversationHistoryService;
    agentCacheService: AgentCacheService;
    memoryManager: MemoryManager;
    reactAgentManager: ReactAgentManager;
  }> {
    return {
      characterDataService: this.getCharacterDataService(),
      conversationHistoryService: this.getConversationHistoryService(),
      agentCacheService: this.getAgentCacheService(),
      memoryManager: await this.getMemoryManager(),
      reactAgentManager: await this.getReactAgentManager()
    };
  }

  /**
   * Reset all services (useful for testing)
   */
  reset(): void {
    this.characterDataService = undefined;
    this.conversationHistoryService = undefined;
    this.agentCacheService = undefined;
    this.memoryContextBuilder = undefined;
    this.decoupledToolRegistry = undefined;
    this.memoryManager = undefined;
    this.reactAgentManager = undefined;
  }
}
