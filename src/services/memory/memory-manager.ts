import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ConfigManager } from '../../managers/config-manager';
import { CharacterDataService } from '../character-data.service';
import { ConversationHistoryService, ConversationTurn } from '../conversation-history.service';
import { FiendMemoryProvider, SageMemoryProvider } from './memory-providers';
import { MemoryContextBuilder } from './memory-context-builder';

/**
 * Memory Manager (Refactored)
 * 
 * Orchestrates memory operations for fiends and sage.
 * Uses dependency injection and focused on memory coordination rather than data access.
 */

export { ConversationTurn } from '../conversation-history.service';

export class MemoryManager {
  private fiendMemories: Map<string, FiendMemoryProvider>;
  private sageMemory: SageMemoryProvider;
  private llm: ChatGoogleGenerativeAI;
  private configManager: ConfigManager;
  private characterDataService: CharacterDataService;
  private conversationHistoryService: ConversationHistoryService;
  private contextBuilder: MemoryContextBuilder;

  constructor(
    llm: ChatGoogleGenerativeAI,
    configManager: ConfigManager,
    characterDataService: CharacterDataService,
    conversationHistoryService: ConversationHistoryService
  ) {
    this.llm = llm;
    this.configManager = configManager;
    this.characterDataService = characterDataService;
    this.conversationHistoryService = conversationHistoryService;
    this.contextBuilder = new MemoryContextBuilder();
    this.fiendMemories = new Map();
    
    // Initialize sage memory
    const sage = this.characterDataService.getSage();
    this.sageMemory = new SageMemoryProvider(
      this.llm,
      this.configManager.getSettings().memoryTokenLimit,
      sage.systemPrompt
    );
  }

  /**
   * Initialize memory for a list of fiends
   */
  async initializeFiendMemories(fiendNames: string[]): Promise<void> {
    console.log(`🧠 Initializing memory systems for ${fiendNames.length} entities...`);
    
    for (const fiendName of fiendNames) {
      await this.initializeFiendMemory(fiendName);
    }
    
    console.log(`✅ Memory systems initialized for all entities`);
  }

  /**
   * Initialize memory for a single fiend
   */
  private async initializeFiendMemory(fiendName: string): Promise<void> {
    const systemPrompt = this.characterDataService.getCharacterSystemPrompt(fiendName);
    
    const fiendMemory = new FiendMemoryProvider(
      fiendName,
      this.llm,
      this.configManager.getSettings().memoryTokenLimit,
      systemPrompt || undefined
    );
    
    await fiendMemory.initialize();
    this.fiendMemories.set(fiendName, fiendMemory);
  }

  /**
   * Get fiend memory context for conversation
   */
  async getFiendMemoryContext(fiendName: string): Promise<string> {
    const fiendMemory = this.fiendMemories.get(fiendName);
    if (!fiendMemory) {
      throw new Error(`Memory not found for fiend: ${fiendName}`);
    }

    return await fiendMemory.getContext();
  }

  /**
   * Get sage memory context
   */
  async getSageMemoryContext(): Promise<string> {
    return await this.sageMemory.getContext();
  }

  /**
   * Save fiend interaction to memory
   */
  async saveFiendInteraction(fiendName: string, userMessage: string, response: string): Promise<void> {
    const fiendMemory = this.fiendMemories.get(fiendName);
    if (!fiendMemory) {
      throw new Error(`Memory not found for fiend: ${fiendName}`);
    }

    await fiendMemory.addInteraction(userMessage, response);
  }

  /**
   * Save sage interaction to memory
   */
  async saveSageInteraction(userQuery: string, fiendResponses: { name: string; perspective: string }[], sageAnalysis: string): Promise<void> {
    await this.sageMemory.addSageAnalysis(userQuery, fiendResponses, sageAnalysis);
  }

  /**
   * Add a conversation turn to history
   */
  addConversationTurn(turn: ConversationTurn): void {
    this.conversationHistoryService.addConversationTurn(turn);
  }

  /**
   * Get complete conversation history
   */
  getConversationHistory(): ConversationTurn[] {
    return this.conversationHistoryService.getConversationHistory();
  }

  /**
   * Clear all memories and start fresh
   */
  async clearAllMemories(): Promise<void> {
    console.log("🧹 Clearing all memories...");
    
    // Clear fiend memories
    for (const [fiendName, fiendMemory] of this.fiendMemories) {
      await fiendMemory.clear();
      
      // Re-initialize with system prompt
      const systemPrompt = this.characterDataService.getCharacterSystemPrompt(fiendName);
      if (systemPrompt) {
        await fiendMemory.reinitialize(systemPrompt);
      }
    }
    
    // Clear sage memory
    await this.sageMemory.clear();
    const sageSystemPrompt = this.characterDataService.getSageSystemPrompt();
    await this.sageMemory.reinitialize(sageSystemPrompt);
    
    // Clear conversation history
    this.conversationHistoryService.clearHistory();
    
    console.log("✅ All memories cleared");
  }

  /**
   * Get memory statistics
   */
  async getMemoryStats(): Promise<{
    activeFiends: number;
    conversationTurns: number;
    memoryTokenLimit: number;
    fiendMemoryStats: any[];
    sageMemoryStats: any;
  }> {
    const fiendMemoryStats = await Promise.all(
      Array.from(this.fiendMemories.entries()).map(async ([name, memory]) => {
        const stats = await memory.getStats();
        return { name, ...stats };
      })
    );

    const sageMemoryStats = await this.sageMemory.getStats();
    const conversationStats = this.conversationHistoryService.getStats();

    return {
      activeFiends: this.fiendMemories.size,
      conversationTurns: conversationStats.totalTurns,
      memoryTokenLimit: this.configManager.getSettings().memoryTokenLimit,
      fiendMemoryStats,
      sageMemoryStats
    };
  }

  /**
   * Build context for a specific fiend
   */
  async buildFiendContext(fiendName: string): Promise<string> {
    const fiendMemory = this.fiendMemories.get(fiendName);
    if (!fiendMemory) {
      throw new Error(`Memory not found for fiend: ${fiendName}`);
    }

    return await this.contextBuilder.buildSingleContext(fiendMemory);
  }

  /**
   * Build context for sage analysis including all fiend perspectives
   */
  async buildSageAnalysisContext(): Promise<string> {
    const fiendProviders = Array.from(this.fiendMemories.entries()).map(([name, provider]) => ({
      name,
      provider
    }));

    return await this.contextBuilder.buildSageAnalysisContext(
      this.sageMemory,
      fiendProviders
    );
  }

  /**
   * Get context builder for custom context building
   */
  getContextBuilder(): MemoryContextBuilder {
    return this.contextBuilder;
  }
}
