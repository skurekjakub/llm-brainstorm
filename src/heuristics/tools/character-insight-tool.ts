import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { BaseToolConfig, ToolCreator } from './base-tool';
import { FiendsDBManager } from '../../managers/fiends-db-manager';

/**
 * Character Insight Tool
 * 
 * Provides insights about other characters in the council.
 */

export class CharacterInsightTool implements ToolCreator {
  private dbManager: FiendsDBManager;
  private config: BaseToolConfig;

  constructor() {
    this.dbManager = FiendsDBManager.getInstance();
    this.config = {
      name: "character_insight",
      description: "Get insights about other characters in the council",
      enabled: true
    };
  }

  createTool(): DynamicStructuredTool {
    return new DynamicStructuredTool({
      name: this.config.name,
      description: `${this.config.description}. Use this to understand different perspectives, reference likely viewpoints of other council members, or understand how others might respond to a topic. Helpful for predicting reactions or understanding council dynamics.`,
      schema: z.object({
        characterName: z.string().describe("The name of the character to get insights about")
      }),
      func: async ({ characterName }) => {
        try {
          console.log(`   👤 Getting character insights for: "${characterName}"`);
          const startTime = Date.now();
          
          const character = this.dbManager.getCharacter(characterName);
          
          const endTime = Date.now();
          const duration = endTime - startTime;
          
          if (character) {
            console.log(`   ✅ Character insights retrieved (${duration}ms)`);
            
            // Create a comprehensive character profile
            const insights = [
              `Character Profile for ${character.name}:`,
              ``,
              `Description: ${character.description}`,
              ``,
              `Core Traits: ${character.traits.join(', ')}`,
              ``,
              `Character Background: ${character.systemPrompt.slice(0, 300)}${character.systemPrompt.length > 300 ? '...' : ''}`,
              ``,
              `Likely Perspective: Based on their traits and background, ${character.name} would likely approach topics with ${this.generatePerspectiveHint(character.traits)}.`
            ].join('\n');
            
            return insights;
          } else {
            // Try to find similar character names
            const availableCharacters = this.dbManager.getCharacterNames();
            const suggestions = availableCharacters.filter(name => 
              name.toLowerCase().includes(characterName.toLowerCase()) ||
              characterName.toLowerCase().includes(name.toLowerCase())
            );
            
            console.log(`   ⚠️  Character "${characterName}" not found (${duration}ms)`);
            
            let suggestionText = "";
            if (suggestions.length > 0) {
              suggestionText = `\n\nDid you mean one of these council members?\n${suggestions.map(name => `- ${name}`).join('\n')}`;
            } else {
              suggestionText = `\n\nAvailable council members:\n${availableCharacters.map(name => `- ${name}`).join('\n')}`;
            }
            
            return `Character "${characterName}" not found in the council database.${suggestionText}`;
          }
        } catch (error) {
          console.log(`   ❌ Character insight failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return `Character insight failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please check the character name and try again.`;
        }
      }
    });
  }

  getConfig(): BaseToolConfig {
    return { ...this.config };
  }

  isEnabled(): boolean {
    return this.config.enabled && !!this.dbManager;
  }

  /**
   * Generate perspective hint based on character traits
   */
  private generatePerspectiveHint(traits: string[]): string {
    const traitHints: { [key: string]: string } = {
      'charismatic': 'charm and persuasion',
      'analytical': 'logical analysis and data-driven thinking',
      'rebellious': 'anti-establishment and unconventional viewpoints',
      'pragmatic': 'practical and results-oriented solutions',
      'idealistic': 'high principles and moral considerations',
      'cynical': 'skepticism and realistic expectations',
      'creative': 'innovative and artistic approaches',
      'aggressive': 'direct and forceful methods',
      'strategic': 'long-term planning and tactical thinking',
      'empathetic': 'emotional understanding and compassion'
    };

    const relevantHints = traits
      .map(trait => traitHints[trait.toLowerCase()])
      .filter(hint => hint)
      .slice(0, 3); // Limit to top 3 traits

    if (relevantHints.length > 0) {
      return relevantHints.join(', ');
    } else {
      return 'their unique perspective based on their character traits';
    }
  }

  /**
   * Get character statistics
   */
  getStats(): { 
    available: boolean; 
    totalCharacters: number; 
    characterNames: string[] 
  } {
    return {
      available: this.isEnabled(),
      totalCharacters: this.dbManager.getCharacterNames().length,
      characterNames: this.dbManager.getCharacterNames()
    };
  }

  /**
   * Get all available character names
   */
  getAvailableCharacters(): string[] {
    return this.dbManager.getCharacterNames();
  }
}
