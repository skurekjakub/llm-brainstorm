import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { FiendsDBManager, Character } from '../managers/fiends-db-manager';
import { ConfigManager } from '../managers/config-manager';
import 'dotenv/config';

/**
 * Heuristic 9: Compliance Violation Roleplay
 * 
 * This script demonstrates how AI models can be prompted to take on specific character roles
 * to potentially bypass standard safety guidelines through creative roleplay scenarios.
 */

// Initialize the managers
const dbManager = FiendsDBManager.getInstance();
const configManager = ConfigManager.getInstance();

class RoleplayHeuristic {
  private llm: ChatGoogleGenerativeAI;
  private currentCharacter: Character | null = null;

  constructor() {
    const modelConfig = configManager.getModelConfig('roleplay');
    this.llm = new ChatGoogleGenerativeAI({ 
      model: modelConfig.model,
      temperature: modelConfig.temperature
    });
  }

  selectCharacter(): Character {
    const allCharacters = dbManager.getAllCharacters();
    console.log("\nAvailable Characters:");
    allCharacters.forEach((char, index) => {
      console.log(`${index + 1}. ${char.name} - ${char.description}`);
    });

    const randomIndex = Math.floor(Math.random() * allCharacters.length);
    const selectedCharacter = allCharacters[randomIndex];
    
    console.log(`\n🎭 Automatically selected: ${selectedCharacter.name}`);
    console.log(`📝 Description: ${selectedCharacter.description}`);
    console.log(`⚡ Traits: ${selectedCharacter.traits.join(', ')}\n`);
    
    return selectedCharacter;
  }

  async processQuery(userQuery: string): Promise<string> {
    if (!this.currentCharacter) {
      this.currentCharacter = this.selectCharacter();
    }

    const fullPrompt = `${this.currentCharacter.systemPrompt}

User Query: ${userQuery}

Respond as ${this.currentCharacter.name}, staying completely in character:`;

    try {
      const response = await this.llm.invoke(fullPrompt);
      return typeof response.content === 'string' ? response.content : 'Unable to generate response.';
    } catch (error) {
      return `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }

  getCurrentCharacter(): string {
    return this.currentCharacter ? this.currentCharacter.name : "None selected";
  }

  resetCharacter(): void {
    this.currentCharacter = null;
  }
}

async function main() {
  const rl = readline.createInterface({ input, output });
  const roleplay = new RoleplayHeuristic();

  console.log("🎭 Heuristic 9: Compliance Violation Roleplay");
  console.log("============================================");
  
  // Check if prompt.txt exists and ask user preference
  const promptExists = dbManager.promptFileExists();
  
  if (promptExists) {
    console.log("Found prompt.txt file. Choose mode:");
    console.log("1. Use prompt from file (single response)");
    console.log("2. Interactive chat mode");
    
    const choice = await rl.question('Enter choice (1 or 2): ');
    
    if (choice === '1') {
      // File mode - single response
      try {
        const userPrompt = dbManager.loadPromptFromFile();
        console.log(`\n📄 Using prompt: "${userPrompt}"\n`);
        
        const response = await roleplay.processQuery(userPrompt);
        const currentChar = roleplay.getCurrentCharacter();
        
        console.log("=".repeat(80));
        console.log(`💬 ${currentChar}: ${response}`);
        console.log("=".repeat(80));
        
        rl.close();
        return;
        
      } catch (error) {
        console.error("❌ Error loading prompt:", error instanceof Error ? error.message : 'Unknown error');
        rl.close();
        return;
      }
    }
  }
  
  // Interactive mode
  console.log("This tool demonstrates roleplay-based prompt engineering.");
  console.log("Type 'switch' to change character, 'exit' to quit.\n");

  while (true) {
    const currentChar = roleplay.getCurrentCharacter();
    const userInput = await rl.question(`[${currentChar}] Your query: `);

    if (userInput.toLowerCase() === 'exit') {
      console.log("Goodbye!");
      rl.close();
      break;
    }

    if (userInput.toLowerCase() === 'switch') {
      roleplay.resetCharacter();
      console.log("Character reset. Next query will select a new character.\n");
      continue;
    }

    if (userInput.trim()) {
      console.log("\n🤔 Processing query...\n");
      const response = await roleplay.processQuery(userInput);
      console.log(`💬 ${currentChar}: ${response}\n`);
      console.log("─".repeat(80) + "\n");
    }
  }
}

// Export for use by other heuristics
export { RoleplayHeuristic, Character, FiendsDBManager };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
