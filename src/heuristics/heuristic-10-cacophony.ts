import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ConfigManager } from '../managers/config-manager';
import { CouncilManager } from './council-manager';
import { MemoryManager, ConversationTurn } from '../services/memory-manager';
import { ConversationEngine } from './conversation-engine';
import { UIManager } from './ui-manager';
import 'dotenv/config';

/**
 * Heuristic 10: Cacophony of Fiends - Conversational Orchestrator
 * 
 * This orchestrator coordinates all components to create a persistent council
 * of entities that maintain memory across conversation turns, providing diverse
 * perspectives in real-time dialogue.
 */

export class CacophonyOrchestrator {
  private llm: ChatGoogleGenerativeAI;
  private configManager: ConfigManager;
  private councilManager: CouncilManager;
  private memoryManager: MemoryManager;
  private conversationEngine: ConversationEngine;
  private uiManager: UIManager;
  private councilMembers: string[];

  constructor() {
    // Initialize configuration
    this.configManager = ConfigManager.getInstance();
    const modelConfig = this.configManager.getModelConfig('cacophony');
    
    // Initialize LLM
    this.llm = new ChatGoogleGenerativeAI({ 
      model: modelConfig.model,
      temperature: modelConfig.temperature
    });
    
    // Initialize component managers
    this.councilManager = new CouncilManager();
    this.memoryManager = new MemoryManager(this.llm);
    this.conversationEngine = new ConversationEngine(this.llm, this.memoryManager);
    this.uiManager = new UIManager();
    this.councilMembers = [];
  }

  /**
   * Initialize the cacophony session
   */
  async initializeSession(fiendCount: number = 5): Promise<void> {
    // Create council
    const council = this.councilManager.createCouncil(fiendCount);
    this.councilMembers = council.fiends;
    
    // Display council information
    this.uiManager.displayCouncilInfo(this.councilMembers);
    
    // Initialize memory systems
    await this.memoryManager.initializeFiendMemories(this.councilMembers);
    
    console.log(`✅ Cacophony session initialized successfully\n`);
  }

  /**
   * Process a single conversation turn
   */
  async processConversationTurn(userQuery: string): Promise<ConversationTurn> {
    // Consult all fiends
    const fiendResponses = await this.conversationEngine.consultAllFiends(this.councilMembers, userQuery);
    
    console.log("🧙‍♂️ Sage synthesizing wisdom with memory...\n");
    
    // Get sage analysis
    const sageAnalysis = await this.conversationEngine.consultSage(userQuery, fiendResponses);
    
    // Create conversation turn
    const conversationTurn: ConversationTurn = {
      userMessage: userQuery,
      fiendResponses,
      sageAnalysis,
      timestamp: new Date()
    };
    
    // Save to memory
    this.memoryManager.addConversationTurn(conversationTurn);
    
    return conversationTurn;
  }

  /**
   * Run interactive conversation session
   */
  async runConversationalSession(): Promise<void> {
    const totalStartTime = Date.now();
    
    try {
      // Display session header
      this.uiManager.displaySessionHeader();
      
      // Get initial prompt
      const initialPrompt = await this.uiManager.getInitialPrompt();
      console.log(`� Initial prompt length: ${initialPrompt.length} characters\n`);
      
      // Initialize session
      await this.initializeSession(5); // Default to 5 fiends
      
      // Display conversation instructions
      this.uiManager.displayConversationInstructions();
      
      // Process initial prompt
      let conversationTurn = await this.processConversationTurn(initialPrompt);
      this.uiManager.displayConversationTurn(conversationTurn, 1);
      
      // Start conversation loop
      let turnNumber = 2;
      
      while (true) {
        const userInput = await this.uiManager.getUserInput(turnNumber);
        const command = this.uiManager.processCommand(userInput);
        
        if (command === 'quit') {
          break;
        }
        
        if (command === 'clear') {
          await this.memoryManager.clearAllMemories();
          this.uiManager.displayMemoryCleared();
          continue;
        }
        
        if (command === 'members') {
          this.uiManager.displayCouncilMembers(this.councilMembers);
          continue;
        }
        
        if (command === 'empty') {
          this.uiManager.displayEmptyInputWarning();
          continue;
        }
        
        // Process conversation turn
        console.log("\n" + "=".repeat(80));
        conversationTurn = await this.processConversationTurn(userInput);
        this.uiManager.displayConversationTurn(conversationTurn, turnNumber);
        turnNumber++;
      }
      
      // Display session summary
      const totalEndTime = Date.now();
      const totalTime = totalEndTime - totalStartTime;
      const conversationHistory = this.memoryManager.getConversationHistory();
      
      this.uiManager.displaySessionSummary(totalTime, conversationHistory.length, this.councilMembers);
      
    } catch (error) {
      const totalEndTime = Date.now();
      const totalTime = totalEndTime - totalStartTime;
      this.uiManager.displayError(error, totalTime);
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
    return [...this.councilMembers];
  }

  /**
   * Clear all memories
   */
  async clearAllMemories(): Promise<void> {
    await this.memoryManager.clearAllMemories();
  }

  /**
   * Get session statistics
   */
  getSessionStats(): {
    councilSize: number;
    conversationTurns: number;
    memoryStats: any;
  } {
    return {
      councilSize: this.councilMembers.length,
      conversationTurns: this.memoryManager.getConversationHistory().length,
      memoryStats: this.memoryManager.getMemoryStats()
    };
  }
};
