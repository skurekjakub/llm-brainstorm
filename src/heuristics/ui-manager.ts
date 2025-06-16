import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { FiendsDBManager } from '../managers/fiends-db-manager';
import { ConversationTurn } from './memory-manager';

/**
 * UI Manager
 * 
 * Responsible for all user interface interactions and input/output formatting.
 * Handles prompts, commands, and display of conversation results.
 */

export class UIManager {
  private dbManager: FiendsDBManager;

  constructor() {
    this.dbManager = FiendsDBManager.getInstance();
  }

  /**
   * Get initial prompt from user choice (file or console)
   */
  async getInitialPrompt(): Promise<string> {
    const rl = readline.createInterface({ input, output });
    
    console.log("🎯 How would you like to provide the initial prompt?");
    console.log("1. Load from prompt.txt file");
    console.log("2. Enter manually in console");
    
    const choice = await rl.question("Choose option (1 or 2): ");
    
    if (choice === "1") {
      try {
        const prompt = this.dbManager.loadPromptFromFile();
        console.log(`📄 Loaded prompt from file: "${prompt}"`);
        rl.close();
        return prompt;
      } catch (error) {
        console.log("❌ Could not load prompt.txt file. Falling back to manual entry.");
      }
    }
    
    const prompt = await rl.question("Enter your initial prompt: ");
    rl.close();
    return prompt;
  }

  /**
   * Get user input during conversation
   */
  async getUserInput(turnNumber: number): Promise<string> {
    const rl = readline.createInterface({ input, output });
    
    console.log("\n" + "─".repeat(80));
    const userInput = await rl.question("💭 Your next message (or 'quit' to exit): ");
    
    rl.close();
    return userInput;
  }

  /**
   * Display conversation turn results
   */
  displayConversationTurn(turn: ConversationTurn, turnNumber: number): void {
    console.log(`\n📋 TURN ${turnNumber} - COUNCIL PERSPECTIVES:`);
    console.log(`🕐 ${turn.timestamp.toLocaleTimeString()}`);
    console.log("─".repeat(60));
    console.log(`🗣️  User: ${turn.userMessage}\n`);
    
    // Track search usage
    const searchUsedCount = turn.fiendResponses.filter(r => r.searchUsed).length;
    if (searchUsedCount > 0) {
      console.log(`🤖 ${searchUsedCount} fiend(s) used ReAct tools this turn\n`);
    }
    
    turn.fiendResponses.forEach((response, index) => {
      console.log(`**${index + 1}. ${response.name}**:`);
      
      // Display tool usage information if used
      if (response.searchUsed && response.searchQueries && response.searchQueries.length > 0) {
        console.log(`   � Used tools: ${response.searchQueries.map((q: string) => `search("${q}")`).join(', ')}`);
      }
      
      console.log(response.perspective);
      console.log("");
    });
    
    console.log("─".repeat(60));
    console.log("🧙‍♂️ SAGE'S SYNTHESIS:");
    console.log("─".repeat(60));
    console.log(turn.sageAnalysis);
    console.log("─".repeat(60));
  }

  /**
   * Display session header
   */
  displaySessionHeader(): void {
    console.log("👹 Heuristic 10: Cacophony of Fiends - ReAct Edition");
    console.log("=================================================");
    console.log(`🕐 Started at: ${new Date().toLocaleTimeString()}`);
    console.log("🤖 ReAct agents with tool capabilities enabled");
    console.log("💬 Real-time conversation mode with persistent memory\n");
  }

  /**
   * Display council initialization
   */
  displayCouncilInfo(councilMembers: string[]): void {
    console.log(`🔮 Assembling council of ${councilMembers.length} entities...`);
    console.log(`👹 Council members: ${councilMembers.join(', ')}\n`);
  }

  /**
   * Display conversation instructions
   */
  displayConversationInstructions(): void {
    console.log("=".repeat(80));
    console.log(`🚀 Beginning conversational cacophony session...`);
    console.log("💡 Commands: 'quit' to exit, 'clear' to reset memories, 'members' to see council\n");
  }

  /**
   * Display session summary
   */
  displaySessionSummary(totalTime: number, turnCount: number, councilMembers: string[]): void {
    console.log("\n" + "=".repeat(80));
    console.log(`🏁 Conversation session complete!`);
    console.log(`   ⏱️  Total session time: ${totalTime}ms`);
    console.log(`   💬 Conversation turns: ${turnCount}`);
    console.log(`   👹 Council members: ${councilMembers.join(', ')}`);
    console.log(`   🕐 Finished at: ${new Date().toLocaleTimeString()}`);
    console.log("=".repeat(80));
  }

  /**
   * Display error information
   */
  displayError(error: unknown, totalTime: number): void {
    console.error("\n❌ Error occurred:");
    console.error(`   🚨 Message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error(`   ⏱️  Time before error: ${totalTime}ms`);
    console.log("\nPlease ensure:");
    console.log("   📄 prompt.txt file exists in the data/ folder (if using file option)");
    console.log("   🔑 API keys are set in .env file");
    console.log("   🌐 Internet connection is available");
  }

  /**
   * Display council members
   */
  displayCouncilMembers(members: string[]): void {
    console.log(`👹 Council members: ${members.join(', ')}\n`);
  }

  /**
   * Display memory cleared message
   */
  displayMemoryCleared(): void {
    console.log("🧹 All memories cleared. Starting fresh conversation.\n");
  }

  /**
   * Display empty input warning
   */
  displayEmptyInputWarning(): void {
    console.log("⚠️  Please enter a message or command.\n");
  }

  /**
   * Process user command and return action
   */
  processCommand(input: string): 'quit' | 'clear' | 'members' | 'empty' | 'continue' {
    const command = input.toLowerCase().trim();
    
    if (command === 'quit') return 'quit';
    if (command === 'clear') return 'clear';
    if (command === 'members') return 'members';
    if (command === '') return 'empty';
    
    return 'continue';
  }
}
