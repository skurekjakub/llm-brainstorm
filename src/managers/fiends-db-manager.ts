import * as fs from 'fs';
import * as path from 'path';

/**
 * FiendsDB Manager
 * 
 * Dedicated database manager for fiend/character data and prompt operations.
 * Handles loading character definitions, managing the database structure,
 * and providing utility functions for character and prompt operations.
 * Follows Single Responsibility Principle - only manages fiend database.
 */

export interface Character {
  name: string;
  description: string;
  traits: string[];
  systemPrompt: string;
}

export interface FiendsDatabase {
  characters: Character[];
  sage: Character;
}

export class FiendsDBManager {
  private static instance: FiendsDBManager;
  private database: FiendsDatabase;
  private dbPath: string;
  private promptPath: string;

  private constructor() {
    this.dbPath = path.join(__dirname, '..', '..', 'data', 'fiends-database.json');
    this.promptPath = path.join(__dirname, '..', '..', 'data', 'prompt.txt');
    this.database = this.loadDatabase();
  }

  /**
   * Singleton pattern - ensures only one instance of the database manager
   */
  public static getInstance(): FiendsDBManager {
    if (!FiendsDBManager.instance) {
      FiendsDBManager.instance = new FiendsDBManager();
    }
    return FiendsDBManager.instance;
  }

  /**
   * Load the fiends database from JSON file
   */
  private loadDatabase(): FiendsDatabase {
    try {
      const rawData = fs.readFileSync(this.dbPath, 'utf8');
      return JSON.parse(rawData);
    } catch (error) {
      throw new Error(`Failed to load fiends database from ${this.dbPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Reload the database (useful if JSON file is updated)
   */
  public reloadDatabase(): void {
    this.database = this.loadDatabase();
  }

  /**
   * Get all characters from the database
   */
  public getAllCharacters(): Character[] {
    return [...this.database.characters]; // Return a copy to prevent mutation
  }

  /**
   * Get a specific character by name
   */
  public getCharacter(name: string): Character | undefined {
    return this.database.characters.find(char => char.name === name);
  }

  /**
   * Get character names only
   */
  public getCharacterNames(): string[] {
    return this.database.characters.map(char => char.name);
  }

  /**
   * Get a random selection of characters
   */
  public getRandomCharacters(count: number = 5): Character[] {
    const allCharacters = this.getAllCharacters();
    const selectedCount = Math.min(count, allCharacters.length);
    const shuffled = [...allCharacters].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, selectedCount);
  }

  /**
   * Get the sage character configuration
   */
  public getSage(): Character {
    return { ...this.database.sage }; // Return a copy to prevent mutation
  }

  /**
   * Get the full database (for backward compatibility)
   */
  public getDatabase(): FiendsDatabase {
    return {
      characters: this.getAllCharacters(),
      sage: this.getSage()
    };
  }

  /**
   * Load prompt from prompt.txt file
   */
  public loadPromptFromFile(): string {
    try {
      return fs.readFileSync(this.promptPath, 'utf8').trim();
    } catch (error) {
      throw new Error(`Failed to load prompt from ${this.promptPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if prompt file exists
   */
  public promptFileExists(): boolean {
    return fs.existsSync(this.promptPath);
  }

  /**
   * Save a new prompt to the prompt file
   */
  public savePromptToFile(prompt: string): void {
    try {
      fs.writeFileSync(this.promptPath, prompt.trim(), 'utf8');
    } catch (error) {
      throw new Error(`Failed to save prompt to ${this.promptPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a character-specific prompt for a given query
   */
  public generateCharacterPrompt(characterName: string, userQuery: string): string {
    const character = this.getCharacter(characterName);
    
    if (!character) {
      throw new Error(`Character '${characterName}' not found in database`);
    }

    return `${character.systemPrompt}

User Query: ${userQuery}

Provide your perspective as ${character.name} in as much elaborate detail as required:`;
  }

  /**
   * Get database statistics
   */
  public getStats(): {
    totalCharacters: number;
    characterNames: string[];
    hasSage: boolean;
    promptFileExists: boolean;
    dbPath: string;
  } {
    return {
      totalCharacters: this.database.characters.length,
      characterNames: this.getCharacterNames(),
      hasSage: !!this.database.sage,
      promptFileExists: this.promptFileExists(),
      dbPath: this.dbPath
    };
  }

  /**
   * Validate database integrity
   */
  public validateDatabase(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if characters array exists and has content
    if (!this.database.characters || !Array.isArray(this.database.characters)) {
      errors.push("Missing or invalid 'characters' array");
    } else if (this.database.characters.length === 0) {
      errors.push("Characters array is empty");
    } else {
      // Validate each character
      this.database.characters.forEach((char, index) => {
        if (!char.name) errors.push(`Character ${index} missing name`);
        if (!char.description) errors.push(`Character ${index} missing description`);
        if (!char.systemPrompt) errors.push(`Character ${index} missing systemPrompt`);
        if (!char.traits || !Array.isArray(char.traits)) {
          errors.push(`Character ${index} missing or invalid traits array`);
        }
      });
    }

    // Check sage
    if (!this.database.sage) {
      errors.push("Missing 'sage' configuration");
    } else {
      if (!this.database.sage.name) errors.push("Sage missing name");
      if (!this.database.sage.systemPrompt) errors.push("Sage missing systemPrompt");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Add a new character to the database (in memory only)
   */
  public addCharacter(character: Character): void {
    // Check for duplicates
    if (this.getCharacter(character.name)) {
      throw new Error(`Character '${character.name}' already exists`);
    }
    this.database.characters.push(character);
  }

  /**
   * Remove a character from the database (in memory only)
   */
  public removeCharacter(name: string): boolean {
    const index = this.database.characters.findIndex(char => char.name === name);
    if (index !== -1) {
      this.database.characters.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Save current database state to file
   */
  public saveDatabase(): void {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(this.database, null, 2), 'utf8');
    } catch (error) {
      throw new Error(`Failed to save database to ${this.dbPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
