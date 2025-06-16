import { FiendsDBManager } from '../managers/fiends-db-manager';

/**
 * Character Data Service
 * 
 * Single responsibility: Provide access to character and sage data.
 * Extracted from MemoryManager to separate data access from memory management.
 */

export interface Character {
  name: string;
  systemPrompt: string;
  description: string;
  traits: string[];
}

export interface Sage {
  systemPrompt: string;
  description: string;
}

export class CharacterDataService {
  private dbManager: FiendsDBManager;

  constructor(dbManager: FiendsDBManager) {
    this.dbManager = dbManager;
  }

  /**
   * Get character data by name
   */
  getCharacter(name: string): Character | null {
    return this.dbManager.getCharacter(name) || null;
  }

  /**
   * Get sage data
   */
  getSage(): Sage {
    return this.dbManager.getSage();
  }

  /**
   * Get all available character names
   */
  getAllCharacterNames(): string[] {
    return this.dbManager.getCharacterNames();
  }

  /**
   * Check if character exists
   */
  hasCharacter(name: string): boolean {
    return this.dbManager.getCharacter(name) !== undefined;
  }

  /**
   * Get character system prompt
   */
  getCharacterSystemPrompt(name: string): string | null {
    const character = this.getCharacter(name);
    return character?.systemPrompt || null;
  }

  /**
   * Get sage system prompt
   */
  getSageSystemPrompt(): string {
    return this.getSage().systemPrompt;
  }
}
