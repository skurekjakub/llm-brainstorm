/**
 * Cacophony Module
 * 
 * Refactored cacophony system with clean separation of concerns.
 */

// Main orchestrator
export { CacophonyOrchestrator } from './orchestrator';

// Helper managers
export { SessionManager, SessionConfig, SessionStats } from './session-manager';
export { ConversationFlowManager, ConversationContext, ConversationResult } from './conversation-flow-manager';
export { CommandProcessor, CommandType, Command, CommandResult } from './command-processor';
export { DisplayManager } from './display-manager';
export { InputManager } from './input-manager';

// Re-export types from services for convenience
export { ConversationTurn } from '../../services/memory/memory-manager';
