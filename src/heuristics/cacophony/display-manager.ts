import { ConversationTurn } from '../../services/memory/memory-manager';
import { SessionStats } from './session-manager';
import { CommandResult } from './command-processor';

/**
 * Display Manager
 * 
 * Handles all console output and formatting for the cacophony session.
 */

export class DisplayManager {
  private readonly DIVIDER = "=".repeat(80);
  private readonly SUB_DIVIDER = "-".repeat(40);

  /**
   * Display session header
   */
  displaySessionHeader(): void {
    console.log("\n" + this.DIVIDER);
    console.log("🎭 CACOPHONY OF FIENDS - CONVERSATIONAL COUNCIL 🎭");
    console.log(this.DIVIDER);
    console.log("Welcome to an interactive dialogue with a council of diverse entities.");
    console.log("Each member brings their unique perspective to your queries.\n");
  }

  /**
   * Display council information
   */
  displayCouncilInfo(councilMembers: string[]): void {
    console.log("👥 Council Members:");
    councilMembers.forEach((member, index) => {
      console.log(`   ${index + 1}. ${member}`);
    });
    console.log();
  }

  /**
   * Display conversation instructions
   */
  displayConversationInstructions(): void {
    console.log("💬 Conversation Instructions:");
    console.log("   • Type your message to get diverse perspectives");
    console.log("   • Use /help to see available commands");
    console.log("   • Use /quit to end the session");
    console.log("   • Use /clear to reset memory");
    console.log("   • Use /members to see council members\n");
  }

  /**
   * Display a conversation turn
   */
  displayConversationTurn(turn: ConversationTurn, turnNumber: number): void {
    console.log(`\n📝 Turn ${turnNumber} Results:`);
    console.log(this.SUB_DIVIDER);
    
    // Display fiend responses
    console.log("🎭 Council Perspectives:");
    turn.fiendResponses.forEach((response, index) => {
      const searchIndicator = response.searchUsed ? " 🔍" : "";
      console.log(`\n${index + 1}. **${response.name}**${searchIndicator}:`);
      console.log(`   ${response.perspective}`);
      
      if (response.searchQueries && response.searchQueries.length > 0) {
        console.log(`   📎 Searched: ${response.searchQueries.join(', ')}`);
      }
    });
    
    // Display sage analysis
    console.log(`\n🧙‍♂️ **Sage Analysis**:`);
    console.log(`${turn.sageAnalysis}\n`);
    
    console.log(this.DIVIDER);
  }

  /**
   * Display command result
   */
  displayCommandResult(result: CommandResult, context?: any): void {
    if (result.message) {
      console.log(`\n${result.message}`);
    }

    if (result.data) {
      switch (result.type) {
        case 'members':
          if (Array.isArray(result.data)) {
            result.data.forEach((member: string, index: number) => {
              console.log(`   ${index + 1}. ${member}`);
            });
          }
          break;

        case 'stats':
          this.displayStats(result.data);
          break;
      }
    }
    console.log();
  }

  /**
   * Display session statistics
   */
  private displayStats(stats: any): void {
    console.log(`   Council Size: ${stats.councilSize || 0}`);
    console.log(`   Conversation Turns: ${stats.conversationTurns || 0}`);
    console.log(`   Session Duration: ${this.formatDuration(stats.sessionDuration || 0)}`);
    
    if (stats.memoryStats) {
      console.log(`   Active Fiends: ${stats.memoryStats.activeFiends || 0}`);
      console.log(`   Memory Token Limit: ${stats.memoryStats.memoryTokenLimit || 0}`);
    }
  }

  /**
   * Display session summary
   */
  displaySessionSummary(stats: SessionStats): void {
    console.log("\n" + this.DIVIDER);
    console.log("📊 SESSION SUMMARY");
    console.log(this.DIVIDER);
    console.log(`Duration: ${this.formatDuration(stats.sessionDuration)}`);
    console.log(`Council Size: ${stats.councilSize}`);
    console.log(`Conversation Turns: ${stats.conversationTurns}`);
    console.log("Thank you for using Cacophony of Fiends! 👋\n");
  }

  /**
   * Display error
   */
  displayError(error: any, sessionDuration?: number): void {
    console.log("\n" + this.DIVIDER);
    console.log("❌ ERROR OCCURRED");
    console.log(this.DIVIDER);
    console.log(`Error: ${error.message || error}`);
    
    if (sessionDuration) {
      console.log(`Session Duration: ${this.formatDuration(sessionDuration)}`);
    }
    
    console.log("Session ended due to error.\n");
  }

  /**
   * Display memory cleared message
   */
  displayMemoryCleared(): void {
    console.log("\n🧹 All memories have been cleared. Starting fresh!\n");
  }

  /**
   * Display council members
   */
  displayCouncilMembers(members: string[]): void {
    console.log("\n👥 Current Council Members:");
    members.forEach((member, index) => {
      console.log(`   ${index + 1}. ${member}`);
    });
    console.log();
  }

  /**
   * Display empty input warning
   */
  displayEmptyInputWarning(): void {
    console.log("\n⚠️ Please enter a message or command. Use /help for available commands.\n");
  }

  /**
   * Display processing indicator
   */
  displayProcessing(message: string = "Processing..."): void {
    console.log(`\n⏳ ${message}`);
  }

  /**
   * Display turn header
   */
  displayTurnHeader(turnNumber: number): void {
    console.log(`\n${this.DIVIDER}`);
    console.log(`🎯 TURN ${turnNumber}`);
    console.log(this.DIVIDER);
  }

  /**
   * Format duration in milliseconds to readable string
   */
  private formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}
