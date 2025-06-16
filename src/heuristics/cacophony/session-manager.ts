import { ConversationTurn } from '../../services/memory/memory-manager';

/**
 * Session Manager
 * 
 * Handles session lifecycle, state management, and conversation flow control.
 */

export interface SessionConfig {
  fiendCount: number;
  defaultTimeout: number;
  enableSearch: boolean;
}

export interface SessionStats {
  councilSize: number;
  conversationTurns: number;
  sessionDuration: number;
  memoryStats: any;
}

export class SessionManager {
  private sessionStartTime: number;
  private councilMembers: string[];
  private isSessionActive: boolean;
  private config: SessionConfig;

  constructor(config: Partial<SessionConfig> = {}) {
    this.sessionStartTime = 0;
    this.councilMembers = [];
    this.isSessionActive = false;
    this.config = {
      fiendCount: 5,
      defaultTimeout: 30000,
      enableSearch: true,
      ...config
    };
  }

  /**
   * Start a new session
   */
  startSession(councilMembers: string[]): void {
    this.sessionStartTime = Date.now();
    this.councilMembers = [...councilMembers];
    this.isSessionActive = true;
    console.log(`✅ Session started with ${councilMembers.length} council members`);
  }

  /**
   * End the current session
   */
  endSession(): SessionStats {
    const sessionDuration = Date.now() - this.sessionStartTime;
    this.isSessionActive = false;
    
    return {
      councilSize: this.councilMembers.length,
      conversationTurns: 0, // Will be set by caller
      sessionDuration,
      memoryStats: null // Will be set by caller
    };
  }

  /**
   * Check if session is active
   */
  isActive(): boolean {
    return this.isSessionActive;
  }

  /**
   * Get session duration in milliseconds
   */
  getSessionDuration(): number {
    return this.isSessionActive ? Date.now() - this.sessionStartTime : 0;
  }

  /**
   * Get council members
   */
  getCouncilMembers(): string[] {
    return [...this.councilMembers];
  }

  /**
   * Get session configuration
   */
  getConfig(): SessionConfig {
    return { ...this.config };
  }

  /**
   * Update session configuration
   */
  updateConfig(updates: Partial<SessionConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Validate session state
   */
  validateSession(): boolean {
    return this.isSessionActive && this.councilMembers.length > 0;
  }
}
