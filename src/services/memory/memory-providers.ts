import { ConversationSummaryBufferMemory } from "langchain/memory";
import { ChatMessageHistory } from "langchain/stores/message/in_memory";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { BaseMemoryProvider, MemoryStats } from './memory-provider.interface';

/**
 * Fiend Memory Provider
 * 
 * Manages memory for individual fiend characters.
 * Handles character-specific system prompts and conversation context.
 */
export class FiendMemoryProvider extends BaseMemoryProvider {
  private fiendName: string;
  private systemPrompt?: string;

  constructor(
    fiendName: string, 
    llm: ChatGoogleGenerativeAI, 
    maxTokenLimit: number,
    systemPrompt?: string
  ) {
    const messageHistory = new ChatMessageHistory();
    const memory = new ConversationSummaryBufferMemory({
      llm,
      chatHistory: messageHistory,
      maxTokenLimit,
      returnMessages: true
    });

    super(memory, messageHistory);
    this.fiendName = fiendName;
    this.systemPrompt = systemPrompt;
  }

  /**
   * Initialize with system prompt
   */
  async initialize(): Promise<void> {
    if (this.systemPrompt) {
      await this.messageHistory.addMessage(new SystemMessage(this.systemPrompt));
    }
  }

  /**
   * Add interaction (user message + AI response)
   */
  async addInteraction(userMessage: string, aiResponse: string): Promise<void> {
    await this.messageHistory.addMessage(new HumanMessage(userMessage));
    await this.messageHistory.addMessage(new AIMessage(aiResponse));
  }

  /**
   * Re-initialize with new system prompt
   */
  async reinitialize(newSystemPrompt: string): Promise<void> {
    await this.clear();
    this.systemPrompt = newSystemPrompt;
    await this.initialize();
  }

  /**
   * Get fiend name
   */
  getFiendName(): string {
    return this.fiendName;
  }

  async getStats(): Promise<MemoryStats & { fiendName: string }> {
    const baseStats = await super.getStats();
    return {
      ...baseStats,
      fiendName: this.fiendName
    };
  }
}

/**
 * Sage Memory Provider
 * 
 * Manages memory for the sage (analyzes fiend council responses).
 * Handles complex multi-fiend interaction context.
 */
export class SageMemoryProvider extends BaseMemoryProvider {
  constructor(llm: ChatGoogleGenerativeAI, maxTokenLimit: number, systemPrompt?: string) {
    const messageHistory = new ChatMessageHistory();
    const memory = new ConversationSummaryBufferMemory({
      llm,
      chatHistory: messageHistory,
      maxTokenLimit,
      returnMessages: true
    });

    super(memory, messageHistory);
    
    if (systemPrompt) {
      this.initializeWithSystemPrompt(systemPrompt);
    }
  }

  /**
   * Initialize with sage system prompt
   */
  async initializeWithSystemPrompt(systemPrompt: string): Promise<void> {
    await this.messageHistory.addMessage(new SystemMessage(systemPrompt));
  }

  /**
   * Add sage analysis interaction
   */
  async addSageAnalysis(
    userQuery: string, 
    fiendResponses: { name: string; perspective: string }[], 
    sageAnalysis: string
  ): Promise<void> {
    const fiendInputs = fiendResponses
      .map(f => `**${f.name}**: ${f.perspective}`)
      .join('\n\n');
    
    const fullUserInput = `User Query: ${userQuery}\n\nCouncil Perspectives:\n${fiendInputs}`;
    
    await this.messageHistory.addMessage(new HumanMessage(fullUserInput));
    await this.messageHistory.addMessage(new AIMessage(sageAnalysis));
  }

  /**
   * Re-initialize with new system prompt
   */
  async reinitialize(newSystemPrompt: string): Promise<void> {
    await this.clear();
    await this.initializeWithSystemPrompt(newSystemPrompt);
  }
}
