import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ConfigManager } from '../../managers/config-manager';
import { CouncilManager, MemoryManager, ConversationEngine } from '../../services';
import { ServiceFactory } from '../../services/service-factory';
import { ConversationTurn } from '../../services/memory/memory-manager';

// Import helper classes
import { SessionManager, SessionConfig, SessionStats } from './session-manager';
import { ConversationFlowManager } from './conversation-flow-manager';
import { CommandProcessor, Command } from './command-processor';
import { DisplayManager } from './display-manager';
import { InputManager } from './input-manager';

/**
 * Cacophony Orchestrator (Refactored)
 * 
 * Main orchestrator that coordinates all components using helper classes.
 * Now follows single responsibility principle with clear separation of concerns.
 */

export class CacophonyOrchestrator {
  // Core services
  private configManager: ConfigManager;
  private llm!: ChatGoogleGenerativeAI;
  private councilManager!: CouncilManager;
  private memoryManager!: MemoryManager;
  private conversationEngine!: ConversationEngine;

  // Helper managers
  private sessionManager: SessionManager;
  private conversationFlowManager!: ConversationFlowManager;
  private commandProcessor: CommandProcessor;
  private displayManager: DisplayManager;
  private inputManager: InputManager;

  private constructor(sessionConfig?: Partial<SessionConfig>) {
    this.configManager = ConfigManager.getInstance();
    
    // Initialize helper managers
    this.sessionManager = new SessionManager(sessionConfig);
    this.commandProcessor = new CommandProcessor();
    this.displayManager = new DisplayManager();
    this.inputManager = new InputManager();
  }

  /**
   * Create and initialize a new CacophonyOrchestrator instance
   */
  static async create(sessionConfig?: Partial<SessionConfig>): Promise<CacophonyOrchestrator> {
    const orchestrator = new CacophonyOrchestrator(sessionConfig);
    await orchestrator.initialize();
    return orchestrator;
  }

  /**
   * Initialize the engine components
   */
  private async initialize(): Promise<void> {
    const modelConfig = this.configManager.getModelConfig('cacophony');
    
    // Initialize LLM
    this.llm = new ChatGoogleGenerativeAI({ 
      model: modelConfig.model,
      temperature: modelConfig.temperature
    });
    
    // Initialize core services using service factory
    this.councilManager = new CouncilManager();
    
    const { memoryManager } = await ServiceFactory.createLegacyServices(this.llm);
    this.memoryManager = memoryManager;
    
    this.conversationEngine = await ConversationEngine.create(this.llm, this.memoryManager);
    
    // Initialize conversation flow manager
    this.conversationFlowManager = new ConversationFlowManager(
      this.conversationEngine,
      this.memoryManager
    );
  }

  /**
   * Initialize a new session
   */
  async initializeSession(): Promise<void> {
    const config = this.sessionManager.getConfig();
    
    // Create council
    const council = this.councilManager.createCouncil(config.fiendCount);
    const councilMembers = council.fiends;
    
    // Start session
    this.sessionManager.startSession(councilMembers);
    
    // Display council information
    this.displayManager.displayCouncilInfo(councilMembers);
    
    // Initialize memory systems
    await this.memoryManager.initializeFiendMemories(councilMembers);
    
    console.log(`✅ Cacophony session initialized successfully\n`);
  }

  /**
   * Run interactive conversation session
   */
  async runConversationalSession(): Promise<void> {
    try {
      // Display session header
      this.displayManager.displaySessionHeader();
      
      // Get initial prompt
      const initialPrompt = await this.inputManager.getInitialPrompt();
      console.log(`📝 Initial prompt length: ${initialPrompt.length} characters\n`);
      
      // Initialize session
      await this.initializeSession();
      
      // Display conversation instructions
      this.displayManager.displayConversationInstructions();
      
      // Process initial prompt
      this.displayManager.displayTurnHeader(1);
      let result = await this.conversationFlowManager.processInitialPrompt(
        initialPrompt,
        this.sessionManager.getCouncilMembers()
      );
      
      if (result.success) {
        this.displayManager.displayConversationTurn(result.turn, 1);
      } else {
        this.displayManager.displayError(result.error);
        return;
      }
      
      // Start conversation loop
      let turnNumber = 2;
      
      while (this.sessionManager.isActive()) {
        const userInput = await this.inputManager.getUserInputForTurn(turnNumber);
        const command = this.commandProcessor.parseInput(userInput);
        
        const commandResult = await this.commandProcessor.executeCommand(command, {
          councilMembers: this.sessionManager.getCouncilMembers(),
          stats: this.getSessionStats()
        });

        // Handle command results
        if (!commandResult.shouldContinue) {
          break;
        }

        // Display command result if it has a message
        if (commandResult.message) {
          this.displayManager.displayCommandResult(commandResult);
        }

        // Handle special commands
        if (command.type === 'clear') {
          await this.conversationFlowManager.clearMemory();
          continue;
        }

        if (command.type !== 'continue') {
          continue;
        }

        // Process conversation turn
        this.displayManager.displayTurnHeader(turnNumber);
        result = await this.conversationFlowManager.processFollowUp(
          userInput,
          this.sessionManager.getCouncilMembers(),
          turnNumber
        );

        if (result.success) {
          this.displayManager.displayConversationTurn(result.turn, turnNumber);
          turnNumber++;
        } else {
          this.displayManager.displayError(result.error);
        }
      }
      
      // Display session summary
      const sessionStats = this.sessionManager.endSession();
      sessionStats.conversationTurns = this.memoryManager.getConversationHistory().length;
      sessionStats.memoryStats = this.memoryManager.getMemoryStats();
      
      this.displayManager.displaySessionSummary(sessionStats);
      
    } catch (error) {
      const sessionStats = this.sessionManager.endSession();
      this.displayManager.displayError(error, sessionStats.sessionDuration);
    } finally {
      this.inputManager.close();
    }
  }

  /**
   * Get conversation history
   */
  getConversationHistory(): ConversationTurn[] {
    return this.memoryManager.getConversationHistory();
  }

  /**
   * Get council members
   */
  getCouncilMembers(): string[] {
    return this.sessionManager.getCouncilMembers();
  }

  /**
   * Clear all memories
   */
  async clearAllMemories(): Promise<void> {
    await this.conversationFlowManager.clearMemory();
  }

  /**
   * Get session statistics
   */
  getSessionStats(): SessionStats {
    const baseStats = this.sessionManager.endSession();
    baseStats.conversationTurns = this.memoryManager.getConversationHistory().length;
    baseStats.memoryStats = this.memoryManager.getMemoryStats();
    
    // Restart session if it was active
    if (this.sessionManager.getCouncilMembers().length > 0) {
      this.sessionManager.startSession(this.sessionManager.getCouncilMembers());
    }
    
    return baseStats;
  }

  /**
   * Get conversation flow statistics
   */
  getConversationStats(): any {
    return this.conversationFlowManager.getConversationStats();
  }

  /**
   * Update session configuration
   */
  updateSessionConfig(updates: Partial<SessionConfig>): void {
    this.sessionManager.updateConfig(updates);
  }
}
