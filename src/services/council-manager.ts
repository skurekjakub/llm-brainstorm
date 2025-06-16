import { FiendsDBManager } from '../managers/fiends-db-manager';

/**
 * Council Manager
 * 
 * Responsible for managing the selection and composition of fiend councils.
 * Handles council member selection algorithms and council state management.
 */

export interface Council {
  fiends: string[];
  sage: string;
}

export class CouncilManager {
  private dbManager: FiendsDBManager;

  constructor() {
    this.dbManager = FiendsDBManager.getInstance();
  }

  /**
   * Select a random set of fiends for the council
   */
  selectFiends(count: number = 5): string[] {
    const randomCharacters = this.dbManager.getRandomCharacters(count);
    return randomCharacters.map(char => char.name);
  }

  /**
   * Get the sage character
   */
  getSage(): string {
    return this.dbManager.getSage().name;
  }

  /**
   * Create a complete council with fiends and sage
   */
  createCouncil(fiendCount: number = 5): Council {
    return {
      fiends: this.selectFiends(fiendCount),
      sage: this.getSage()
    };
  }

  /**
   * Validate that all council members exist in the database
   */
  validateCouncil(council: Council): boolean {
    // Check all fiends exist
    for (const fiendName of council.fiends) {
      if (!this.dbManager.getCharacter(fiendName)) {
        console.warn(`⚠️  Warning: Fiend '${fiendName}' not found in database`);
        return false;
      }
    }

    // Check sage exists
    if (!this.dbManager.getSage()) {
      console.warn(`⚠️  Warning: Sage not found in database`);
      return false;
    }

    return true;
  }

  /**
   * Get council statistics
   */
  getCouncilStats(council: Council): {
    fiendCount: number;
    totalCharacters: number;
    councilNames: string[];
  } {
    return {
      fiendCount: council.fiends.length,
      totalCharacters: council.fiends.length + 1, // +1 for sage
      councilNames: [...council.fiends, council.sage]
    };
  }
}
