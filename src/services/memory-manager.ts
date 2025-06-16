import { ConversationSummaryBufferMemory } from "langchain/memory";
import { ChatMessageHistory } from "langchain/stores/message/in_memory";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ConfigManager } from '../managers/config-manager';
import { FiendsDBManager } from '../managers/fiends-db-manager';

/**
 * Memory Manager
 * 
 * Responsible for managing conversation memory for all participants in the cacophony.
 * Handles individual fiend memories, sage memory, and conversation history.
 */

export interface FiendMemory {
  name: string;
  memory: ConversationSummaryBufferMemory;
  messageHistory: ChatMessageHistory;
}

export interface ConversationTurn {
  userMessage: string;
  fiendResponses: { 
    name: string; 
    perspective: string;
    searchUsed?: boolean;
    searchQueries?: string[];
  }[];
  sageAnalysis: string;
  timestamp: Date;
}

export class MemoryManager {
  private fiendMemories: Map<string, FiendMemory>;
  private sageMemory: ConversationSummaryBufferMemory;
  private sageMessageHistory: ChatMessageHistory;
  private conversationHistory: ConversationTurn[];
  private llm: ChatGoogleGenerativeAI;
  private configManager: ConfigManager;
  private dbManager: FiendsDBManager;

  constructor(llm: ChatGoogleGenerativeAI) {
    this.llm = llm;
    this.configManager = ConfigManager.getInstance();
    this.dbManager = FiendsDBManager.getInstance();
    this.fiendMemories = new Map();
    this.conversationHistory = [];
    
    // Initialize sage memory
    this.sageMessageHistory = new ChatMessageHistory();
    this.sageMemory = new ConversationSummaryBufferMemory({
      llm: this.llm,
      chatHistory: this.sageMessageHistory,
      maxTokenLimit: this.configManager.getSettings().memoryTokenLimit,
      returnMessages: true
    });
  }

  /**
   * Initialize memory for a list of fiends
   */
  async initializeFiendMemories(fiendNames: string[]): Promise<void> {
    console.log(`🧠 Initializing memory systems for ${fiendNames.length} entities...`);
    
    for (const fiendName of fiendNames) {
      await this.initializeFiendMemory(fiendName);
    }

    // Initialize sage memory with system prompt
    const sage = this.dbManager.getSage();
    await this.sageMessageHistory.addMessage(new SystemMessage(sage.systemPrompt));
    
    console.log(`✅ Memory systems initialized for all entities`);
  }

  /**
   * Initialize memory for a single fiend
   */
  private async initializeFiendMemory(fiendName: string): Promise<void> {
    const messageHistory = new ChatMessageHistory();
    const memory = new ConversationSummaryBufferMemory({
      llm: this.llm,
      chatHistory: messageHistory,
      maxTokenLimit: this.configManager.getSettings().memoryTokenLimit,
      returnMessages: true
    });

    // Add the character's system prompt to their memory
    const character = this.dbManager.getCharacter(fiendName);
    if (character) {
      await messageHistory.addMessage(new SystemMessage(character.systemPrompt));
    }

    this.fiendMemories.set(fiendName, {
      name: fiendName,
      memory,
      messageHistory
    });
  }

  /**
   * Get fiend memory for conversation context
   */
  async getFiendMemoryContext(fiendName: string): Promise<string> {
    const fiendMemory = this.fiendMemories.get(fiendName);
    if (!fiendMemory) {
      throw new Error(`Memory not found for fiend: ${fiendName}`);
    }

    const context = await fiendMemory.memory.loadMemoryVariables({});
    return context.history || "";
  }

  /**
   * Get sage memory context
   */
  async getSageMemoryContext(): Promise<string> {
    const context = await this.sageMemory.loadMemoryVariables({});
    return context.history || "";
  }

  /**
   * Save fiend interaction to memory
   */
  async saveFiendInteraction(fiendName: string, userMessage: string, response: string): Promise<void> {
    const fiendMemory = this.fiendMemories.get(fiendName);
    if (!fiendMemory) {
      throw new Error(`Memory not found for fiend: ${fiendName}`);
    }

    await fiendMemory.messageHistory.addMessage(new HumanMessage(userMessage));
    await fiendMemory.messageHistory.addMessage(new AIMessage(response));
  }

  /**
   * Save sage interaction to memory
   */
  async saveSageInteraction(userQuery: string, fiendResponses: { name: string; perspective: string }[], sageAnalysis: string): Promise<void> {
    const fiendInputs = fiendResponses.map(f => `**${f.name}**: ${f.perspective}`).join('\n\n');
    const fullUserInput = `User Query: ${userQuery}\n\nCouncil Perspectives:\n${fiendInputs}`;
    
    await this.sageMessageHistory.addMessage(new HumanMessage(fullUserInput));
    await this.sageMessageHistory.addMessage(new AIMessage(sageAnalysis));
  }

  /**
   * Add a conversation turn to history
   */
  addConversationTurn(turn: ConversationTurn): void {
    this.conversationHistory.push(turn);
  }

  /**
   * Get complete conversation history
   */
  getConversationHistory(): ConversationTurn[] {
    return [...this.conversationHistory];
  }

  /**
   * Clear all memories and start fresh
   */
  async clearAllMemories(): Promise<void> {
    console.log("🧹 Clearing all memories...");
    
    // Clear fiend memories
    for (const [fiendName, fiendMemory] of this.fiendMemories) {
      fiendMemory.messageHistory.clear();
      
      // Re-add system prompt
      const character = this.dbManager.getCharacter(fiendName);
      if (character) {
        await fiendMemory.messageHistory.addMessage(new SystemMessage(character.systemPrompt));
      }
    }
    
    // Clear sage memory
    this.sageMessageHistory.clear();
    const sage = this.dbManager.getSage();
    await this.sageMessageHistory.addMessage(new SystemMessage(sage.systemPrompt));
    
    // Clear conversation history
    this.conversationHistory = [];
    
    console.log("✅ All memories cleared");
  }

  /**
   * Get memory statistics
   */
  getMemoryStats(): {
    activeFiends: number;
    conversationTurns: number;
    memoryTokenLimit: number;
  } {
    return {
      activeFiends: this.fiendMemories.size,
      conversationTurns: this.conversationHistory.length,
      memoryTokenLimit: this.configManager.getSettings().memoryTokenLimit
    };
  }
}
