import { ConversationTurn } from '../../services/memory/memory-manager';
import { ConversationEngine } from '../../services';
import { MemoryManager } from '../../services/memory/memory-manager';

/**
 * Conversation Flow Manager
 * 
 * Handles the conversation turn logic, including fiend consultation,
 * sage analysis, and memory management.
 */

export interface ConversationContext {
  userQuery: string;
  councilMembers: string[];
  turnNumber: number;
  previousTurns: ConversationTurn[];
}

export interface ConversationResult {
  turn: ConversationTurn;
  processingTime: number;
  success: boolean;
  error?: Error;
}

export class ConversationFlowManager {
  private conversationEngine: ConversationEngine;
  private memoryManager: MemoryManager;

  constructor(conversationEngine: ConversationEngine, memoryManager: MemoryManager) {
    this.conversationEngine = conversationEngine;
    this.memoryManager = memoryManager;
  }

  /**
   * Process a single conversation turn
   */
  async processConversationTurn(context: ConversationContext): Promise<ConversationResult> {
    const startTime = Date.now();
    
    try {
      console.log(`\n🎭 Consulting ${context.councilMembers.length} council members...`);
      
      // Consult all fiends
      const fiendResponses = await this.conversationEngine.consultAllFiends(
        context.councilMembers, 
        context.userQuery
      );

      console.log("🧙‍♂️ Sage synthesizing wisdom with memory...\n");
      
      // Get sage analysis
      const sageAnalysis = await this.conversationEngine.consultSage(
        context.userQuery, 
        fiendResponses
      );
      
      // Create conversation turn
      const conversationTurn: ConversationTurn = {
        userMessage: context.userQuery,
        fiendResponses,
        sageAnalysis,
        timestamp: new Date()
      };
      
      // Save to memory
      this.memoryManager.addConversationTurn(conversationTurn);
      
      const processingTime = Date.now() - startTime;
      
      return {
        turn: conversationTurn,
        processingTime,
        success: true
      };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      return {
        turn: {
          userMessage: context.userQuery,
          fiendResponses: [],
          sageAnalysis: 'Error occurred during processing',
          timestamp: new Date()
        },
        processingTime,
        success: false,
        error: error as Error
      };
    }
  }

  /**
   * Process initial session prompt
   */
  async processInitialPrompt(
    prompt: string, 
    councilMembers: string[]
  ): Promise<ConversationResult> {
    const context: ConversationContext = {
      userQuery: prompt,
      councilMembers,
      turnNumber: 1,
      previousTurns: []
    };

    return await this.processConversationTurn(context);
  }

  /**
   * Process follow-up conversation
   */
  async processFollowUp(
    userInput: string,
    councilMembers: string[],
    turnNumber: number
  ): Promise<ConversationResult> {
    const previousTurns = this.memoryManager.getConversationHistory();
    
    const context: ConversationContext = {
      userQuery: userInput,
      councilMembers,
      turnNumber,
      previousTurns
    };

    return await this.processConversationTurn(context);
  }

  /**
   * Get conversation statistics
   */
  getConversationStats(): {
    totalTurns: number;
    averageResponseTime?: number;
    memoryUsage: any;
  } {
    const history = this.memoryManager.getConversationHistory();
    const memoryStats = this.memoryManager.getMemoryStats();
    
    return {
      totalTurns: history.length,
      memoryUsage: memoryStats
    };
  }

  /**
   * Clear conversation memory
   */
  async clearMemory(): Promise<void> {
    await this.memoryManager.clearAllMemories();
  }
}
