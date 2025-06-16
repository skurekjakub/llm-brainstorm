import { ConversationSummaryBufferMemory } from "langchain/memory";
import { ChatMessageHistory } from "langchain/stores/message/in_memory";

/**
 * Memory Provider Interface
 * 
 * Abstract interface for different types of memory providers.
 * Allows for different memory implementations while maintaining consistent interface.
 */

export interface MemoryProvider {
  /**
   * Get memory context as string
   */
  getContext(): Promise<string>;
  
  /**
   * Add user message to memory
   */
  addUserMessage(message: string): Promise<void>;
  
  /**
   * Add AI response to memory
   */
  addAIMessage(message: string): Promise<void>;
  
  /**
   * Clear memory contents
   */
  clear(): Promise<void>;
  
  /**
   * Get memory statistics
   */
  getStats(): Promise<MemoryStats>;
}

export interface MemoryStats {
  messageCount: number;
  tokenEstimate?: number;
  lastActivity?: Date;
}

/**
 * Base Memory Provider using LangChain's ConversationSummaryBufferMemory
 */
export abstract class BaseMemoryProvider implements MemoryProvider {
  protected memory: ConversationSummaryBufferMemory;
  protected messageHistory: ChatMessageHistory;

  constructor(memory: ConversationSummaryBufferMemory, messageHistory: ChatMessageHistory) {
    this.memory = memory;
    this.messageHistory = messageHistory;
  }

  async getContext(): Promise<string> {
    const context = await this.memory.loadMemoryVariables({});
    return context.history || "";
  }

  async addUserMessage(message: string): Promise<void> {
    await this.memory.saveContext({ input: message }, { output: "" });
  }

  async addAIMessage(message: string): Promise<void> {
    // This will be used in conjunction with addUserMessage
    // The memory system handles both input and output together
  }

  async clear(): Promise<void> {
    this.messageHistory.clear();
  }

  async getStats(): Promise<MemoryStats> {
    const messages = await this.messageHistory.getMessages();
    return {
      messageCount: messages.length,
      lastActivity: messages.length > 0 ? new Date() : undefined
    };
  }
}
