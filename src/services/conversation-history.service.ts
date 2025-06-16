/**
 * Conversation History Service
 * 
 * Single responsibility: Manage conversation turn history.
 * Extracted from MemoryManager to separate conversation tracking from memory management.
 */

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

export class ConversationHistoryService {
  private conversationHistory: ConversationTurn[];

  constructor() {
    this.conversationHistory = [];
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
   * Get conversation history since a specific date
   */
  getConversationHistorySince(date: Date): ConversationTurn[] {
    return this.conversationHistory.filter(turn => turn.timestamp >= date);
  }

  /**
   * Get the last N conversation turns
   */
  getLastConversationTurns(count: number): ConversationTurn[] {
    return this.conversationHistory.slice(-count);
  }

  /**
   * Clear all conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Get conversation statistics
   */
  getStats(): {
    totalTurns: number;
    participatingFiends: Set<string>;
    timespan: { start: Date | null; end: Date | null };
  } {
    if (this.conversationHistory.length === 0) {
      return {
        totalTurns: 0,
        participatingFiends: new Set(),
        timespan: { start: null, end: null }
      };
    }

    const participatingFiends = new Set<string>();
    this.conversationHistory.forEach(turn => {
      turn.fiendResponses.forEach(response => {
        participatingFiends.add(response.name);
      });
    });

    const timestamps = this.conversationHistory.map(turn => turn.timestamp);
    
    return {
      totalTurns: this.conversationHistory.length,
      participatingFiends,
      timespan: {
        start: new Date(Math.min(...timestamps.map(t => t.getTime()))),
        end: new Date(Math.max(...timestamps.map(t => t.getTime())))
      }
    };
  }
}
